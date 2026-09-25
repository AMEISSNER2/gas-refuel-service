const axios = require('axios');
require('dotenv').config();

const FLAT_FEE_USD = parseFloat(process.env.SERVICE_FLAT_FEE_USD) || 0.06;

async function calculateUltraCheapQuote(originChainName, originChainId, tokenSymbol, originTokenAddress, targetEthAmount) {
  try {
    const ethMainnetId = 1;
    const targetEthWei = (parseFloat(targetEthAmount) * 10**18).toString();
    const url = 'https://urldefense.com/v3/__https://across.to__;!!P9Lt_3V8VW4!r8c8exfFHa5f-CN7qTvfI5RZWlID16vEKlJyh9ucI7zQRVeRBW5nqxwAJ0JacrsAz1EcfoY5ya2IWDF38678$';
    
    const response = await axios.get(url, {
      params: {
        originChainId: originChainId,
        destinationChainId: ethMainnetId,
        inputToken: originTokenAddress,
        outputToken: '0xC02aaA39b223FE8D0A0e5C4F27ead9083c756Cc2', // Mainnet WETH
        amount: targetEthWei,
        exactInput: false
      }
    });

    const data = response.data;
    const relayFeeTotalWei = data.totalRelayFee && data.totalRelayFee.total ? data.totalRelayFee.total : "0";
    const bridgeFeeEth = parseFloat(relayFeeTotalWei) / 10**18;
    const baseCostEth = parseFloat(targetEthAmount) + bridgeFeeEth;
    
    // 2% buffer to absorb network volatility before your relayer script broadcasts
    const bufferCostEth = baseCostEth * 0.02;
    
    // Your flat 6-cent fee translated into its ETH equivalent value
    const ethPriceUsd = 3000; 
    const flatFeeEth = FLAT_FEE_USD / ethPriceUsd;
    
    const finalInvoiceEth = baseCostEth + bufferCostEth + flatFeeEth;

    console.log(`=======================================================`);
    console.log(`🏦 PENNYGAS ENGINE: ${tokenSymbol} on ${originChainName.toUpperCase()}`);
    console.log(`=======================================================`);
    console.log(`🔹 Core ETH Requested       : ${parseFloat(targetEthAmount).toFixed(5)} ETH`);
    console.log(`🔹 Across Bridge Fee        : ${bridgeFeeEth.toFixed(5)} ETH`);
    console.log(`🛡️ 2% Gas Spike Buffer       : ${bufferCostEth.toFixed(5)} ETH`);
    console.log(`💼 Your Penny Profit Margin : ${flatFeeEth.toFixed(5)} ETH ($${FLAT_FEE_USD.toFixed(2)})`);
    console.log(`-------------------------------------------------------`);
    console.log(`💰 TOTAL INVOICE TO USER    : ${finalInvoiceEth.toFixed(5)} ETH`);
    console.log(`=======================================================\n`);

    return finalInvoiceEth;
  } catch (error) {
    // If a specific token route is temporarily cold or illiquid, show a graceful notice instead of crashing
    console.log(`⚠️  [${tokenSymbol} on ${originChainName}]: Route currently unavailable or pool lacks liquidity.\n`);
  }
}

async function runMatrixTests() {
  console.log("\n=======================================================");
  console.log("⛽  RUNNING PENNYGAS CORE ASSET ROUTING MATRIX");
  console.log("=======================================================\n");

  const targetGasFill = '0.01'; // The amount of gas ETH we want delivered to Mainnet

  // --- NATIVE ETHEREUM MAINNET OPTIONS (Chain ID: 1) ---
  await calculateUltraCheapQuote('Ethereum Mainnet', 1, 'USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', targetGasFill);
  await calculateUltraCheapQuote('Ethereum Mainnet', 1, 'USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7', targetGasFill);

  // --- ARBITRUM ONE OPTIONS (Chain ID: 42161) ---
  await calculateUltraCheapQuote('Arbitrum One', 42161, 'USDC', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', targetGasFill);
  await calculateUltraCheapQuote('Arbitrum One', 42161, 'USDT', '0xFd086b97270535728a370aa7c969c19027158356', targetGasFill);
}

runMatrixTests();
