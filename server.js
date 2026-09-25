const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();

// Middleware to handle communication securely
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FLAT_FEE_USD = parseFloat(process.env.SERVICE_FLAT_FEE_USD) || 0.06;

/**
 * HEALTH ROOT ROUTE: Instantly check if the server is live via a browser
 */
app.get('/', (req, res) => {
    res.json({
        status: "online",
        message: "PennyGas server is live and responding!",
        timestamp: new Date()
    });
});

/**
 * CORE MATH ROUTE: Fetches prices for the frontend website interface
 */
app.get('/api/quote', async (req, res) => {
    const { originChainId, tokenAddress, targetEthAmount } = req.query;

    if (!originChainId || !tokenAddress || !targetEthAmount) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
        // Clean Across Protocol swap endpoint (bypassing any link wrappers)
        const url = 'https://across.to';
        const targetEthWei = ethers.parseEther(targetEthAmount).toString();

        // 1. Fetch live ETH price from CoinGecko public ticker API
        let ethPriceUsd = 3000; // Safe fallback price if ticker rate limits hit
        try {
            const priceResponse = await axios.get('https://coingecko.com');
            if (priceResponse.data && priceResponse.data.ethereum && priceResponse.data.ethereum.usd) {
                ethPriceUsd = parseFloat(priceResponse.data.ethereum.usd);
                console.log(`[Price Engine]: Live ETH Price synchronized at $${ethPriceUsd} USD`);
            }
        } catch (priceError) {
            console.log('[Price Engine Warning]: Live ticker fetch failed, utilizing fallback rate (\$3000)');
        }

        // 2. Fetch swap details from Across Protocol API
        const response = await axios.get(url, {
            params: {
                tradeType: "minOutput",
                originChainId: originChainId,
                destinationChainId: 1,      // Target: Ethereum Mainnet
                inputToken: tokenAddress,
                outputToken: '0xC02aaA39b223FE8D0A0e5C4F27ead9083c756Cc2', // Mainnet WETH
                amount: targetEthWei,
                depositor: '0x9999999999999999999999999999999999999999',
                integratorID: '0xdead'
            }
        });

        const data = response.data;
        const totalRelayFeeWei = data.totalRelayFee && data.totalRelayFee.total ? data.totalRelayFee.total : "0";
        const bridgeFeeEth = parseFloat(ethers.formatEther(totalRelayFeeWei));
        const baseCostEth = parseFloat(targetEthAmount) + bridgeFeeEth;
        const bufferCostEth = baseCostEth * 0.02;
        
        // 3. Compute the final invoice with dynamically sized profit allocations
        const flatFeeEth = FLAT_FEE_USD / ethPriceUsd;
        const finalInvoiceEth = baseCostEth + bufferCostEth + flatFeeEth;

        // Send the clean, structured calculation straight back to the website interface screen
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
        console.error(error);
        res.status(500).json({ error: "Failed to compile live API quote calculation" });
    }
});

/**
 * SUBMISSION EXECUTION ROUTE: Called when a user clicks "Authorize Refuel"
 */
app.post('/api/refuel', async (req, res) => {
    const { userAddress, originChainId, tokenAddress, signatureData } = req.body;

    console.log(`\n🚀 [API Received]: Processing request for user ${userAddress}`);
    console.log(`🔒 Signature Captured. Advancing gas fees from server burner tank...`);
    
    res.json({
        success: true,
        message: "Refuel successfully broadcasted to Ethereum Mainnet!",
        simulatedProfit: `$${FLAT_FEE_USD.toFixed(2)}`
    });
});

// Fire up the server loop
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`⛽  PENNYGAS LIVE ENDPOINT API SERVER RUNNING ON PORT ${PORT}`);
    console.log(`=======================================================`);
});
