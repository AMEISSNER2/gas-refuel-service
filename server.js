require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
// Secure application deployment port assignment for hosting environments like Render
const PORT = process.env.PORT || 3000;

// =========================================================================
// MIDDLEWARE CONFIGURATIONS
// =========================================================================
app.use(cors());
app.use(express.json());

// =========================================================================
// SMART CONTRACT & ETHERS BLOCKCHAIN INTERACTION CONFIGURATIONS
// =========================================================================
// Safety check to ensure critical node credentials are loaded properly
if (!process.env.ALCHEMY_SEPOLIA_RPC_URL || !process.env.RELAYER_PRIVATE_KEY) {
    console.error("CRITICAL ERROR: Missing necessary node connection credentials inside environment configurations.");
    process.exit(1);
}

// Instantiate connection nodes linking directly into the Ethereum Sepolia Testnet
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_RPC_URL);
const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);

// Track your newly deployed contract address fallback identity securely
const VAULT_ADDRESS = process.env.REFUEL_VAULT_ADDRESS || "0x51DC9E51e9F1216075E58E6F7045C4F17965d21C";

// Minimum Application Binary Interface (ABI) required to route transaction execution pipelines
const VAULT_ABI = [
    "function executeGaslessRefuel(address user, address token, uint256 amount, uint256 fee, uint256 deadline, bytes calldata sig) external"
];

// Initialize the active contract engine connection instance
const refuelVaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, relayerWallet);

// =========================================================================
// API ENDPOINTS & ROUTING LOGIC
// =========================================================================

/**
 * @route   GET /api/health
 * @desc    Simple monitoring ping check to verify application runtime health on Render.
 */
app.get("/api/health", (req, res) => {
    return res.status(200).json({ status: "healthy", network: "Sepolia Testnet", vault: VAULT_ADDRESS });
});

/**
 * @route   POST /api/quote
 * @desc    Legacy system calculation tracking loop (Hooked up to your instant Across APIs metrics).
 */
app.post("/api/quote", async (req, res) => {
    try {
        const { user, token, amount } = req.body;
        
        // Simulating flat service fee pricing metric conversions
        const flatFeeUsd = parseFloat(process.env.SERVICE_FLAT_FEE_USD || "0.06");
        
        console.log(`Calculating quote parameter outputs for user: ${user}`);

        // Return instant response data structures matching frontend UI formatting
        return res.status(200).json({
            success: true,
            user,
            token,
            amount,
            estimatedFee: ethers.parseUnits("0.001", 18).toString(), // Mock fee conversion calculation
            deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration window limit rule
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
        const { user, token, amount, fee, deadline, signature } = req.body;

        // Validation checkpoint check to shield backend execution loops from malformed data objects
        if (!user || !token || !amount || !fee || !deadline || !signature) {
            return res.status(400).json({ 
                success: false, 
                error: "Malformed request body parameters. All signature objects are mandatory fields." 
            });
        }

        console.log(`\n[Vault Processing Request Loop Initiated]`);
        console.log(`Routing gasless execution path securely through Contract Vault at: ${VAULT_ADDRESS}`);
        console.log(`User Target Wallet: ${user}`);

        // Broadcast directly to the on-chain RefuelVault smart contract engine
        const tx = await refuelVaultContract.executeGaslessRefuel(
            user,
            token,
            ethers.toBeHex(amount),    // Ensuring absolute numeric type formatting parameters
            ethers.toBeHex(fee),       // Ensuring absolute numeric type formatting parameters
            deadline,
            signature
        );

        console.log(`Transaction broadcast sequence successful. Awaiting block miners... Transaction Hash: ${tx.hash}`);
        
        // Wait for 1 confirmation to update frontend states reliably
        const receipt = await tx.wait();
        
        console.log(`Block execution validated. Gasless refuel transaction pipeline successfully closed.\n`);

        // Send payload back cleanly to the template literal frontend UI hook
        return res.status(200).json({
            success: true,
            message: "Refuel contract transaction successfully executed!",
            transactionHash: receipt.hash
        });

    } catch (error) {
        console.error("CRITICAL ERROR: Failed to execute transaction path via contract vault engine:", error);
        
        // Handle specific EVM execution failure message logs directly
        return res.status(500).json({ 
            success: false, 
            error: "On-chain transaction execution failed", 
            details: error.reason || error.message 
        });
    }
});

// =========================================================================
// SERVER START EXECUTION
// =========================================================================
app.listen(PORT, () => {
    console.log(`====================================================================`);
    console.log(` PennyGas Full-Stack Gasless Refuel Web App Server Active`);
    console.log(` Running on Port Address: ${PORT}`);
    console.log(` Active Contract Vault Network Target: Ethereum Sepolia`);
    console.log(` Contract Vault Instance Routing Target: ${VAULT_ADDRESS}`);
    console.log(`====================================================================`);
});
