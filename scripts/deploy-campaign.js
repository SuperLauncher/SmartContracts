const { ethers } = require("hardhat");
const BigNumber = require("bignumber.js");

async function main() {
	// We get the contract to deploy

	const factoryAddress = '0x097aCAf329f318eba3f749B5F941B14afACDF8A3';
	const tokenAddress = '0x7AA5cA0F57Ffa5700269786484609f80185481c1';
	const campaignOwner = '0x2f07026A89B1E4E3377e6dA46FD1AB4dD04a255C';

	//token
	// const MockXYZ = await ethers.getContractFactory("MockXYZ");
	// mockXYZ = await MockXYZ.deploy();
	// await mockXYZ.deployed();
	// console.log("mockXYZ deployed to:", mockXYZ.address);

	const Factory = await ethers.getContractFactory("Factory");
	const myFactory = await Factory.attach(factoryAddress);

	const block = await ethers.provider.getBlock("latest");
	//console.log(block);

	const startDate = new BigNumber("1617209220");
	const endDate = startDate.plus(600);
	const midDate = startDate.plus(300);

	const campaignAddress = await myFactory.createCampaign(
		tokenAddress, //token
		campaignOwner, //campaignOwner
		["10000000000000000", "20000000000000000", "1000000000000000000000", "0", "0"],
		[startDate.toString(), endDate.toString(), midDate.toString()], //dates
		["10000000000000000", "10000000000000000"], //_buyLimits
		"1", //access
		["8000000000000000", "400000000000000000000", "1800"], //_liquidity
		false//burn
	);

	console.log("Campaign deployed to:", campaignAddress);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});