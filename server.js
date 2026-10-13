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

const PORT = 9000;
const FLAT_FEE_USD = parseFloat(process.env.SERVICE_FLAT_FEE_USD) || 0.06;
const VAULT_ADDRESS = "0x51DC9E51e9F1216075E58E6F7045C4F17965d21C";

const VAULT_ABI = [
    "function refuel(address user, address token, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external returns (bool)"
];

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /api/quote
 * Calculates real-time invoices and checks token address options
 */
app.get('/api/quote', async (req, res) => {
    const originChainId = req.query.originChainId || "11155111";
    // Defaults to USDC but accepts incoming token selection overrides (such as USDT)
    const tokenAddress = req.query.tokenAddress || "0x1c7D4B196CbC4B4bC7B181d743FBC6114a902379";
    const targetEthAmount = req.query.targetEthAmount || "0.01";

    try {
        let ethPriceUsd = 2696.02; 
        try {
            const rpcUrl = process.env.ETH_MAINNET_RPC_URL || process.env.SEPOLIA_RPC_URL;
            if (rpcUrl) {
                const provider = new ethers.JsonRpcProvider(rpcUrl);
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
            nonce: Math.floor(Date.now() / 1000), 
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
 * Validates relayer gas thresholds before broadcasting transactions on-chain
 */
app.post('/api/refuel', async (req, res) => {
    try {
        const { user, token, tokenAmount, nonce, v, r, s } = req.body;

        // FIXED: Removed the old 'ethToUser' condition so the payload clears validation flawlessly
        if (!user || !token || !tokenAmount || !v || !r || !s) {
            return res.status(400).json({ 
                success: false, 
                error: "Handshake Error: Missing parameters inside body payload." 
            });
        }
        
        // ... rest of your functioning contract broadcast code remains exactly the same


        const targetRpcUrl = process.env.SEPOLIA_RPC_URL; 
        if (!targetRpcUrl) throw new Error("Missing network node RPC deployment URL inside configuration mapping.");
        const provider = new ethers.JsonRpcProvider(targetRpcUrl);

        const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!relayerPrivateKey) throw new Error("Missing Relayer Wallet Private Key configuration entry.");
        const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);

        // 🛡️ PRE-FLIGHT GUARD: Validate Relayer Gas Balance
        const relayerBalance = await provider.getBalance(relayerWallet.address);
        console.log(`[Relayer Status] Sponsoring Gas Account Balance: ${ethers.formatEther(relayerBalance)} ETH`);
        
        // Refuse broadcast if balance dips below baseline threshold required for transaction execution
        if (relayerBalance < ethers.parseEther("0.005")) {
            return res.status(500).json({
                success: false,
                error: "Sponsor Wallet Deficit: The relayer does not have enough native ETH gas to clear on-chain mining fees."
            });
        }

        const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, relayerWallet);

        const txResponse = await vaultContract.refuel(
            ethers.getAddress(user),
            ethers.getAddress(token),
            BigInt(tokenAmount),
            BigInt(nonce),
            parseInt(v, 10),
            ethers.zeroPadValue(r, 32),
            ethers.zeroPadValue(s, 32)
        );

        console.log(`🚀 Real Transaction successfully broadcasted! Hash: ${txResponse.hash}`);

        res.json({ 
            success: true, 
            message: "Signature broadcast processing initiated safely.", 
            transactionHash: txResponse.hash 
        });

    } catch (error) {
        console.error("🚨 On-Chain Execution Crash Exception:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message || "Internal relayer processing error." 
        });
    }
});

app.listen(PORT, () => {
    console.log(`0x5f4e... Unified PennyGas Backend online and strictly listening on port ${PORT}`);
});
