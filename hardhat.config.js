require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // Original Ethereum Sepolia Target
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    // ADD THIS BLOCK: Arbitrum Sepolia Target Layer 2 routing configuration
    arbitrumSepolia: {
      url: process.env.ARB_SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
};
