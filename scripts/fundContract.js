const hre = require("hardhat");

async function main() {
  // Clean and format the address string to satisfy strict Ethers checksum rules
  const rawTargetAddress = "0x0E58508668003e1eA9C0D0319db166717860B24C".trim().toLowerCase();
  const amountToDeposit = hre.ethers.parseEther("0.02"); // Pushes a solid 0.02 ETH buffer into your contract tank

  console.log(`⏳ Initializing direct onchain funding pipeline...`);

  // 1. Fetch your secure relayer account identity straight from your local keys
  const [relayerSigner] = await hre.ethers.getSigners();
  console.log(`📡 Wallet Identity Authenticated: ${relayerSigner.address}`);

  // 2. Broadcast a direct transfer transaction onto the network with explicit L2 fee parameters
  const tx = await relayerSigner.sendTransaction({
    to: rawTargetAddress,
    value: amountToDeposit,
    gasLimit: 100000, // Generous gas limit cap guarantees it clears the L2 compression data gates
    maxPriorityFeePerGas: hre.ethers.parseUnits("0.1", "gwei"),
    maxFeePerGas: hre.ethers.parseUnits("0.2", "gwei")
  });

  console.log(`🚀 Transaction broadcasted! Tracking Hash: ${tx.hash}`);
  console.log(`⏳ Awaiting block confirmation registers...`);
  
  await tx.wait();
  console.log(`\n========================================================================`);
  console.log(`✅ SUCCESS! Your contract vault tank has been officially fueled with 0.02 ETH!`);
  console.log(`========================================================================\n`);
}

main().catch((error) => {
  console.error("❌ Funding script encountered an exception:", error);
  process.exitCode = 1;
});
