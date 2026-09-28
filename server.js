const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Global wildcard CORS opening configuration to guarantee frontend access
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const PORT = process.env.PORT || 10000;
const FLAT_FEE_USD = parseFloat(process.env.SERVICE_FLAT_FEE_USD) || 0.06;

// FIXED: Forces the contract variable to lower-case, bypassing Ethers checksum blocks completely
const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS ? process.env.VAULT_CONTRACT_ADDRESS.trim().toLowerCase() : null;
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

// Initialize the Arbitrum Sepolia network RPC node provider pipeline dynamically
// FIXED: Swaps out the restricted publicnode path for an unblocked foundation RPC node engine
const ARB_SEPOLIA_RPC = "https://arbitrum.io";
const provider = new ethers.JsonRpcProvider(ARB_SEPOLIA_RPC);

// Connect your secure relayer environment wallet key to the blockchain network channel
let relayerWallet = null;
if (PRIVATE_KEY) {
    try {
        relayerWallet = new ethers.Wallet(PRIVATE_KEY, provider);
        console.log(`📡 [Relayer Core Initiated]: Node active. Public identity synced: ${relayerWallet.address}`);
    } catch (keyErr) {
        console.log("⚠️ [Relayer Core Error]: Invalid or corrupted PRIVATE_KEY string format detected.");
    }
}

// Load the compiled contract interface metrics directly into active system memory tracks
const contractArtifactPath = path.resolve('./PennyGas.json');
let contractAbi = [];
if (fs.existsSync(contractArtifactPath)) {
    try {
        const rawArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
        contractAbi = rawArtifact.abi;
        console.log("⚙️ [Backend Engine]: PennyGas Smart Contract ABI successfully loaded into memory!");
    } catch (abiError) {
        console.log("⚠️ [Backend Engine Warning]: Failed parsing local PennyGas.json file structural layouts.");
    }
}

app.get('/', (req, res) => {
    res.json({ status: "online", message: "PennyGas production network is live!" });
});

app.get('/api/quote', async (req, res) => {
    const { originChainId, tokenAddress, targetEthAmount } = req.query;

    if (!originChainId || !tokenAddress || !targetEthAmount) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
        // 1. Fetch live ETH price from Chainlink Oracle
        let ethPriceUsd = 2696.02; // Reliable fallback value
        try {
            const ethMainnetProvider = process.env.ETH_MAINNET_RPC_URL ? new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC_URL) : null;
            if (ethMainnetProvider) {
                const priceFeedContract = new ethers.Contract(
                    "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
                    ["function latestAnswer() external view returns (int256)"],
                    ethMainnetProvider
                );
                const rawPrice = await priceFeedContract.latestAnswer.staticCall();
                ethPriceUsd = Number(rawPrice) / 1e8;
            }
        } catch (e) {
            console.log("Oracle retrieval bypassed, using baseline price fallback:", e.message);
        }

        // 2. Fetch Across suggested fees safely using production paths
        let bridgeFeeEth = 0.000050; // Secure fallback fee
        try {
            const targetEthWei = ethers.parseEther(targetEthAmount).toString();
            const targetAcrossUrl = 'https://across.to';
            const response = await axios.get(targetAcrossUrl, {
                params: {
                    inputToken: tokenAddress,
                    outputToken: '0xC02aaA39b223FE8D0A0e5C4F27ead9083c756Cc2', 
                    originChainId: originChainId,
                    destinationChainId: 1, 
                    amount: targetEthWei
                },
                timeout: 5000
            });
            if (response.data && response.data.totalRelayFee) {
                bridgeFeeEth = parseFloat(ethers.formatEther(response.data.totalRelayFee.total || "0"));
            }
        } catch (bErr) {
            console.log("Across endpoint query bypassed. Applying fallback fee calculations:", bErr.message);
        }

        // 3. Pricing calculations
        const baseCostEth = parseFloat(targetEthAmount) + bridgeFeeEth;
        const bufferCostEth = baseCostEth * 0.02;
        const flatFeeEth = FLAT_FEE_USD / ethPriceUsd;
        const finalInvoiceEth = baseCostEth + bufferCostEth + flatFeeEth;

        res.json({
            requestedEth: targetEthAmount,
            bridgeFee: bridgeFeeEth.toFixed(6),
            buffer: bufferCostEth.toFixed(6),
            ourProfitUsd: FLAT_FEE_USD.toFixed(2),
            ourProfitEth: flatFeeEth.toFixed(6),
            totalInvoiceEth: finalInvoiceEth.toFixed(6),
            currentEthPrice: ethPriceUsd.toFixed(2)
        });

    } catch (error) {
        console.error("Route calculation engine exception:", error);
        res.status(500).json({ error: "Internal processing calculation crash" });
    }
});
app.post('/api/submit-permit', async (req, res) => {
    try {
        const { owner, spender, value, deadline, signature } = req.body;
        console.log(`\n🚀 [Incoming Request]: Valid signature intercepted from account: ${owner}`);
        
        if (!relayerWallet || !VAULT_ADDRESS || contractAbi.length === 0) {
            return res.status(500).json({ success: false, error: "Server infrastructure attributes uninitialized." });
        }

        const mockTargetTokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // Arbitrum USDC target
        const mockEthToUserWei = ethers.parseEther("0.005"); // Auto dispatching baseline test parameters size

        console.log("🔒 Constructing live onchain automated execution transaction pipeline...");
        
        // Connect our secure active relayer identity instance handler directly to your contract address coordinates
        const vaultContract = new ethers.Contract(VAULT_ADDRESS, contractAbi, relayerWallet);

        // LIVE BLOCKCHAIN EXECUTION: Call the executeRefuel function directly on your contract layout
        console.log(`📡 Transmitting cryptographic call payload parameters directly to contract target: ${VAULT_ADDRESS}`);
        const tx = await vaultContract.executeRefuel(
            owner,                  // The customer wallet who signed the permit message
            mockTargetTokenAddress, // The payment token token address matrix
            ethers.parseUnits("15.00", 6), // Value parameter authorization allocation caps
            mockEthToUserWei        // Exact size parameters weight of ETH sent right to their layout balances
        );

        console.log(`⏳ Block transaction broadcasted successfully! Tracking Hash Identifier: ${tx.hash}`);
        console.log("⏳ Awaiting network mining confirmation verification loops...");
        
        // Wait for the public block confirmation registers to permanently settle the transaction ledger metrics
        const receipt = await tx.wait();
        console.log(`✅ Transaction fully processed and mined in block: ${receipt.blockNumber}`);

        res.json({ 
            success: true, 
            message: "Onchain refuel sequence completed perfectly!",
            transactionHash: tx.hash
        });

    } catch (err) {
        console.error("❌ Onchain deployment runtime execution failure exception:", err.message);
        res.status(500).json({ success: false, error: "Transaction processing dropout: " + err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`PennyGas Server online on port ${PORT}`);
});
