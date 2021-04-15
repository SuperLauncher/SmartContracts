const { expect } = require("chai");
const { ethers } = require("hardhat");
const { smoddit, smockit } = require("@eth-optimism/smock");
const BigNumber = require("bignumber.js");

describe("Campaign", function () {
	let myFactory;
	let mockXYZ;
	let mockBAT;
	let bscLauncherToken;
	let campaign;
	let whiteListOnlyCampaign;

	beforeEach(async () => {
		const MockXYZ = await ethers.getContractFactory("MockXYZ");
		mockXYZ = await MockXYZ.deploy();
		await mockXYZ.deployed();

		const MockBAT = await ethers.getContractFactory("MockBAT");
		mockBAT = await MockBAT.deploy();
		await mockBAT.deployed();

		const BscLauncherToken = await ethers.getContractFactory(
			"SuperLauncherToken"
		);
		bscLauncherToken = await BscLauncherToken.deploy();
		await bscLauncherToken.deployed();

		const [owner, addr1] = await ethers.getSigners();
		const FeeVault = await ethers.getContractFactory("FeeVault");
		const feeVault = await FeeVault.deploy(owner.address, addr1.address);
		await feeVault.deployed();

		const MockUniswapV2Router02 = await ethers.getContractFactory(
			"MockUniswapV2Router02"
		);
		const mockUniswapV2Router02 = await MockUniswapV2Router02.deploy();
		await mockUniswapV2Router02.deployed();

		const Factory = await ethers.getContractFactory("Factory");

		myFactory = await Factory.deploy(
			bscLauncherToken.address,
			feeVault.address,
			mockUniswapV2Router02.address
		);
		await myFactory.deployed();
	});

	it("Only admin can create campaign", async function () {
		const [owner, addr1] = await ethers.getSigners();

		const block = await ethers.provider.getBlock("latest");
		//console.log(block);

		const startDate = new BigNumber(block.timestamp);
		const endDate = startDate.plus(3600);
		const midDate = startDate.plus(1800);

		const campaignAddres = await myFactory.connect(owner).createCampaign(
			mockXYZ.address, //token
			"0",
			addr1.address, //campaignOwner
			["10000000000000000", "20000000000000000", "1000000000000000000000", "0", "0"], //min, max, fee, feePcnt, qualifyingTokenQty
			[startDate.toString(), endDate.toString(), midDate.toString()], //dates
			["1000000000000000000", "5000000000000000000"], //_buyLimits
			"0", //access
			["8000000000000000", "400000000000000000000", "1800"], //_liquidity
			false//burn
		);

		expect(campaignAddres).to.not.equal(null);

		await expect(
			myFactory.connect(addr1).createCampaign(
				mockXYZ.address, //token
				"0", 
				addr1.address, //campaignOwner
				["10000000000000000", "20000000000000000", "1000000000000000000000", "0", "0"],
				[startDate.toString(), endDate.toString(), midDate.toString()], //dates
				["1000000000000000000", "5000000000000000000"], //_buyLimits
				"0", //access
				["8000000000000000", "400000000000000000000", "1800"], //_liquidity
				false//burn
			)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Should create campaign successfully", async function () {
		const [owner, addr1] = await ethers.getSigners();

		const block = await ethers.provider.getBlock("latest");
		//console.log(block);

		const startDate = new BigNumber(block.timestamp);
		const endDate = startDate.plus(3600);
		const midDate = startDate.plus(1800);

		const campaignAddres = await myFactory.createCampaign(
			mockXYZ.address, //token
			"0",
			addr1.address, //campaignOwner
			["10000000000000000", "20000000000000000", "1000000000000000000000", "0", "0"],
			[startDate.toString(), endDate.toString(), midDate.toString()], //dates
			["1000000000000000", "20000000000000000"], //_buyLimits
			"0", //access
			["8000000000000000", "400000000000000000000", "1800"], //_liquidity
			false//burn
		);

		const Campaign = await ethers.getContractFactory("Campaign");
		//console.log(campaignAddres.value.toString());
		const camIdxData = await myFactory.allCampaigns(
			campaignAddres.value.toString()
		);
		const campaignInstance = await Campaign.attach(camIdxData.contractAddress);

		//console.log(await campaignInstance.campaignOwner());
		//check campaign contract address
		expect(await campaignInstance.campaignOwner()).to.equal(addr1.address);
		//check token address
		expect(await campaignInstance.token()).to.equal(mockXYZ.address);
		//check feePcnt
		expect(await campaignInstance.feePcnt()).to.equal("0");
		// check tokenFunded
		expect(await campaignInstance.hardCap()).to.equal("20000000000000000");

		expect(await campaignInstance.softCap()).to.equal("10000000000000000");

		expect(await campaignInstance.startDate()).to.equal(startDate.toString());

		expect(await campaignInstance.endDate()).to.equal(endDate.toString());

		expect(await campaignInstance.midDate()).to.equal(midDate.toString());

		expect(await campaignInstance.minBuyLimit()).to.equal(
			"1000000000000000"
		);

		expect(await campaignInstance.maxBuyLimit()).to.equal(
			"20000000000000000"
		);

		expect(await campaignInstance.lpLockDuration()).to.equal("1800");

		expect(await campaignInstance.lpBnbQty()).to.equal("8000000000000000");

		expect(await campaignInstance.lpTokenQty()).to.equal("400000000000000000000");

		expect(await campaignInstance.lpTokenAmount()).to.equal("0");
	});

	it("Should create 2 campaign with same token successfully", async function () {
		const [owner, addr1] = await ethers.getSigners();

		const block = await ethers.provider.getBlock("latest");
		//console.log(block);

		const startDate = new BigNumber(block.timestamp);
		const endDate = startDate.plus(3600);
		const midDate = startDate.plus(1800);

		const campaignAddres = await myFactory.createCampaign(
			mockXYZ.address, //token
			"0",
			addr1.address, //campaignOwner
			["10000000000000000", "20000000000000000", "1000000000000000000000", "0", "0"],
			[startDate.toString(), endDate.toString(), midDate.toString()], //dates
			["1000000000000000", "20000000000000000"], //_buyLimits
			"0", //access
			["8000000000000000", "400000000000000000000", "1800"], //_liquidity
			false//burn
		);

		const Campaign = await ethers.getContractFactory("Campaign");
		//console.log(campaignAddres.value.toString());
		const camIdxData = await myFactory.allCampaigns(
			campaignAddres.value.toString()
		);
		const campaignInstance = await Campaign.attach(camIdxData.contractAddress);

		//check campaign contract address
		expect(await campaignInstance.campaignOwner()).to.equal(addr1.address);
		//check token address
		expect(await campaignInstance.token()).to.equal(mockXYZ.address);

		const campaignAddres2 = await myFactory.createCampaign(
			mockXYZ.address, //token
			"1",
			addr1.address, //campaignOwner
			["10000000000000000", "20000000000000000", "1000000000000000000000", "0", "0"],
			[startDate.toString(), endDate.toString(), midDate.toString()], //dates
			["1000000000000000", "20000000000000000"], //_buyLimits
			"0", //access
			["8000000000000000", "400000000000000000000", "1800"], //_liquidity
			false//burn
		);

		const Campaign2 = await ethers.getContractFactory("Campaign");
		//console.log(campaignAddres.value.toString());
		const camIdxData2 = await myFactory.allCampaigns(
			campaignAddres.value.toString()
		);
		const campaignInstance2 = await Campaign.attach(camIdxData2.contractAddress);

		expect(await campaignInstance2.campaignOwner()).to.equal(addr1.address);
		//check token address
		expect(await campaignInstance2.token()).to.equal(mockXYZ.address);
	});

	it("Should able to fundIn and active campaign", async function () {
		//console.log(await ethers.getSigners());
		const [owner, addr1, addr2] = await ethers.getSigners();

		const block = await ethers.provider.getBlock("latest");
		//console.log(block);

		const startDate = new BigNumber(block.timestamp);
		const endDate = startDate.plus(3600);
		const midDate = startDate.plus(1800);

		const campaignAddres = await myFactory.createCampaign(
			mockXYZ.address, //token
			"0",
			addr1.address, //campaignOwner
			["1000000000000000000", "4000000000000000000", "18720000000000000000000", "0", "0"],
			[startDate.toString(), endDate.toString(), midDate.toString()], //dates
			["1000000000000000000", "2000000000000000000"], //_buyLimits
			"0", //access
			["1000000000000000000", "400000000000000000000", "1800"], //_liquidity
			false//burn
		);

		const Campaign = await ethers.getContractFactory("Campaign");
		//console.log(campaignAddres.value.toString());
		const camIdxData = await myFactory.allCampaigns(
			campaignAddres.value.toString()
		);
		const campaignInstance = await Campaign.attach(camIdxData.contractAddress);

		//mint 10mil XYZ to campaign owner
		await mockXYZ.connect(addr1).mint("10000000000000000000000000");

		await mockXYZ
			.connect(addr1)
			.approve(camIdxData.contractAddress, "10000000000000000000000000000");

		//not fundIn, user2 can't buy

		await expect(
			campaignInstance.connect(addr2).buyTokens()
		).to.be.revertedWith("Campaign is not live");

		//campaing owner call fundIn()
		await campaignInstance.connect(addr1).fundIn();

		//after fundIn, user2 can buy
		expect(await campaignInstance.isLive()).to.equal(true);

		//User2 use 1BNB to buy, earn 4680 XYZ
		await campaignInstance
			.connect(addr2)
			.buyTokens({ value: "1000000000000000000" });

		//after 3600 seconds
		await ethers.provider.send("evm_increaseTime", [3600]);
		
		//admin call finish
		await campaignInstance.connect(addr1).finishUp();
		await campaignInstance.connect(addr1).setTokenClaimable();
		
		await campaignInstance
			.connect(addr2)
			.claimTokens();
		//user should able to claim tokens -> get 4680 XYZ

		expect((await mockXYZ.balanceOf(addr2.address)).toString()).to.equal(
			"4680000000000000000000"
		);
	});

	it("Should able to buy token and get correct amount with different token's decimal places", async function () {
		//console.log(await ethers.getSigners());
		const [owner, addr1, addr2] = await ethers.getSigners();

		const block = await ethers.provider.getBlock("latest");
		//console.log(block);

		const startDate = new BigNumber(block.timestamp);
		const endDate = startDate.plus(3600);
		const midDate = startDate.plus(1800);

		const campaignAddres = await myFactory.createCampaign(
			mockBAT.address, //token
			"0",
			addr1.address, //campaignOwner
			["1000000000000000000", "4000000000000000000", "4000000000", "0", "0"],
			[startDate.toString(), endDate.toString(), midDate.toString()], //dates
			["1000000000000000000", "2000000000000000000"], //_buyLimits
			"0", //access
			["1000000000000000000", "400000000000000000000", "1800"], //_liquidity
			false//burn
		);

		const Campaign = await ethers.getContractFactory("Campaign");
		//console.log(campaignAddres.value.toString());
		const camIdxData = await myFactory.allCampaigns(
			campaignAddres.value.toString()
		);
		const campaignInstance = await Campaign.attach(camIdxData.contractAddress);

		//mint 10mil XYZ to campaign owner
		await mockBAT.connect(addr1).mint("10000000000000000000000000");

		await mockBAT
			.connect(addr1)
			.approve(camIdxData.contractAddress, "10000000000000000000000000000");

		//not fundIn, user2 can't buy

		await expect(
			campaignInstance.connect(addr2).buyTokens()
		).to.be.revertedWith("Campaign is not live");

		//campaing owner call fundIn()
		await campaignInstance.connect(addr1).fundIn();

		//after fundIn, user2 can buy
		expect(await campaignInstance.isLive()).to.equal(true);

		//User2 use 1BNB to buy, earn 10 BAT
		await campaignInstance
			.connect(addr2)
			.buyTokens({ value: "1000000000000000000" });

				//after 3600 seconds
				await ethers.provider.send("evm_increaseTime", [3600]);
		
				//admin call finish
				await campaignInstance.connect(addr1).finishUp();
				await campaignInstance.connect(addr1).setTokenClaimable();
		
		
		//user should get correct token -> get 10 BAT

		await campaignInstance
		.connect(addr2)
		.claimTokens();

		expect((await mockBAT.balanceOf(addr2.address)).toString()).to.equal(
			"1000000000"
		);
	});

	it("Campaign: WhitelistedOnly, Campaign owner can add whilelist", async function () {
		const [owner, addr1, addr2, addr3] = await ethers.getSigners();

		const block = await ethers.provider.getBlock("latest");
		//console.log(block);

		const startDate = new BigNumber(block.timestamp);
		const endDate = startDate.plus(3600);
		const midDate = startDate.plus(1800);

		const campaignAddres = await myFactory.createCampaign(
			mockXYZ.address, //token
			"0",
			addr1.address, //campaignOwner
			["2000000000000000000", "4000000000000000000", "18720000000000000000000", "0", "0"],
			[startDate.toString(), endDate.toString(), midDate.toString()], //dates
			["1000000000000000000", "2000000000000000000"], //_buyLimits
			"1", //access
			["2000000000000000000", "400000000000000000000", "1800"], //_liquidity
			false//burn
		);

		const Campaign = await ethers.getContractFactory("Campaign");
		//console.log(campaignAddres.value.toString());
		const camIdxData = await myFactory.allCampaigns(
			campaignAddres.value.toString()
		);
		whiteListOnlyCampaign = await Campaign.attach(camIdxData.contractAddress);

		//whiteListOnlyCampaign = campaignInstance;

		//add address 2 to white list

		// strange user call func to add him to whitelist
		await expect(
			whiteListOnlyCampaign.connect(addr2).appendWhitelisted([addr2.address])
		).to.be.revertedWith("Only campaign owner can call");

		//add user2 to whilelist
		await whiteListOnlyCampaign
			.connect(addr1)
			.appendWhitelisted([addr2.address, addr3.address]);

		expect(
			await whiteListOnlyCampaign.whitelistedMap(addr2.address)
		).to.be.equal(true);

		expect(
			await whiteListOnlyCampaign.whitelistedMap(addr3.address)
		).to.be.equal(true);
		expect(await whiteListOnlyCampaign.numOfWhitelisted()).to.be.equal("2");

		//mint 10mil XYZ to campaign owner
		await mockXYZ.connect(addr1).mint("10000000000000000000000000");

		await mockXYZ
			.connect(addr1)
			.approve(camIdxData.contractAddress, "10000000000000000000000000000");

		//campaing owner call fundIn()
		await whiteListOnlyCampaign.connect(addr1).fundIn();
		//only user2 can buy token b/c he's in whitelist
		//User2 use 1BNB to buy, earn 4680 XYZ
		await whiteListOnlyCampaign
			.connect(addr2)
			.buyTokens({ value: "1000000000000000000" });

		await whiteListOnlyCampaign
			.connect(addr3)
			.buyTokens({ value: "1000000000000000000" });

		//only owner can remove an user from whitelist
		await whiteListOnlyCampaign
			.connect(addr1)
			.removeWhitelisted([addr3.address]);

		expect(
			await whiteListOnlyCampaign.whitelistedMap(addr3.address)
		).to.be.equal(false);
	});

	it("Exceeded max amount", async function () {
	    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
		await whiteListOnlyCampaign
		.connect(addr1)
		.appendWhitelisted([addr3.address]);

		await expect(
	     whiteListOnlyCampaign
	      .connect(addr3)
	      .buyTokens({ value: "2000000000000000000" })
		).to.be.revertedWith("Exceeded max amount");
	  });

	it("Campaing is done, when reach the hardcap", async function () {
	    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
	    expect(await whiteListOnlyCampaign.isLive()).to.equal(true);

		await whiteListOnlyCampaign
		.connect(addr2)
		.buyTokens({ value: "1000000000000000000" });

	    await whiteListOnlyCampaign
	      .connect(addr3)
	      .buyTokens({ value: "1000000000000000000" });

	    expect(await whiteListOnlyCampaign.isLive()).to.equal(false);
	  });

	  it("WhitelistedFirstThenEveryone, Should able to buy tokens for white list and everyone", async function () {
	    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

	    const block = await ethers.provider.getBlock("latest");
	    //console.log(block);

	    const startDate = new BigNumber(block.timestamp);
	    const endDate = startDate.plus(3600);
	    const midDate = startDate.plus(1800);

	    const campaignAddres = await myFactory.createCampaign(
	      mockXYZ.address, //token
		  "0",
	      addr1.address, //campaignOwner
		  ["2000000000000000000", "4000000000000000000", "18720000000000000000000", "0", "0"],
		  [startDate.toString(), endDate.toString(), midDate.toString()], //dates
		  ["1000000000000000000", "2000000000000000000"], //_buyLimits
		  "2", //access
		  ["2000000000000000000", "400000000000000000000", "1800"], //_liquidity
		  false//burn
	    );

	    const Campaign = await ethers.getContractFactory("Campaign");
	    //console.log(campaignAddres.value.toString());
	    const camIdxData = await myFactory.allCampaigns(
	      campaignAddres.value.toString()
	    );
	    const campaignInstance = await Campaign.attach(camIdxData.contractAddress);
	    //add address 2 to white list

	    // strange user call func to add him to whitelist
	    await expect(
	      campaignInstance.connect(addr2).appendWhitelisted([addr2.address])
	    ).to.be.revertedWith("Only campaign owner can call");

	    //campaign owner can add users to whilelist
	    await campaignInstance.connect(addr1).appendWhitelisted([addr2.address]);

	    //mint 10mil XYZ to campaign owner
	    await mockXYZ.connect(addr1).mint("10000000000000000000000000");

	    await mockXYZ
	      .connect(addr1)
	      .approve(camIdxData.contractAddress, "10000000000000000000000000000");

	    //campaing owner call fundIn()
	    await campaignInstance.connect(addr1).fundIn();
	    //only user2 can buy token b/c he's in whitelist
	    //User2 use 1BNB to buy, earn 4680 XYZ
	    await campaignInstance
	      .connect(addr2)
	      .buyTokens({ value: "1000000000000000000" });

	    await expect(
	      campaignInstance
	        .connect(addr3)
	        .buyTokens({ value: "1000000000000000000" })
	    ).to.be.revertedWith("You are not whitelisted");

	    //After midDate, user3 can join to buy
	    await ethers.provider.send("evm_increaseTime", [1810]);

	    await campaignInstance
	      .connect(addr3)
	      .buyTokens({ value: "1000000000000000000" });
	  });

	  it("Campaing is done, finishUp to withdraw BNB", async function () {
	    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

	    expect(await whiteListOnlyCampaign.collectedBNB()).to.equal(
	      "4000000000000000000"
	    );

	    await whiteListOnlyCampaign.connect(addr1).finishUp();

	    expect(await whiteListOnlyCampaign.finishUpSuccess()).to.equal(true);
	  });

	  it("Campaing is abort, when can't reach the softcap", async function () {
	    const [owner,addr1, addr4] = await ethers.getSigners();

	    const block = await ethers.provider.getBlock("latest");
	    console.log(block);

	    const startDate = new BigNumber(block.timestamp);
	    const endDate = startDate.plus(3600);
	    const midDate = startDate.plus(1800);

	    const campaignAddres = await myFactory.createCampaign(
	      mockXYZ.address, //token
		  "0",
	      addr1.address, //campaignOwner
		  ["2000000000000000000", "4000000000000000000", "18720000000000000000000", "0", "0"],
		  [startDate.toString(), endDate.toString(), midDate.toString()], //dates
		  ["1000000000000000000", "2000000000000000000"], //_buyLimits
		  "0", //access
		  ["2000000000000000000", "400000000000000000000", "1800"], //_liquidity
	      [false, true] //config
	    );

	    const Campaign = await ethers.getContractFactory("Campaign");

	    const camIdxData = await myFactory.allCampaigns(
	      campaignAddres.value.toString()
	    );
	    const campaignInstance = await Campaign.attach(camIdxData.contractAddress);

	    //mint 10mil XYZ to campaign owner
	    await mockXYZ.connect(addr1).mint("10000000000000000000000000");

	    await mockXYZ
	      .connect(addr1)
	      .approve(camIdxData.contractAddress, "10000000000000000000000000000");

	    //campaing owner call fundIn()
	    await campaignInstance.connect(addr1).fundIn();

	    expect((await mockXYZ.balanceOf(addr4.address)).toString()).to.equal(
	      "0"
	    );

	    //User2 use 1BNB to buy, earn 4680 XYZ
	    await campaignInstance
	      .connect(addr4)
	      .buyTokens({ value: "1000000000000000000" });

	    await ethers.provider.send("evm_mine", [endDate.plus(1).toNumber()]);

	    const block1 = await ethers.provider.getBlock("latest");
	    console.log(block1);

	    expect(await campaignInstance.isLive()).to.equal(false);

	    //user2 can refund
	    await mockXYZ.connect(addr4).approve(camIdxData.contractAddress, "4680000000000000000000");

	    await campaignInstance.connect(addr4).refund();

	    //get back eth, send token to campaign SC
	    expect((await mockXYZ.balanceOf(addr4.address)).toString()).to.equal("0");

	  });
});
