import { Contract, ContractFactory } from 'ethers';
import { ethers } from 'hardhat';

async function main() {
  const name: string = 'VickreyAuction';

  const factory: ContractFactory = await ethers.getContractFactory(name);
  const contract: Contract = await factory.deploy();
  await contract.deployed();

  console.log(name + ' deployed to:', contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
