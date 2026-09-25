const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware to handle communication securely
app.use(cors());
app.use(express.json());

const FLAT_FEE_USD = parseFloat(process.env.SERVICE_FLAT_FEE_USD) || 0.06;

/**
 * CORE CORE MATH ROUTE: Fetches prices for the frontend website interface
 */
app.get('/api/quote', async (req, res) => {
    const { originChainId, tokenAddress, targetEthAmount } = req.query;

    if (!originChainId || !tokenAddress || !targetEthAmount) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
        const url = 'https://urldefense.com/v3/__https://across.to__;!!P9Lt_3V8VW4!qI0fBddT77dWczJD_3kqf37uZ8-SPKMwdF1P7EoZh7iKzQdMlIkZrQ8MJtZHqtOzFnTPIuw44qVzspEB4Jbk$';
        const targetEthWei = ethers.parseEther(targetEthAmount).toString();

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
        
        const ethPriceUsd = 3000; 
        const flatFeeEth = FLAT_FEE_USD / ethPriceUsd;
        const finalInvoiceEth = baseCostEth + bufferCostEth + flatFeeEth;

        // Send the clean, structured calculation straight back to the website interface screen
        res.json({
            requestedEth: targetEthAmount,
            bridgeFee: bridgeFeeEth.toFixed(6),
            buffer: bufferCostEth.toFixed(6),
            ourProfitUsd: FLAT_FEE_USD.toFixed(2),
            ourProfitEth: flatFeeEth.toFixed(6),
            totalInvoiceEth: finalInvoiceEth.toFixed(6)
        });

    } catch (error) {
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

    // In production, your contract execution logic triggers natively right here!
    
    res.json({
        success: true,
        message: "Refuel successfully broad-casted to Ethereum Mainnet!",
        simulatedProfit: `$${FLAT_FEE_USD.toFixed(2)}`
    });
});

// Fire up the local internet link listening on port 3000
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⛽  PENNYGAS LIVE ENDPOINT API SERVER RUNNING ON PORT ${PORT}`);
    console.log(`👉 Your internal network gate is listening at: https://urldefense.com/v3/__http://localhost:3000__;!!P9Lt_3V8VW4!qI0fBddT77dWczJD_3kqf37uZ8-SPKMwdF1P7EoZh7iKzQdMlIkZrQ8MJtZHqtOzFnTPIuw44qVzsowZB0eb$`);
    console.log(`=======================================================`);
});
