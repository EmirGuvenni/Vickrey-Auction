import { time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

// eslint-disable-next-line node/no-missing-import
import { VickreyAuction, VickreyAuction__factory } from '../typechain-types';

describe('VickreyAuction', () => {
  let vickreyAuction: VickreyAuction;
  let vickreyAuctionFactory: VickreyAuction__factory;
  let owner: SignerWithAddress;
  let participant: SignerWithAddress;
  let addresses: SignerWithAddress[];

  let now: number;
  let startsAt: number;
  let endsAt: number;

  before(async () => {
    [owner, participant, ...addresses] = await ethers.getSigners();
    vickreyAuctionFactory = (await ethers.getContractFactory(
      'VickreyAuction'
    )) as VickreyAuction__factory;
  });

  beforeEach(async () => {
    vickreyAuction = await vickreyAuctionFactory.deploy();

    now = await time.latest();
    startsAt = now + 1000;
    endsAt = startsAt + 1000;
  });

  describe('creating an auction', () => {
    it('should be able to create auction', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address, startsAt, endsAt);

      const auction = await vickreyAuction.getAuction(0);
      expect(auction.name).to.equal(auctionName);
      expect(auction.creator).to.equal(owner.address);
      expect(auction.startsAt).to.equal(startsAt);
      expect(auction.endsAt).to.equal(endsAt);
    });

    it('should not be able to create auction with invalid fee', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const invalidFee = auctionFee.sub(1);

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: invalidFee })
      ).to.be.revertedWith('Insufficient auction fee');
    });

    it('should not be able to create auction with invalid start time', async () => {
      const auctionName = 'My Auction';

      const auctionFee = await vickreyAuction.auctionFee();

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt - 9001, endsAt, {
            value: auctionFee,
          })
      ).to.be.revertedWith('Invalid start time');
    });

    it('should not be able to create auction with invalid end time', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt - 9001, {
            value: auctionFee,
          })
      ).to.be.revertedWith('Invalid end time');
    });

    it('should not be able to create auction with short name', async () => {
      const auctionName = 'My';
      const auctionFee = await vickreyAuction.auctionFee();

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      ).to.be.revertedWith('Name is too short');
    });

    it('should not be able to create auction with long name', async () => {
      const auctionName = 'My long auction name that is too long';
      const auctionFee = await vickreyAuction.auctionFee();

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      ).to.be.revertedWith('Name is too long');
    });
  });

  describe('editing items', () => {
    it('should be able to add items', async () => {
      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      for (const item of items) {
        await expect(vickreyAuction.connect(owner).addItem(0, item))
          .to.emit(vickreyAuction, 'AddedItem')
          .withArgs(0, item);
      }

      const auction = await vickreyAuction.getAuction(0);
      expect(auction.items.length).to.equal(items.length);

      auction.items.forEach((item: any, index: number) => {
        expect(item.description).to.equal(items[index]);
      });
    });

    it('should not be able to add items to non-existent auction', async () => {
      const item = 'BMW Z4';

      await expect(
        vickreyAuction.connect(owner).addItem(0, item)
      ).to.be.revertedWith('Invalid auction id');
    });

    it('should not be able to add items to auction that has already started', async () => {
      const item = 'BMW Z4';
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      await expect(vickreyAuction.connect(owner).addItem(0, item))
        .to.emit(vickreyAuction, 'AddedItem')
        .withArgs(0, item);

      await time.increaseTo(startsAt + 1);

      await expect(
        vickreyAuction.connect(owner).addItem(0, item)
      ).to.be.revertedWith('Auction has already started');
    });

    it('should not be able to add items to auction that has already ended', async () => {
      const item = 'BMW Z4';
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      await expect(vickreyAuction.connect(owner).addItem(0, item))
        .to.emit(vickreyAuction, 'AddedItem')
        .withArgs(0, item);

      await time.increaseTo(endsAt + 1);

      await expect(
        vickreyAuction.connect(owner).addItem(0, item)
      ).to.be.revertedWith('Auction has already ended');
    });

    it('should not be able to add items by non-owner', async () => {
      const item = 'BMW Z4';
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      await expect(
        vickreyAuction.connect(addresses[0]).addItem(0, item)
      ).to.be.revertedWith('Caller is not the creator');
    });

    it('should be able to remove items', async () => {
      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      for (const item of items) {
        await expect(vickreyAuction.connect(owner).addItem(0, item))
          .to.emit(vickreyAuction, 'AddedItem')
          .withArgs(0, item);
      }

      await expect(vickreyAuction.connect(owner).removeItem(0, 0))
        .to.emit(vickreyAuction, 'RemovedItem')
        .withArgs(0, items[0]);

      const auction = await vickreyAuction.getAuction(0);
      expect(auction.items.length).to.equal(items.length - 1);
    });

    it('should not be able to remove items from non-existent auction', async () => {
      await expect(
        vickreyAuction.connect(owner).removeItem(0, 0)
      ).to.be.revertedWith('Invalid auction id');
    });

    it('should not be able to remove items from auction that has already started', async () => {
      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      for (const item of items) {
        await expect(vickreyAuction.connect(owner).addItem(0, item))
          .to.emit(vickreyAuction, 'AddedItem')
          .withArgs(0, item);
      }

      await time.increaseTo(startsAt + 1);

      await expect(
        vickreyAuction.connect(owner).removeItem(0, 0)
      ).to.be.revertedWith('Auction has already started');
    });

    it('should not be able to remove items from auction that has already ended', async () => {
      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      for (const item of items) {
        await expect(vickreyAuction.connect(owner).addItem(0, item))
          .to.emit(vickreyAuction, 'AddedItem')
          .withArgs(0, item);
      }

      await time.increaseTo(endsAt + 1);

      await expect(
        vickreyAuction.connect(owner).removeItem(0, 0)
      ).to.be.revertedWith('Auction has already ended');
    });

    it('should not be able to remove items by non-owner', async () => {
      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      for (const item of items) {
        await expect(vickreyAuction.connect(owner).addItem(0, item))
          .to.emit(vickreyAuction, 'AddedItem')
          .withArgs(0, item);
      }

      await expect(
        vickreyAuction.connect(addresses[0]).removeItem(0, 0)
      ).to.be.revertedWith('Caller is not the creator');
    });
  });

  describe('joining an auction', () => {
    it('participants should be able to join', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      expect(
        await vickreyAuction.connect(participant).joinAuction(0, {
          value: entranceFee,
        })
      )
        .to.emit(vickreyAuction, 'NewParticipant')
        .withArgs(0, participant.address);
    });

    it('should not be able to join non-existent auction', async () => {
      const entranceFee = await vickreyAuction.entranceFee();

      await expect(
        vickreyAuction.connect(participant).joinAuction(0, {
          value: entranceFee,
        })
      ).to.be.revertedWith('Invalid auction id');
    });

    it('should not be able to join auction that has already started', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await time.increaseTo(startsAt + 1);

      await expect(
        vickreyAuction.connect(participant).joinAuction(0, {
          value: entranceFee,
        })
      ).to.be.revertedWith('Auction has already started');
    });

    it('should not be able to join auction that has already ended', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await time.increaseTo(endsAt + 1);

      await expect(
        vickreyAuction.connect(participant).joinAuction(0, {
          value: entranceFee,
        })
      ).to.be.revertedWith('Auction has already ended');
    });

    it('should not be able to join auction with insufficient funds', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await expect(
        vickreyAuction.connect(participant).joinAuction(0, {
          value: 0,
        })
      ).to.be.revertedWith('Insufficient participation fee');
    });

    it('should not be able to join auction twice', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await expect(
        vickreyAuction.connect(participant).joinAuction(0, {
          value: entranceFee,
        })
      ).to.be.revertedWith('Already joined');
    });
  });

  describe('bidding in an auction', () => {
    it('participants should be able to bid', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      expect(
        await vickreyAuction
          .connect(participant)
          .placeBid(0, 0, { value: 1000 })
      )
        .to.emit(vickreyAuction, 'Bid')
        .withArgs(0, participant.address, 0, 1000);
    });

    it('should not be able to bid in non-existent auction', async () => {
      await expect(
        vickreyAuction.connect(participant).placeBid(0, 0, { value: 1000 })
      ).to.be.revertedWith('Invalid auction id');
    });

    it('should not be able to bid in non-existent item', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await expect(
        vickreyAuction.connect(participant).placeBid(0, 1, { value: 1000 })
      ).to.be.revertedWith('Invalid item id');
    });

    it("should not be able to bid in auction that hasn't started yet", async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await expect(
        vickreyAuction.connect(participant).placeBid(0, 0, { value: 1000 })
      ).to.be.revertedWith("Auction hasn't started yet");
    });

    it('should not be able to bid in auction that has ended', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(endsAt + 1);

      await expect(
        vickreyAuction.connect(participant).placeBid(0, 0, { value: 1000 })
      ).to.be.revertedWith('Auction has already ended');
    });

    it('should not be able to bid with insufficient funds', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await expect(
        vickreyAuction.connect(participant).placeBid(0, 0, { value: 0 })
      ).to.be.revertedWith('Insufficient bid amount');
    });

    it('should not be able to bid in auction that they are not participating in', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await expect(
        vickreyAuction.connect(participant).placeBid(0, 0, { value: 1000 })
      ).to.be.revertedWith('Caller is not a participant');
    });
  });

  describe('concluding an auction', () => {
    it('should be able to conclude an auction', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      const participant2 = addresses.pop()!;
      const participant3 = addresses.pop()!;

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      const initialOwnerBalance = await owner.getBalance();

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });
      await vickreyAuction.connect(participant2).joinAuction(0, {
        value: entranceFee,
      });
      await vickreyAuction.connect(participant3).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: ethers.utils.parseEther('3'),
      });
      await vickreyAuction.connect(participant2).placeBid(0, 0, {
        value: ethers.utils.parseEther('4'),
      });
      await vickreyAuction.connect(participant3).placeBid(0, 0, {
        value: ethers.utils.parseEther('5'),
      });

      await time.increaseTo(endsAt + 1);

      expect(await vickreyAuction.connect(owner).concludeAuction(0))
        .to.emit(vickreyAuction, 'AuctionConcluded')
        .withArgs(0, 1000);

      expect(await owner.getBalance()).to.be.gt(initialOwnerBalance);
    });

    it('should not be able to conclude an auction that has not ended yet', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: 1000,
      });

      await expect(
        vickreyAuction.connect(owner).concludeAuction(0)
      ).to.be.revertedWith("Auction hasn't ended yet");
    });

    it('should not be able to conclude an auction that has already been concluded', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: ethers.utils.parseEther('1'),
      });

      await time.increaseTo(endsAt + 1);

      await vickreyAuction.connect(owner).concludeAuction(0);

      await expect(
        vickreyAuction.connect(owner).concludeAuction(0)
      ).to.be.revertedWith('Auction already concluded');
    });

    it('should not be able to conclude an auction that does not exist', async () => {
      await expect(
        vickreyAuction.connect(owner).concludeAuction(0)
      ).to.be.revertedWith('Invalid auction id');
    });

    it('should not be able to conclude an auction that they are not the creator of', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: ethers.utils.parseEther('1'),
      });

      await time.increaseTo(endsAt + 1);

      await expect(
        vickreyAuction.connect(participant).concludeAuction(0)
      ).to.be.revertedWith('Caller is not the creator');
    });
  });

  describe('withdrawing leftover funds', () => {
    it('should be able to withdraw leftover funds', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      const participant2 = addresses.pop()!;

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });
      await vickreyAuction.connect(participant2).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: ethers.utils.parseEther('1'),
      });
      await vickreyAuction.connect(participant2).placeBid(0, 0, {
        value: ethers.utils.parseEther('2'),
      });

      await time.increaseTo(endsAt + 1);

      await vickreyAuction.connect(owner).concludeAuction(0);

      const participantInitialBalance = await participant.getBalance();
      await vickreyAuction.connect(participant).withdrawLeftovers(0);
      expect(await participant.getBalance()).to.be.gt(
        participantInitialBalance
      );

      const participant2InitialBalance = await participant2.getBalance();
      await vickreyAuction.connect(participant2).withdrawLeftovers(0);
      expect(await participant2.getBalance()).to.be.gt(
        participant2InitialBalance
      );
    });

    it('should not be able to withdraw leftover funds twice', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      const participant2 = addresses.pop()!;

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });
      await vickreyAuction.connect(participant2).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: ethers.utils.parseEther('1'),
      });
      await vickreyAuction.connect(participant2).placeBid(0, 0, {
        value: ethers.utils.parseEther('2'),
      });

      await time.increaseTo(endsAt + 1);

      await vickreyAuction.connect(owner).concludeAuction(0);

      await vickreyAuction.connect(participant).withdrawLeftovers(0);

      await expect(
        vickreyAuction.connect(participant).withdrawLeftovers(0)
      ).to.be.revertedWith('Already withdrawn');
    });

    it('should not be able to withdraw leftover funds if they are not a participant', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      const participant2 = addresses.pop()!;

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });
      await vickreyAuction.connect(participant2).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: ethers.utils.parseEther('1'),
      });
      await vickreyAuction.connect(participant2).placeBid(0, 0, {
        value: ethers.utils.parseEther('2'),
      });

      await time.increaseTo(endsAt + 1);

      await vickreyAuction.connect(owner).concludeAuction(0);

      await expect(
        vickreyAuction.connect(owner).withdrawLeftovers(0)
      ).to.be.revertedWith('Caller is not a participant');
    });

    it('should not be able to withdraw leftover funds if the auction has not been concluded', async () => {
      const auctionName = 'My Auction';
      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      const participant2 = addresses.pop()!;

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      await vickreyAuction.connect(owner).addItem(0, 'Item 1');

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });
      await vickreyAuction.connect(participant2).joinAuction(0, {
        value: entranceFee,
      });

      await time.increaseTo(startsAt + 1);

      await vickreyAuction.connect(participant).placeBid(0, 0, {
        value: ethers.utils.parseEther('1'),
      });
      await vickreyAuction.connect(participant2).placeBid(0, 0, {
        value: ethers.utils.parseEther('2'),
      });

      await expect(
        vickreyAuction.connect(participant).withdrawLeftovers(0)
      ).to.be.revertedWith('Auction not concluded');
    });
  });
});
