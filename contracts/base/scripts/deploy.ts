import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying GOAT Credits Contract to Base...");

  // Base USDC addresses
  const USDC_ADDRESSES = {
    mainnet: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    sepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  };

  const network = await ethers.provider.getNetwork();
  const isMainnet = network.chainId === 8453n;
  const usdcAddress = isMainnet ? USDC_ADDRESSES.mainnet : USDC_ADDRESSES.sepolia;

  console.log(`Network: ${isMainnet ? "Base Mainnet" : "Base Sepolia"}`);
  console.log(`USDC Address: ${usdcAddress}`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Deploy contract
  const GOATCredits = await ethers.getContractFactory("GOATCredits");
  const goatCredits = await GOATCredits.deploy(usdcAddress);
  await goatCredits.waitForDeployment();

  const contractAddress = await goatCredits.getAddress();
  console.log(`✅ GOATCredits deployed to: ${contractAddress}`);

  // Verify configuration
  const creditPrice = await goatCredits.creditPrice();
  const usdcToken = await goatCredits.usdc();
  console.log(`Credit Price: ${ethers.formatUnits(creditPrice, 6)} USDC`);
  console.log(`USDC Token: ${usdcToken}`);

  console.log("\n📋 Next steps:");
  console.log("1. Verify contract on Basescan:");
  console.log(`   npx hardhat verify --network ${isMainnet ? "baseMainnet" : "baseSepolia"} ${contractAddress} ${usdcAddress}`);
  console.log("2. Update your .env with:");
  console.log(`   BASE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("3. Insert contract info into Supabase contracts table");

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: isMainnet ? "base-mainnet" : "base-sepolia",
    contractAddress,
    usdcAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    chainId: network.chainId.toString(),
  };
  
  fs.writeFileSync(
    `./deployments/${isMainnet ? "base-mainnet" : "base-sepolia"}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\n💾 Deployment info saved to ./deployments/${isMainnet ? "base-mainnet" : "base-sepolia"}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
