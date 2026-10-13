const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ENFORCE PORT 9000 BINDING EXCLUSIVELY
const PORT = 9000;
const FLAT_FEE_USD = parseFloat(process.env.SERVICE_FLAT_FEE_USD) || 0.06;

// Target On-Chain Vault Profile Definition
const VAULT_ADDRESS = "0x51DC9E51e9F1216075E58E6F7045C4F17965d21C";

// Minimum standard human-readable ABI interface layout matching your deployed Solidity slot functions
const VAULT_ABI = [
    "function refuel(address user, address token, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external returns (bool)"
];

// Automatically serve your index.html assets directly on port 9000
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /api/quote
 * Explicitly matches the endpoint name your index.html requests for live quotes
 */
app.get('/api/quote', async (req, res) => {
    const originChainId = req.query.originChainId || "11155111";
    const tokenAddress = req.query.tokenAddress || "0x1c7D4B196CbC4B4bC7B181d743FBC6114a902379";
    const targetEthAmount = req.query.targetEthAmount || "0.01";
    const userAddress = req.query.user || "0x0000000000000000000000000000000000000000";

    try {
        let ethPriceUsd = 2696.02; 
        let currentNonceValue = Math.floor(Date.now() / 1000); // Default dynamic fallback tracking matrix

        // Safe query sequence to pull structural contract nonces natively from active RPCs
        try {
            const rpcUrl = process.env.ETH_MAINNET_RPC_URL || process.env.SEPOLIA_RPC_URL;
            if (rpcUrl) {
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                
                // Fetch dynamic oracle price feed bounds
                const priceFeedContract = new ethers.Contract(
                    "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
                    ["function latestAnswer() external view returns (int256)"],
                    provider
                );
                const rawPrice = await priceFeedContract.latestAnswer.staticCall();
                ethPriceUsd = Number(rawPrice) / 1e8;
            }
        } catch (e) {
            console.log("Oracle price processing fallback applied:", e.message);
        }

        let bridgeFeeEth = 0.000050; 
        try {
            const targetEthWei = ethers.parseEther(targetEthAmount).toString();
            const response = await axios.get('https://across.to', {
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
            console.log("Across endpoint query error fallback applied:", bErr.message);
        }

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
            currentEthPrice: ethPriceUsd.toFixed(2),
            nonce: currentNonceValue, 
            vault: VAULT_ADDRESS,
            rawTokenAmount: "15000000",
            rawEthAmount: ethers.parseEther(finalInvoiceEth.toFixed(6)).toString()
        });

    } catch (error) {
        console.error("Route calculation exception:", error);
        res.status(500).json({ error: "Internal processing calculation crash" });
    }
});

/**
 * POST /api/refuel
 * UNIFIED PRODUCTION ROUTEER: Broadcasts real gasless meta-transactions directly on-chain
 */
app.post('/api/refuel', async (req, res) => {
    try {
        const { user, token, tokenAmount, nonce, v, r, s } = req.body;

        // Perform rigorous structural null type validation controls upfront
        if (!user || !token || !tokenAmount || !v || !r || !s) {
            return res.status(400).json({ 
                success: false, 
                error: "Handshake Error: Missing cryptographic parameter arrays inside body payload." 
            });
        }

        console.log(`📡 Relayer executing signature dispatch for user: ${user}`);

        // 1. Initialize Network RPC Provider Connection
        const targetRpcUrl = process.env.SEPOLIA_RPC_URL; 
        if (!targetRpcUrl) {
            throw new Error("Missing network deployment provider mapping. Check active .env file configuration.");
        }
        const provider = new ethers.JsonRpcProvider(targetRpcUrl);

        // 2. Initialize Relayer Sponsor Key Signer 
        const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!relayerPrivateKey) {
            throw new Error("Missing relayer gas wallet injection baseline. Check private key variable bounds.");
        }
        const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);
        console.log(`💳 Sponsor Gas Account loaded: ${relayerWallet.address}`);

        // 3. Connect Smart Contract Target
        const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, relayerWallet);

        // 4. Force Defensive Type Clean Casting matching Solidity expectations
        const cleanUser = ethers.getAddress(user);
        const cleanToken = ethers.getAddress(token);
        const uintAmount = BigInt(tokenAmount);
        const uintNonce = BigInt(nonce || Math.floor(Date.now() / 1000));
        
        console.log(`📦 Packaging Contract Parameters -> User: ${cleanUser}, Units: ${uintAmount}, Nonce: ${uintNonce}`);

        // 5. Broadcast call directly to the chain provider
        // This transaction is executed and paid for by the sponsor key wallet, achieving gasless abstraction
        const txResponse = await vaultContract.refuel(
            cleanUser,
            cleanToken,
            uintAmount,
            uintNonce,
            parseInt(v, 10),
            ethers.zeroPadValue(r, 32),
            ethers.zeroPadValue(s, 32)
        );

        console.log(`🚀 Transaction broadcast success! Hex: ${txResponse.hash}`);

        // Return live verification variables back to the front-panel script
        res.json({ 
            success: true, 
            message: "Signature broadcast processing initiated safely.", 
            transactionHash: txResponse.hash 
        });

    } catch (error) {
        console.error("🚨 On-Chain Broadcast Execution Exception:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message || "Internal relayer calculation or gas exhaustion crash." 
        });
    }
});

app.listen(PORT, () => {
    console.log(`0x5f4e... Unified PennyGas Backend online and strictly listening on port ${PORT}`);
});
