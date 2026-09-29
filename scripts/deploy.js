const { ethers } = require("hardhat");

async function main() {
  console.log("Preparing deployment of RefuelVault configuration...");

  // Fetch the contract factory
  const RefuelVault = await ethers.getContractFactory("RefuelVault");
  
  console.log("Deploying RefuelVault contract to Sepolia Testnet...");
  
  // Deploy the contract
  const vault = await RefuelVault.deploy();
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();

  console.log("====================================================");
  console.log(`RefuelVault successfully deployed!`);
  console.log(`Contract Address: ${vaultAddress}`);
  console.log(`Deployed by (PG Burner Dev): 0x1a1ABFc2Ed45F6CA1E6068c76B11C804B56AB779`);
  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
