// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Vickrey Auction
 * cspell:disable-next-line
 * @author Emir Güvenni
 */
contract VickreyAuction is Context {
    // libraries
    using Address for address;
    using Counters for Counters.Counter;

    address private _owner;

    Counters.Counter private _auctionCounter;

    uint256 public auctionFee = 0.01 ether;
    uint256 public entranceFee = 0.001 ether;

    uint8 public constant MIN_AUCTION_NAME_LEN = 3;
    uint8 public constant MAX_AUCTION_NAME_LEN = 32;

    // structs
    struct Bid {
        address from;
        uint256 itemId;
        uint256 amount;
        uint256 amountToBePaid;
        bool isWinner;
    }

    struct Item {
        string description;
        Bid[] bids;
        address winner;
    }

    struct Participant {
        bool hasWithdrawn;
        bool isParticipant;
    }

    struct Auction {
        string name;
        Item[] items;
        mapping(address => Participant) participants;
        address payable creator;
        uint256 startsAt;
        uint256 endsAt;
        bool isConcluded;
    }

    // mappings
    mapping(uint256 => Auction) private _auctions;

    // events
    /**
     * @param auctionId The id of the auction
     * @param creator The address of the auction creator
     * @param startsAt The start time of the auction
     * @param endsAt The end time of the auction
     */
    event NewAuction(uint256 indexed auctionId, address indexed creator, uint256 startsAt, uint256 endsAt);

    /**
     * @param auctionId The id of the auction
     * @param participant The address of the participant
     */
    event NewParticipant(uint256 indexed auctionId, address indexed participant);

    /**
     * @param auctionId The id of the auction
     * @param creator The address of the auction creator
     */
    event AuctionConcluded(uint256 indexed auctionId, address indexed creator);

    /**
     * @param auctionId The id of the auction
     * @param item The description of the item
     */
    event AddedItem(uint256 indexed auctionId, string item);

    /**
     * @param auctionId The id of the auction
     * @param item The description of the remove item
     */
    event RemovedItem(uint256 indexed auctionId, string item);

    // modifiers
    modifier onlyOwner() {
        require(_msgSender() == _owner, "Caller is not the owner");
        _;
    }

    modifier onlyCreator(uint256 auctionId) {
        require(_msgSender() == _auctions[auctionId].creator, "Caller is not the creator");
        _;
    }

    modifier onlyParticipant() {
        require(_auctions[0].participants[_msgSender()].isParticipant, "Caller is not a participant");
        _;
    }

    modifier validAuctionId(uint256 auctionId) {
        Auction storage auction = _auctions[auctionId];
        require(auction.creator != address(0), "Invalid auction id");
        _;
    }

    modifier mustBeStarted(uint256 auctionId) {
        // solhint-disable-next-line not-rely-on-time
        require(_auctions[auctionId].startsAt <= block.timestamp, "Auction hasn't started yet");
        _;
    }

    modifier mustBeEnded(uint256 auctionId) {
        // solhint-disable-next-line not-rely-on-time
        require(_auctions[auctionId].endsAt <= block.timestamp, "Auction hasn't ended yet");
        _;
    }

    modifier mustBeNotStarted(uint256 auctionId) {
        // solhint-disable-next-line not-rely-on-time
        require(_auctions[auctionId].startsAt > block.timestamp, "Auction has already started");
        _;
    }

    modifier mustBeNotEnded(uint256 auctionId) {
        // solhint-disable-next-line not-rely-on-time
        require(_auctions[auctionId].endsAt > block.timestamp, "Auction has already ended");
        _;
    }

    function getAuction(uint256 auctionId)
        public
        view
        validAuctionId(auctionId)
        returns (
            string memory name,
            address creator,
            uint256 startsAt,
            uint256 endsAt,
            bool isConcluded,
            Item[] memory items
        )
    {
        Auction storage auction = _auctions[auctionId];

        return (auction.name, auction.creator, auction.startsAt, auction.endsAt, auction.isConcluded, auction.items);
    }

    function createAuction(
        string memory name,
        uint256 startsAt,
        uint256 endsAt
    ) external payable {
        require(bytes(name).length >= MIN_AUCTION_NAME_LEN, "Name is too short");
        require(bytes(name).length <= MAX_AUCTION_NAME_LEN, "Name is too long");

        // solhint-disable-next-line not-rely-on-time
        require(startsAt > block.timestamp, "Start time must be in the future");

        // solhint-disable-next-line not-rely-on-time
        // solhint-disable-next-line reason-string
        require(endsAt > startsAt, "End time must be after start time");

        require(msg.value >= auctionFee, "Insufficient auction fee");

        uint256 auctionId = _auctionCounter.current();
        _auctionCounter.increment();

        Auction storage auction = _auctions[auctionId];

        auction.name = name;
        auction.creator = payable(_msgSender());
        auction.startsAt = startsAt;
        auction.endsAt = endsAt;

        emit NewAuction(auctionId, _msgSender(), startsAt, endsAt);
    }

    function addItem(uint256 auctionId, string memory description)
        external
        validAuctionId(auctionId)
        onlyCreator(auctionId)
        mustBeNotStarted(auctionId)
        mustBeNotEnded(auctionId)
    {
        Auction storage auction = _auctions[auctionId];
        Item storage item = auction.items[auction.items.length];
        item.description = description;
    }

    function removeItem(uint256 auctionId, uint256 itemId)
        external
        validAuctionId(auctionId)
        onlyCreator(auctionId)
        mustBeNotStarted(auctionId)
        mustBeNotEnded(auctionId)
    {
        delete _auctions[auctionId].items[itemId];
    }

    function joinAuction(uint256 auctionId)
        external
        payable
        validAuctionId(auctionId)
        mustBeNotStarted(auctionId)
        mustBeNotEnded(auctionId)
    {
        require(msg.value >= entranceFee, "Insufficient participation fee");

        Auction storage auction = _auctions[auctionId];
        address sender = _msgSender();

        require(!auction.participants[sender].isParticipant, "Already joined");

        auction.participants[sender] = Participant({ hasWithdrawn: false, isParticipant: true });
    }

    function placeBid(uint256 auctionId, uint256 itemId)
        external
        payable
        validAuctionId(auctionId)
        onlyParticipant
        mustBeStarted(auctionId)
        mustBeNotEnded(auctionId)
    {
        address bidder = _msgSender();
        Auction storage auction = _auctions[auctionId];

        Bid storage bid = auction.items[itemId].bids[auction.items[itemId].bids.length];

        bid.from = bidder;
        bid.amount = msg.value;
        bid.itemId = itemId;
    }

    function concludeAuction(uint256 auctionId) external validAuctionId(auctionId) onlyOwner mustBeEnded(auctionId) {
        Auction storage auction = _auctions[auctionId];
        uint256 amountToBePaidToCreator = 0;

        require(!auction.isConcluded, "Auction already concluded");

        for (uint256 i = 0; i < auction.items.length; i++) {
            Item storage item = auction.items[i];

            if (item.bids.length == 0) continue;

            Bid storage winnerBid = item.bids[0];
            uint256 bidAmount = winnerBid.amount;

            // Find the winner
            // Starts at index 1 since 0 is already assigned to winnerBid
            for (uint256 j = 1; j < item.bids.length; j++) {
                Bid storage bid = item.bids[j];

                if (bid.amount > winnerBid.amount) {
                    bidAmount = winnerBid.amount;
                    winnerBid = bid;
                }
            }

            winnerBid.isWinner = true;
            winnerBid.amountToBePaid = bidAmount;
            amountToBePaidToCreator += bidAmount;
        }

        auction.creator.transfer(amountToBePaidToCreator);
        auction.isConcluded = true;
    }

    function withdrawLeftovers(uint256 auctionId) external payable validAuctionId(auctionId) onlyParticipant {
        address payable sender = payable(_msgSender());
        Auction storage auction = _auctions[auctionId];
        Participant storage participant = auction.participants[sender];
        uint256 amount = 0;

        require(!participant.hasWithdrawn, "Already withdrawn");

        for (uint256 i = 0; i < auction.items.length; i++) {
            Item storage item = auction.items[i];

            for (uint256 j = 0; j < item.bids.length; j++) {
                Bid storage bid = item.bids[j];

                if (bid.from != sender) continue;

                if (bid.isWinner) amount += bid.amount - bid.amountToBePaid;
                else amount += bid.amount;
            }
        }

        sender.transfer(amount);
        participant.hasWithdrawn = true;
    }
}
