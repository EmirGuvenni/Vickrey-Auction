import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect, assert } from 'chai';
import { constants, BigNumber } from 'ethers';
import { ethers } from 'hardhat';

// eslint-disable-next-line node/no-missing-import
import { VickreyAuction, VickreyAuction__factory } from '../typechain-types';

describe('VickreyAuction', () => {
  let vickreyAuction: VickreyAuction;
  let vickreyAuctionFactory: VickreyAuction__factory;
  let owner: SignerWithAddress;
  let addresses: SignerWithAddress[];

  before(async () => {
    [owner, ...addresses] = await ethers.getSigners();
    vickreyAuctionFactory = (await ethers.getContractFactory(
      'VickreyAuction'
    )) as VickreyAuction__factory;
  });

  beforeEach(async () => {
    vickreyAuction = await vickreyAuctionFactory.deploy();
  });

  it('should be able to create auction', async () => {
    const auctionName = 'My Auction';
    const startsAt = Date.now();
    const endsAt = Date.now() + 1000;

    expect(
      await vickreyAuction.createAuction(auctionName, startsAt, endsAt, {
        value: ethers.utils.parseEther('0.01'),
        from: owner.address,
      })
    )
      .to.emit(vickreyAuction, 'AuctionCreated')
      .withArgs(0, owner.address, startsAt, endsAt);

    const auction = await vickreyAuction.getAuction(0);
    expect(auction.name).to.equal(auctionName);
    expect(auction.creator).to.equal(owner.address);
    expect(auction.startsAt).to.equal(startsAt);
    expect(auction.endsAt).to.equal(endsAt);
  });
});
