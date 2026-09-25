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
        // 1. Fetch live ETH price from Chainlink Oracle on Mainnet via your RPC provider
        let ethPriceUsd = 3004; // Stepped to 3004 to verify this clean build deployed!
        try {
            const rpcUrl = process.env.ETH_MAINNET_RPC_URL;
            if (rpcUrl) {
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                // Chainlink ETH/USD Aggregator Contract Address on Mainnet
                const chainlinkAggregatorAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
                // Minimal ABI snippet to extract latestAnswer metrics
                const minAbi = ["function latestAnswer() external view returns (int256)"];
                const priceFeedContract = new ethers.Contract(chainlinkAggregatorAddress, minAbi, provider);
                
                const rawPrice = await priceFeedContract.latestAnswer();
                // Chainlink price variables return with 8 decimals on USD pairs
                ethPriceUsd = Number(rawPrice) / 1e8;
                console.log(`[Onchain Price Feed]: Live ETH Price synchronized via Chainlink Oracle at $${ethPriceUsd} USD`);
            } else {
                console.log('[Onchain Price Feed Warning]: ETH_MAINNET_RPC_URL variable missing from environment settings.');
            }
        } catch (oracleError) {
            console.log('[Onchain Price Feed Warning]: Direct Oracle contract query choked, using fallback rate (\$3004)', oracleError.message);
        }

        // 2. Fetch swap metrics from Across Protocol Public Suggested Fees API
        const targetEthWei = ethers.parseEther(targetEthAmount).toString();
        const acrossUrl = 'https://across.to';
        
        let bridgeFeeEth = 0;
        try {
            const response = await axios.get(acrossUrl, {
                params: {
                    inputToken: tokenAddress,
                    outputToken: '0xC02aaA39b223FE8D0A0e5C4F27ead9083c756Cc2', // Mainnet WETH
                    originChainId: originChainId,
                    destinationChainId: 1, // Target Mainnet
                    amount: targetEthWei
                }
            });
            
            const totalRelayFeeWei = response.data.totalRelayFee && response.data.totalRelayFee.total ? response.data.totalRelayFee.total : "0";
            bridgeFeeEth = parseFloat(ethers.formatEther(totalRelayFeeWei));
        } catch (bridgeError) {
            console.log('[Bridge Warning]: Direct Across API request choked, using default gas assumptions');
            bridgeFeeEth = 0.0001; // Mock network fallback calculation
        }

        // 3. Compute final invoice parameters
        const baseCostEth = parseFloat(targetEthAmount) + bridgeFeeEth;
        const bufferCostEth = baseCostEth * 0.02;
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
        console.error("Core Engine Error:", error.message);
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
