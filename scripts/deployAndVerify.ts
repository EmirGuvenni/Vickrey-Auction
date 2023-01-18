// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { Contract, ContractFactory } from 'ethers';
import { ethers, tenderly, run } from 'hardhat';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const vickreyAuctionContractName: string = 'VickreyAuction';
  const vickreyAuctionFactory: ContractFactory =
    await ethers.getContractFactory(vickreyAuctionContractName);
  const vickreyAuction: Contract = await vickreyAuctionFactory.deploy();
  await vickreyAuction.deployed();
  console.log(
    vickreyAuctionContractName + ' deployed to:',
    vickreyAuction.address
  );

  await setTimeout(async () => {
    // verify contracts on explorer
    await run('verify:verify', {
      address: vickreyAuction.address,
    });

    // send notice to tenderly for contracts
    await tenderly.verify({
      name: vickreyAuctionContractName,
      address: vickreyAuction.address,
    });
  }, 1000 * 60); // 60 secs
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
