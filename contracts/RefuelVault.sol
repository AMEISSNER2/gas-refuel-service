// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Interface extension supporting native token permits if chosen on the frontend
interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWETH {
    function withdraw(uint256 wad) external;
}

contract RefuelVault {
    address public owner;
    
    address public uniswapRouter;
    address public wethAddress;

    // --- EIP-712 / Gasless Architecture State Properties ---
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // keccak256("GaslessRefuel(address user,address token,uint256 tokenAmount,uint256 ethToUser,uint256 nonce,uint256 deadline)")
    bytes32 public constant REFUEL_TYPEHASH = 0x2287c8d9ba8bfd60cf47348982a559d2ec9b09a4734ea0b0e50f38bdfdc17676;

    // Track nonces on-chain to protect against signature replay attacks
    mapping(address => uint256) public nonces;

    event Refueled(address indexed user, uint256 ethSent, uint256 tokensCharged);
    event Rebalanced(address indexed tokenIn, uint256 tokensSwapped, uint256 ethReceived);

    constructor() {
        owner = msg.sender; 
        
        bytes memory rawRouterBytes = hex"E592427A0AEce92De3Edee1F18E0157C05861564";
        bytes memory rawWethBytes = hex"82aF49447D8a07e3bd95BD0d56f352415231911d";
        
        assembly {
            sstore(uniswapRouter.slot, mload(add(rawRouterBytes, 20)))
            sstore(wethAddress.slot, mload(add(rawWethBytes, 20)))
        }

        // Initialize Domain Separator tracking block metrics natively
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("PennyGas Refuel")),
                keccak256(bytes("1")),
                block.chainid, // Automatically captures 11155111 on Sepolia
                address(this)
            )
        );
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the PennyGas relayer can trigger this");
        _;
    }

    receive() external payable {}

    /**
     * @notice Natively executes a gasless refuel by validating a user's typed signature on-chain.
     */
    function executeGaslessRefuel(
        address user,
        address token,
        uint256 tokenAmount,
        uint256 ethToUser,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyOwner {
        require(block.timestamp <= deadline, "Signature has expired");
        require(address(this).balance >= ethToUser, "Insufficient ETH gas tank liquidity");

        // Compute EIP-712 structured hash locally
        bytes32 structHash = keccak256(
            abi.encode(
                REFUEL_TYPEHASH,
                user,
                token,
                tokenAmount,
                ethToUser,
                nonces[user],
                deadline
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = ecrecover(digest, v, r, s);
        
        require(signer != address(0) && signer == user, "Invalid gasless signature signature");
        
        // Increment user nonce to invalidate signature reuse
        nonces[user]++;

        // Pull payment tokens into contract vault storage
        bool successPayment = IERC20(token).transferFrom(user, address(this), tokenAmount);
        require(successPayment, "Token collection failed");

        // Forward gas natively to the destination user wallet
        (bool successGas, ) = payable(user).call{value: ethToUser}("");
        require(successGas, "ETH gas delivery failed");

        emit Refueled(user, ethToUser, tokenAmount);
    }

    /**
     * @notice Optional dual-action processing function. Handles token allowance permit 
     *         and gasless delivery simultaneously if utilizing EIP-2612 compliant tokens.
     */
    function executeRefuelWithTokenPermit(
        address user,
        address token,
        uint256 tokenAmount,
        uint256 ethToUser,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external onlyOwner {
        require(address(this).balance >= ethToUser, "Insufficient ETH gas tank liquidity");

        // Apply token signature directly to target stablecoin contract mapping channel
        try IERC20Permit(token).permit(user, address(this), tokenAmount, deadline, permitV, permitR, permitS) {} catch {}

        bool successPayment = IERC20(token).transferFrom(user, address(this), tokenAmount);
        require(successPayment, "Token collection failed");

        (bool successGas, ) = payable(user).call{value: ethToUser}("");
        require(successGas, "ETH gas delivery failed");

        emit Refueled(user, ethToUser, tokenAmount);
    }

    function rebalanceStablecoins(address tokenAddress, uint256 amountToSwap) external onlyOwner {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(balance >= amountToSwap, "Insufficient stablecoin balance in vault");

        IERC20(tokenAddress).approve(uniswapRouter, amountToSwap);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenAddress,
            tokenOut: wethAddress, 
            fee: 500,       
            recipient: address(this), 
            deadline: block.timestamp + 300,
            amountIn: amountToSwap,
            amountOutMinimum: 0, 
            sqrtPriceLimitX96: 0
        });

        uint256 wethReceived = ISwapRouter(uniswapRouter).exactInputSingle(params);

        IERC20(wethAddress).approve(wethAddress, wethReceived);
        IWETH(wethAddress).withdraw(wethReceived);

        emit Rebalanced(tokenAddress, amountToSwap, wethReceived);
    }

    function withdrawEarnings(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = payable(owner).call{value: amount}("");
            require(success, "ETH withdrawal failed");
        } else {
            IERC20(token).transfer(owner, amount); 
        }
    }
}
