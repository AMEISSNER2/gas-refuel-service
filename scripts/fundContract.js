const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const targetContract = "0x0e58508668003e1ea9c0d0319db166717860b24c";
  const amountToDeposit = hre.ethers.parseEther("0.02");

  console.log(`⏳ Initializing funding pipeline using your private Alchemy node...`);

  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerPrivateKey) {
      throw new Error("Missing RELAYER_PRIVATE_KEY inside your local .env file setup.");
  }

  // FIXED: Instead of hardcoding public URLs that get blocked, we read your private, whitelisted Alchemy URL straight out of your local .env file
  const privateNodeUrl = process.env.ARB_SEPOLIA_RPC_URL;
  if (!privateNodeUrl) {
      throw new Error("Missing ARB_SEPOLIA_RPC_URL inside your local .env file. Please open your .env file and add a line like: ARB_SEPOLIA_RPC_URL=your_alchemy_url_here");
  }

  const rawProvider = new hre.ethers.JsonRpcProvider(privateNodeUrl);
  const rawWallet = new hre.ethers.Wallet(relayerPrivateKey, rawProvider);
  console.log(`📡 Secure Wallet Connected: ${rawWallet.address}`);

  const txRequest = {
    to: targetContract,
    value: amountToDeposit,
    gasLimit: 50000 
  };

  const tx = await rawWallet.sendTransaction(txRequest);

  console.log(`🚀 Transaction broadcasted successfully! Tracking Hash: ${tx.hash}`);
  console.log(`⏳ Awaiting network block confirmation registers...`);
  
  await tx.wait();
  console.log(`\n========================================================================`);
  console.log(`✅ SUCCESS! Your contract vault tank has been officially fueled with 0.02 ETH!`);
  console.log(`========================================================================\n`);
}

main().catch((error) => {
  console.error("❌ Funding script encountered an exception:", error.message);
  process.exitCode = 1;
});
