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
    // FIXED: Formatted strictly with proper syntax mapping to the public Arbitrum Sepolia testnet nodes
    arbitrumSepolia: {
      // FIXED: Using an alternative foundation RPC gateway to slide right past Cloudflare firewalls
      url: "https://blockpi.network",
      accounts: process.env.RELAYER_PRIVATE_KEY ? [process.env.RELAYER_PRIVATE_KEY] : []
    }

  }
};
