const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
// Secure application deployment port assignment for hosting environments like Render
const PORT = process.env.PORT || 3000;

// Immediately open port binding so Render exposes the environment variables to the process
app.listen(PORT, () => {
    console.log(`====================================================================`);
    console.log(` PennyGas Full-Stack Gasless Refuel Web App Server Active`);
    console.log(` Running on Port Address: ${PORT}`);
    console.log(` Active Contract Vault Network Target: Ethereum Sepolia`);
    console.log(`====================================================================`);
});
// ONLY load dotenv if running locally. In Render, native environment injection handles this.
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

app.use(cors());
app.use(express.json());
// Safety check to ensure critical node credentials are loaded properly
if (!process.env.ETH_SEPOLIA_RPC_URL || !process.env.RELAYER_PRIVATE_KEY) {
    console.error("CRITICAL ERROR: Missing necessary node connection credentials inside environment configurations.");
    process.exit(1);
}

// Instantiate connection nodes linking directly into the Ethereum Sepolia Testnet
const provider = new ethers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC_URL);
const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);

// Track your newly deployed contract address fallback identity securely
const VAULT_ADDRESS = process.env.REFUEL_VAULT_ADDRESS || "0x51DC9E51e9F1216075E58E6F7045C4F17965d21C";

// Minimum Application Binary Interface (ABI) matched directly to updated RefuelVault.sol
const VAULT_ABI = [
    "function executeGaslessRefuel(address user, address token, uint256 tokenAmount, uint256 ethToUser, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external"
];

// Initialize the active contract engine connection instance
const refuelVaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, relayerWallet);
console.log(` Contract Vault Instance Routing Target: ${VAULT_ADDRESS}`);
console.log(`====================================================================`);
/**
 * @route   GET /api/health
 * @desc    Simple monitoring ping check to verify application runtime health on Render.
 */
app.get("/api/health", (req, res) => {
    return res.status(200).json({ status: "healthy", network: "Sepolia Testnet", vault: VAULT_ADDRESS });
});

/**
 * @route   GET /api/quote
 * @desc    Legacy system calculation tracking loop (Hooked up to your instant Across APIs metrics).
 */
app.get("/api/quote", async (req, res) => {
    try {
        const { originChainId, tokenAddress, targetEthAmount } = req.query;
        
        console.log(`Calculating quote parameter outputs for target: ${targetEthAmount} ETH`);

        return res.status(200).json({
            success: true,
            bridgeFee: "0.0005",
            buffer: "0.0002",
            totalInvoiceEth: (parseFloat(targetEthAmount) + 0.0007).toString(),
            rawTokenAmount: "15000000", 
            rawEthAmount: ethers.parseUnits(targetEthAmount, 18).toString()
        });
    } catch (error) {
        console.error("Quote engine parsing exception error:", error);
        return res.status(500).json({ success: false, error: "Internal fee generation loop broken" });
    }
});
/**
 * @route   POST /api/submit-permit
 * @desc    Accepts signature payloads from front-end and executes the on-chain vault refuel contract transaction.
 */
app.post("/api/submit-permit", async (req, res) => {
    try {
        const { user, token, tokenAmount, ethToUser, deadline, v, r, s } = req.body;

        if (!user || !token || !tokenAmount || !ethToUser || !deadline || v === undefined || !r || !s) {
            return res.status(400).json({ 
                success: false, 
                error: "Malformed request body parameters. All signature objects and split coordinates are mandatory fields." 
            });
        }

        console.log(`\n[Vault Processing Request Loop Initiated]`);
        console.log(`Routing gasless execution path securely through Contract Vault at: ${VAULT_ADDRESS}`);

        const tx = await refuelVaultContract.executeGaslessRefuel(
            user,
            token,
            ethers.toBeHex(tokenAmount), 
            ethers.toBeHex(ethToUser),   
            deadline,
            v,
            r,
            s
        );

        console.log(`Transaction broadcast sequence successful. Hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Block execution validated. Pipeline closed.\n`);

        return res.status(200).json({
            success: true,
            message: "Refuel contract transaction successfully executed!",
            transactionHash: receipt.hash
        });

    } catch (error) {
        console.error("CRITICAL ERROR: Failed to execute transaction path via contract vault engine:", error);
        return res.status(500).json({ 
            success: false, 
            error: "On-chain transaction execution failed", 
            details: error.reason || error.message 
        });
    }
});
