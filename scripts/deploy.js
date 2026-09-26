import hre from "hardhat";

async function main() {
  console.log("🚀 Initializing PennyGas Smart Contract Deployment Pipeline...");

  // 1. Fetch your compiled contract layout out of your new artifact cache build folders
  const PennyGas = await hre.ethers.getContractFactory("PennyGas");
  
  // 2. Trigger the automated cryptographic deployment handshake sequence
  const pennyGasContract = await PennyGas.deploy();

  // 3. Wait for the transaction to finalize block validation tracks
  await pennyGasContract.waitForDeployment();

  const contractAddress = await pennyGasContract.getAddress();
  console.log(`\n=======================================================`);
  
  // Highlight this address text block output value on your terminal screen
  console.log(`🏆 PENNYGAS VAULT SMART CONTRACT DEPLOYED SUCCESSFULLY!`);
  console.log(`📍 Contract Deployed To Address Target: ${contractAddress}`);
  console.log(`=======================================================\n`);
}

main().catch((error) => {
  console.error("❌ Deployment routine script crashed out:", error);
  process.exitCode = 1;
});
