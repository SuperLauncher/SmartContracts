// SPDX-License-Identifier: agpl-3.0

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License


pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Interfaces.sol";
 
contract Campaign  {
    using Address for address;
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    address public factory;
    address public campaignOwner;
    address public token;
    uint256 public softCap;            
    uint256 public hardCap;  
    uint256 public tokenSalesQty;
    uint256 public feePcnt;
    uint256 public qualifyingTokenQty;
    uint256 public startDate;
    uint256 public endDate;
    uint256 public midDate;         // Start of public sales for WhitelistedFirstThenEveryone type
    uint256 public minBuyLimit;            
    uint256 public maxBuyLimit;    
    // Liquidity
    uint256 public lpBnbQty;    
    uint256 public lpTokenQty;
    uint256 public lpLockDuration; 
    // Config
    bool public burnUnSold;    
   
    // Misc variables //
    uint256 public unlockDate;
    uint256 public collectedBNB;
    uint256 public lpTokenAmount;

    // States
    bool public tokenFunded;        
    bool public finishUpSuccess; 
    bool public liquidityCreated;
    bool public cancelled;          

    // Map user address to amount invested in BNB //
    mapping(address => uint256) public participants; 
    uint256 public numOfParticipants;

    address public constant BURN_ADDRESS = address(0x000000000000000000000000000000000000dEaD);

    // Whitelisting support
    enum Accessibility {
        Everyone, 
        WhitelistedOnly, 
        WhitelistedFirstThenEveryone
    }
    Accessibility public accessibility;
    uint256 public numOfWhitelisted;
    mapping(address => bool) public whitelistedMap;
    
    // Events
    event Purchased(
        address indexed user,
        uint256 timeStamp,
        uint256 amountBnb,
        uint256 amountToken
    );

    event LiquidityAdded(
        uint256 amountBnb,
        uint256 amountToken,
        uint256 amountLPToken
    );

    event LiquidityLocked(
        uint256 timeStampStart,
        uint256 timeStampExpiry
    );

    event LiquidityWithdrawn(
        uint256 amount
    );

    event Refund(
        address indexed user,
        uint256 timeStamp,
        uint256 amountBnb,
        uint256 amountToken
    );


    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }

    modifier onlyCampaignOwner() {
        require(msg.sender == campaignOwner, "Only campaign owner can call");
        _;
    }

    constructor() public{
        factory = msg.sender;
    }
    
    /**
     * @dev Initialize  a new campaign.
     * @notice - Access control: External. Can only be called by the factory contract.
     */
    function initialize
    (
        address _token,
        address _campaignOwner,
        uint256[5] calldata _stats,  
        uint256[3] calldata _dates, 
        uint256[2] calldata _buyLimits,    
        Campaign.Accessibility _access,  
        uint256[3] calldata _liquidity, 
        bool _burnUnSold
    ) external
    {
        require(msg.sender == factory,'Only factory allowed to initialize');
        token = _token;
        campaignOwner = _campaignOwner; 
        softCap = _stats[0];
        hardCap = _stats[1];
        tokenSalesQty = _stats[2];
        feePcnt = _stats[3];
        qualifyingTokenQty = _stats[4];
        startDate = _dates[0];
        endDate = _dates[1];
        midDate = _dates[2];
        minBuyLimit = _buyLimits[0];
        maxBuyLimit = _buyLimits[1];
        accessibility = _access;
        lpBnbQty = _liquidity[0];
        lpTokenQty = _liquidity[1];
        lpLockDuration = _liquidity[2];
        burnUnSold = _burnUnSold;
    }
    
    /**
     * @dev Allows campaign owner to fund in his token.
     * @notice - Access control: External, OnlyCampaignOwner
     */
    function fundIn() external onlyCampaignOwner {
        require(!tokenFunded, "Campaign is already funded");
        uint256 amt = getCampaignFundInTokensRequired();
        require(amt > 0, "Invalid fund in amount");

        tokenFunded = true;
        ERC20(token).safeTransferFrom(msg.sender, address(this), amt);  
    }

    // In case of a "cancelled" campaign, or softCap not reached, 
    // the campaign owner can retrieve back his funded tokens.
    function fundOut() external onlyCampaignOwner {
        require(failedOrCancelled(), "Only failed or cancelled campaign can un-fund");
        sendAllTokensTo(campaignOwner);
        tokenFunded = false;
    }

    /**
     * @dev Allows user to buy token.
     * @notice - Access control: Public
     */
    function buyTokens() public payable {
        
        require(isLive(), "Campaign is not live");
        require(checkQualifyingTokens(msg.sender), "Insufficient LAUNCH tokens to qualify"); 
        require(checkWhiteList(msg.sender), "You are not whitelisted");

        // Check for min purchase amount
        require(msg.value >= minBuyLimit, "Less than minimum purchase amount");

        // Check for over purchase
        uint256 invested =  participants[msg.sender];
        require(invested.add(msg.value) <= maxBuyLimit, "Exceeded max amount"); 
        require(msg.value <= getRemaining(),"Insufficent token left");

        uint256 buyAmt = calculateTokenAmount(msg.value);
        ERC20(token).safeTransfer(msg.sender, buyAmt);
        
        if (invested == 0) {
            numOfParticipants = numOfParticipants.add(1);
        }

        participants[msg.sender] = participants[msg.sender].add(msg.value);
        collectedBNB = collectedBNB.add(msg.value);

        emit Purchased(msg.sender, block.timestamp, msg.value, buyAmt);
    }

    /**
     * @dev When a campaign reached the endDate, this function is called.
     * @dev Add liquidity to uniswap and burn the remaining tokens.
     * @dev Can be only executed when the campaign completes.
     * @dev Anyone can call. Only called once.
     * @notice - Access control: Public
     */
    function finishUp() public {
       
        require(!finishUpSuccess, "finishUp is already called");
        require(!isLive(), "Presale is still live");
        require(!failedOrCancelled(), "Presale failed or cancelled , can't call finishUp");
        require(softCap <= collectedBNB, "Did not reach soft cap");
        finishUpSuccess = true;

        uint256 feeAmt = getFeeAmt(collectedBNB);
        uint256 remainBNB = collectedBNB.sub(feeAmt);
        
        // If lpBnbQty, lpTokenQty is 0, we won't provide LP.
        if ((lpBnbQty > 0 && lpTokenQty > 0) && !liquidityCreated) {
        
            IFactoryGetters fact = IFactoryGetters(factory);
            address lpRouterAddress = fact.getLpRouter();
            ERC20(address(token)).approve(lpRouterAddress, lpTokenQty);
 
            remainBNB = remainBNB.sub(lpBnbQty);          

            (uint256 retTokenAmt, uint256 retBNBAmt, uint256 retLpTokenAmt) = IUniswapV2Router02(lpRouterAddress).addLiquidityETH
                {value : lpBnbQty}
                (address(token),
                lpTokenQty,
                0,
                0,
                address(this),
                block.timestamp + 100000000);
            
            lpTokenAmount = retLpTokenAmt;
            emit LiquidityAdded(retBNBAmt, retTokenAmt, retLpTokenAmt);
            
            liquidityCreated = true;
            unlockDate = (block.timestamp).add(lpLockDuration);
            emit LiquidityLocked(block.timestamp, unlockDate);
        }
        
        // Send fee to fee address
        if (feeAmt > 0) {
            (bool sentFee, ) = getFeeAddress().call{value: feeAmt}("");
            require(sentFee, "Failed to send Fee to platform");
        }

        // Send remain bnb to campaign owner
        (bool sentBnb, ) = campaignOwner.call{value: remainBNB}("");
        require(sentBnb, "Failed to send remain BNB to campaign owner");

        // Burn or return UnSold token to owner 
        sendAllTokensTo(burnUnSold ? BURN_ADDRESS : campaignOwner);       
    }

     /**
     * @dev Allows campaign owner to withdraw LP after the lock duration.
     * @dev Only able to withdraw LP if lockActivated and lock duration has expired.
     * @dev Can call multiple times to withdraw a portion of the total lp.
     * @param _lpToken - The LP token address
     * @notice - Access control: Internal, OnlyCampaignOwner
     */
    function withdrawLP(address _lpToken,uint256 _amount) public onlyCampaignOwner 
    {
        require(liquidityCreated, "liquidity is not yet created");
        require(block.timestamp >= unlockDate ,"Unlock date not reached");
        
        ERC20(_lpToken).safeTransfer(msg.sender, _amount);
        emit LiquidityWithdrawn( _amount);
    }

    /**
     * @dev Allows Participants to withdraw/refunds when campaign fails
     * @notice - Access control: Public
     */
    function refund() public {
        require(failedOrCancelled(),"Can refund for failed or cancelled campaign only");

        uint256 investAmt = participants[msg.sender];
        require(investAmt > 0 ,"You didn't participate in the campaign");

        uint256 returnTokenAmt = getReturnTokenAmt(msg.sender);
        participants[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: investAmt}("");
        require(ok, "Failed to refund BNB to user");

        // Participant need to transfer back their token to this contract. //
        ERC20(token).safeTransferFrom(msg.sender, address(this), returnTokenAmt);

        if (numOfParticipants > 0) {
            numOfParticipants -= 1;
        }

        emit Refund(msg.sender, block.timestamp, investAmt, returnTokenAmt);
    }

    /**
     * @dev To calculate the return token amount based on user's total invested BNB
     * @param _user - The user's wallet address
     * @return - The total amount of token
     * @notice - Access control: Internal
     */
     function getReturnTokenAmt(address _user) public view returns (uint256) {
        uint256 investAmt = participants[_user];
        return calculateTokenAmount(investAmt);
    }

    // Whitelisting Support 
    /**
     * @dev Allows campaign owner to append to the whitelisted addresses.
     * @param _addresses - Array of addresses
     * @notice - Access control: Public, OnlyCampaignOwner
     */
    function appendWhitelisted(address[] memory _addresses) public onlyCampaignOwner {
        uint256 len = _addresses.length;
        for (uint256 n=0; n<len; n++) {
            address a = _addresses[n];
            if (whitelistedMap[a] == false) {
                whitelistedMap[a] = true;
                numOfWhitelisted = numOfWhitelisted.add(1);
            }
        }
    }

    /**
     * @dev Allows campaign owner to remove from the whitelisted addresses.
     * @param _addresses - Array of addresses
     * @notice - Access control: Public, OnlyCampaignOwner
     */
    function removeWhitelisted(address[] memory _addresses) public onlyCampaignOwner {
        uint256 len = _addresses.length;
        for (uint256 n=0; n<len; n++) {
            address a = _addresses[n];
            if (whitelistedMap[a] == true) {
                whitelistedMap[a] = false;
                numOfWhitelisted = numOfWhitelisted.sub(1);
            }
        }
    }

    /**
     * @dev To check whether this address has accessibility to buy token
     * @param _address - The user's wallet address
     * @return - A bool value
     * @notice - Access control: Internal
     */
    function checkWhiteList(address _address) public view returns(bool){
        if (accessibility == Accessibility.Everyone) {
            return true;
        }
        
        // Either WhitelistedOnly or WhitelistedFirstThenEveryone
        bool ok = whitelistedMap[_address];
        if (accessibility == Accessibility.WhitelistedOnly) {
            return ok;
        } else {
            return (ok || block.timestamp >= midDate);
        }
    }
  
    // Helpers //
    /**
     * @dev To send all XYZ token to either campaign owner or burn address when campaign finishes or cancelled.
     * @param _to - The destination address
     * @notice - Access control: Internal
     */
    function sendAllTokensTo(address _to) internal {

        // Security: Can only be sent back to campaign owner or burned //
        require((_to == campaignOwner)||(_to == BURN_ADDRESS), "Can only be sent to campaign owner or burn address");

         // Burn or return UnSold token to owner 
        ERC20 ercToken = ERC20(token);
        uint256 all = ercToken.balanceOf(address(this));
        ercToken.safeTransfer(_to, all);
    } 
     
    /**
     * @dev To calculate the amount of fee in BNB
     * @param _amt - The amount in BNB
     * @return - The amount of fee in BNB
     * @notice - Access control: Internal
     */
    function getFeeAmt(uint256 _amt) internal view returns (uint256) {
        return _amt.mul(feePcnt).div(1e6);
    }

    /**
     * @dev To get the fee address
     * @return - The fee address
     * @notice - Access control: Internal
     */
    function getFeeAddress() internal view returns (address) {
        IFactoryGetters fact = IFactoryGetters(factory);
        return fact.getFeeAddress();
    }

    /**
     * @dev To check whether the campaign failed (softcap not met) or cancelled
     * @return - Bool value
     * @notice - Access control: Public
     */
    function failedOrCancelled() public view returns(bool) {
        if (cancelled) return true;
        
        return (block.timestamp >= endDate) && (softCap > collectedBNB) ;
    }

    /**
     * @dev To check whether the campaign is isLive? isLive means a user can still invest in the project.
     * @return - Bool value
     * @notice - Access control: Public
     */
    function isLive() public view returns(bool) {
        if (!tokenFunded || cancelled) return false;
        if((block.timestamp < startDate)) return false;
        if((block.timestamp >= endDate)) return false;
        if((collectedBNB >= hardCap)) return false;
        return true;
    }

    /**
     * @dev Calculate amount of token receivable.
     * @param _bnbInvestment - Amount of BNB invested
     * @return - The amount of token
     * @notice - Access control: Public
     */
    function calculateTokenAmount(uint256 _bnbInvestment) public view returns(uint256) {
        return _bnbInvestment.mul(tokenSalesQty).div(hardCap);
    }
    

    /**
     * @dev Gets remaining BNB to reach hardCap.
     * @return - The amount of BNB.
     * @notice - Access control: Public
     */
    function getRemaining() public view returns (uint256){
        return (hardCap).sub(collectedBNB);
    }
 

    /**
     * @dev Set a campaign as cancelled.
     * @notice - Access control: Public, OnlyFactory
     */
    function setCancelled() onlyFactory public {
        cancelled = true;
    }

    /**
     * @dev Calculate and return the Token amount need to be deposit by the project owner.
     * @return - The amount of token required
     * @notice - Access control: Public
     */
    function getCampaignFundInTokensRequired() public view returns(uint256) {
        return tokenSalesQty.add(lpTokenQty);
    }


       /**
     * @dev Check whether the user address has enough Launcher Tokens to participate in project.
     * @param _user - The address of user
     * @return - Bool result
     * @notice - Access control: External
     */  
    function checkQualifyingTokens(address _user) public  view returns(bool) {

        if (qualifyingTokenQty == 0) {
            return true;
        }

        IFactoryGetters fact = IFactoryGetters(factory);
        address launchToken = fact.getLauncherToken();
        
        IERC20 ercToken = IERC20(launchToken);
        uint256 balance = ercToken.balanceOf(_user);
        return (balance >= qualifyingTokenQty);
    }
}