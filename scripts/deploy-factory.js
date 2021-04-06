const { ethers } = require("hardhat");

async function main() {
	// We get the contract to deploy
	const BscLauncherToken = await ethers.getContractFactory(
		"SuperLauncherToken"
	);
	const bscLauncherToken = await BscLauncherToken.deploy();
	await bscLauncherToken.deployed();
  
	console.log("SuperLauncherToken deployed to:", bscLauncherToken.address);

	const fee1 = '0x2f07026A89B1E4E3377e6dA46FD1AB4dD04a255C';
	const fee2 = '0x2f07026A89B1E4E3377e6dA46FD1AB4dD04a255C';
	const pcSwapRouter = '0x0000000000000000000000000000000000000000';

	
	const FeeVault = await ethers.getContractFactory("FeeVault");
	const feeVault = await FeeVault.deploy(fee1, fee2);
	await feeVault.deployed();

	const Factory = await ethers.getContractFactory("Factory");

	const myFactory = await Factory.deploy(
			bscLauncherToken.address,
			feeVault.address,
			pcSwapRouter
	);
	await myFactory.deployed();

	console.log("myFactory deployed to:", myFactory.address);
  }
  
  main()
	.then(() => process.exit(0))
	.catch(error => {
	  console.error(error);
	  process.exit(1);
	});