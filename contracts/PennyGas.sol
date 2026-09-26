// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Standard interface allowing our contract to move ERC-20 tokens like USDC
interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract PennyGas {
    address public owner;

    // Triggered every time a user successfully refuels their wallet
    event Refueled(address indexed user, uint256 ethSent, uint256 tokensCharged);

    constructor() {
        owner = msg.sender; // Sets your developer relayer wallet as the manager
    }

    // Modifier ensuring only your automated relayer backend can call execution functions
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the PennyGas relayer can trigger this");
        _;
    }

    // Allows you to pre-fund this contract with ETH so it can distribute gas instantly
    receive() external payable {}

    /**
     * @notice Executes a gasless refuel by taking the token payment and delivering the gas ETH.
     * @param user The address of the user who needs gas
     * @param token The address of the payment token (e.g., USDC Contract)
     * @param tokenAmount The total calculated amount to charge the user (Cost + Buffer + $0.06)
     * @param ethToUser The exact amount of native ETH to deliver to the user for gas
     */
    function executeRefuel(
        address user,
        address token,
        uint256 tokenAmount,
        uint256 ethToUser
    ) external onlyOwner {
        // 1. Safety Check: Verify this contract has enough ETH in its tank to fund the user
        require(address(this).balance >= ethToUser, "Insufficient ETH gas tank liquidity");

        // 2. Collect Payment: Pull the token payment from the user's wallet into this contract
        bool successPayment = IERC20(token).transferFrom(user, address(this), tokenAmount);
        require(successPayment, "Token collection failed");

        // 3. Deliver Gas: Send the native Ethereum gas straight to the user's wallet
        (bool successGas, ) = payable(user).call{value: ethToUser}("");
        require(successGas, "ETH gas delivery failed");

        emit Refueled(user, ethToUser, tokenAmount);
    }

    /**
     * @notice Allows you to withdraw your accumulated token fees ($0.06 per tx) and leftover ETH.
     */
    function withdrawEarnings(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = payable(owner).call{value: amount}("");
	    require(success, "ETH withdrawal failed");
        } else {
            IERC20(token).transfer(owner, amount); // Withdraw collected USDC/USDT profits
        }
    }
}
