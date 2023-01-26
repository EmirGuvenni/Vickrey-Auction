import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
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

  describe('creating an auction', () => {
    it('should be able to create auction', async () => {
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const startsAt = new Date('2019').getTime() / 1000; // Milliseconds to seconds
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      ).to.be.revertedWith('Invalid start time');
    });

    it('should not be able to create auction with invalid end time', async () => {
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = new Date('2019').getTime() / 1000; // Milliseconds to seconds

      const auctionFee = await vickreyAuction.auctionFee();

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      ).to.be.revertedWith('Invalid end time');
    });

    it('should not be able to create auction with short name', async () => {
      const auctionName = 'My';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      await expect(
        vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      ).to.be.revertedWith('Name is too short');
    });

    it('should not be able to create auction with long name', async () => {
      const auctionName = 'My long auction name that is too long';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];

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
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const item = 'BMW Z4';

      await expect(vickreyAuction.connect(owner).addItem(0, item))
        .to.emit(vickreyAuction, 'AddedItem')
        .withArgs(0, item);

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(owner).addItem(0, item)
        ).to.be.revertedWith('Auction has already started');
      }, 1000);
    });

    it('should not be able to add items to auction that has already ended', async () => {
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const item = 'BMW Z4';

      await expect(vickreyAuction.connect(owner).addItem(0, item))
        .to.emit(vickreyAuction, 'AddedItem')
        .withArgs(0, item);

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(owner).addItem(0, item)
        ).to.be.revertedWith('Auction has already ended');
      }, 2000);
    });

    it('should not be able to add items by non-owner', async () => {
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const item = 'BMW Z4';

      await expect(
        vickreyAuction.connect(addresses[0]).addItem(0, item)
      ).to.be.revertedWith('Caller is not the creator');
    });

    it('should be able to remove items', async () => {
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];

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
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];

      for (const item of items) {
        await expect(vickreyAuction.connect(owner).addItem(0, item))
          .to.emit(vickreyAuction, 'AddedItem')
          .withArgs(0, item);
      }

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(owner).removeItem(0, 0)
        ).to.be.revertedWith('Auction has already started');
      }, 1000);
    });

    it('should not be able to remove items from auction that has already ended', async () => {
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];

      for (const item of items) {
        await expect(vickreyAuction.connect(owner).addItem(0, item))
          .to.emit(vickreyAuction, 'AddedItem')
          .withArgs(0, item);
      }

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(owner).removeItem(0, 0)
        ).to.be.revertedWith('Auction has already ended');
      }, 2000);
    });

    it('should not be able to remove items by non-owner', async () => {
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();

      expect(
        await vickreyAuction
          .connect(owner)
          .createAuction(auctionName, startsAt, endsAt, { value: auctionFee })
      )
        .to.emit(vickreyAuction, 'AuctionCreated')
        .withArgs(0, owner.address);

      const items = ['BMW Z4', 'Honda S2000', 'Mazda Miata'];

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
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const participant = addresses[0];
      const entranceFee = await vickreyAuction.entranceFee();

      await expect(
        vickreyAuction.connect(participant).joinAuction(0, {
          value: entranceFee,
        })
      ).to.be.revertedWith('Invalid auction id');
    });

    it('should not be able to join auction that has already started', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(participant).joinAuction(0, {
            value: entranceFee,
          })
        ).to.be.revertedWith('Auction has already started');
      }, 1000);
    });

    it('should not be able to join auction that has already ended', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(participant).joinAuction(0, {
            value: entranceFee,
          })
        ).to.be.revertedWith('Auction has already ended');
      }, 2000);
    });

    it('should not be able to join auction with insufficient funds', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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

      setTimeout(async () => {
        expect(
          await vickreyAuction
            .connect(participant)
            .placeBid(0, 0, { value: 1000 })
        )
          .to.emit(vickreyAuction, 'Bid')
          .withArgs(0, participant.address, 0, 1000);
      }, 200);
    });

    it('should not be able to bid in non-existent auction', async () => {
      const participant = addresses[0];

      await expect(
        vickreyAuction.connect(participant).placeBid(0, 0, { value: 1000 })
      ).to.be.revertedWith('Invalid auction id');
    });

    it("should not be able to bid in auction that hasn't started yet", async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(participant).placeBid(0, 0, { value: 1000 })
        ).to.be.revertedWith('Auction has already ended');
      }, 2000);
    });

    it('should not be able to bid with insufficient funds', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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

      setTimeout(async () => {
        await expect(
          vickreyAuction.connect(participant).placeBid(0, 0, { value: 0 })
        ).to.be.revertedWith('Insufficient bid amount');
      }, 200);
    });

    it('should not be able to bid in auction that they are not participating in', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

      const auctionFee = await vickreyAuction.auctionFee();
      const entranceFee = await vickreyAuction.entranceFee();

      await vickreyAuction
        .connect(owner)
        .createAuction(auctionName, startsAt, endsAt, {
          value: auctionFee,
        });

      const initialOwnerBalance = await owner.getBalance();

      await vickreyAuction.connect(participant).joinAuction(0, {
        value: entranceFee,
      });

      setTimeout(async () => {
        await vickreyAuction.connect(participant).placeBid(0, 0, {
          value: 1000,
        });

        expect(await vickreyAuction.connect(owner).concludeAuction(0))
          .to.emit(vickreyAuction, 'AuctionConcluded')
          .withArgs(0, 1000);

        expect(await owner.getBalance()).to.be.gt(initialOwnerBalance);
      }, 2000);
    });

    it('should not be able to conclude an auction that has not ended yet', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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

      setTimeout(async () => {
        await vickreyAuction.connect(participant).placeBid(0, 0, {
          value: 1000,
        });

        await expect(
          vickreyAuction.connect(owner).concludeAuction(0)
        ).to.be.revertedWith('Auction has not ended yet');
      }, 1000);
    });

    it('should not be able to conclude an auction that has already been concluded', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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

      setTimeout(async () => {
        await vickreyAuction.connect(participant).placeBid(0, 0, {
          value: 1000,
        });

        await vickreyAuction.connect(owner).concludeAuction(0);

        await expect(
          vickreyAuction.connect(owner).concludeAuction(0)
        ).to.be.revertedWith('Auction has already been concluded');
      }, 2000);
    });

    it('should not be able to conclude an auction that does not exist', async () => {
      await expect(
        vickreyAuction.connect(owner).concludeAuction(0)
      ).to.be.revertedWith('Invalid auction id');
    });

    it('should not be able to conclude an auction that they are not the owner of', async () => {
      const participant = addresses[0];
      const auctionName = 'My Auction';
      const startsAt = Date.now();
      const endsAt = Date.now() + 1000;

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

      setTimeout(async () => {
        await vickreyAuction.connect(participant).placeBid(0, 0, {
          value: 1000,
        });

        await expect(
          vickreyAuction.connect(participant).concludeAuction(0)
        ).to.be.revertedWith('Caller is not the owner');
      }, 2000);
    });
  });
});
