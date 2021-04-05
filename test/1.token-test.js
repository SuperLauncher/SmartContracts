const { expect } = require("chai");
const { ethers } = require("hardhat");
const { smoddit, smockit } = require("@eth-optimism/smock");
const BigNumber = require("bignumber.js");

describe("LAUNCH TOKEN", function () {
	let bscLauncherToken;
	beforeEach(async () => { });

	it("Should create token successfully", async function () {
		const [owner, addr1] = await ethers.getSigners();

		const BscLauncherToken = await ethers.getContractFactory(
			"BscLauncherToken"
		);

		bscLauncherToken = await BscLauncherToken.deploy();
		await bscLauncherToken.deployed();

		expect(await bscLauncherToken.owner()).to.equal(owner.address);

		expect(await bscLauncherToken.symbol()).to.equal("LAUNCH");

		expect(await bscLauncherToken.name()).to.equal("BSC Launcher");

		expect(await bscLauncherToken.totalSupply()).to.equal("12000000000000000000000000");
	});

	it("Should able to un-lock token", async function () {
		const [owner, addr1] = await ethers.getSigners();

		//un-lock index 0
		await bscLauncherToken
			.connect(owner)
			.unlockTeamAllocation("0");

		expect(await bscLauncherToken.balanceOf(owner.address)).to.equal(
			"10050000000000000000000000"
		);

		//after 30 days
		await ethers.provider.send("evm_increaseTime", [2592000]);
		//un-lock index 1
		await bscLauncherToken
			.connect(owner)
			.unlockTeamAllocation("1");

		expect(await bscLauncherToken.balanceOf(owner.address)).to.equal(
			"10550000000000000000000000"
		);

		//after 150 days
		await ethers.provider.send("evm_increaseTime", [10368000]);
		//un-lock index 1
		await bscLauncherToken
			.connect(owner)
			.unlockTeamAllocation("2");

		expect(await bscLauncherToken.balanceOf(owner.address)).to.equal(
			"11250000000000000000000000"
		);

		//after 270 days
		await ethers.provider.send("evm_increaseTime", [10368000]);
		//un-lock index 1
		await bscLauncherToken
			.connect(owner)
			.unlockTeamAllocation("3");

		expect(await bscLauncherToken.balanceOf(owner.address)).to.equal(
			"12000000000000000000000000"
		);
	});

	it("Can't un-lock token 2 times", async function () {
		const [owner, addr1] = await ethers.getSigners();

		//un-lock index 0

		//after 30 days
		await ethers.provider.send("evm_increaseTime", [2592000]);
		//un-lock index 1
		await expect(
			bscLauncherToken
			.connect(owner)
			.unlockTeamAllocation("0")
		  ).to.be.revertedWith("This allocation has been released previously");
	
	});

	it("Should able to transfer coin", async function () {
		const [owner, addr1] = await ethers.getSigners();

		await bscLauncherToken
			.connect(owner)
			.transfer(addr1.address, "6000000000000000000000000");

		expect(await bscLauncherToken.balanceOf(addr1.address)).to.equal(
			"6000000000000000000000000"
		);
	});

});
