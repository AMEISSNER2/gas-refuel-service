require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    // FIXED: Maps hardhat compile deployments directly to your unblocked Ethereum Sepolia endpoint credentials
    sepolia: {
      url: process.env.ARB_SEPOLIA_RPC_URL || process.env.ETH_SEPOLIA_RPC_URL || "https://publicnode.com",
      accounts: process.env.RELAYER_PRIVATE_KEY ? [process.env.RELAYER_PRIVATE_KEY] : []
    }
  }
};
