const { expect } = require("chai");
const { ethers } = require("hardhat");
const { smoddit, smockit } = require("@eth-optimism/smock");
const BigNumber = require("bignumber.js");

describe("Factory", function () {
  let myFactory;
  let mockXYZ;
  let bscLauncherToken;
  let campaign;
  beforeEach(async () => {
    const MockXYZ = await ethers.getContractFactory("MockXYZ");
    mockXYZ = await MockXYZ.deploy();
    await mockXYZ.deployed();

    const BscLauncherToken = await ethers.getContractFactory(
      "BscLauncherToken"
    );
    bscLauncherToken = await BscLauncherToken.deploy();
    await bscLauncherToken.deployed();
  });

  it("Should create factory successfully", async function () {
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

    // getFeeAddress

    expect(await myFactory.getFeeAddress()).to.equal(feeVault.address);
    //getLpRouter

    expect(await myFactory.getLpRouter()).to.equal(mockUniswapV2Router02.address);

    //owner 
    expect(await myFactory.owner()).to.equal(owner.address);
  });

});
