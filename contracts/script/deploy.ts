// contracts/script/deploy.ts

import { createPublicClient, http, createWalletClient, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import contractJson from '../out/TaskStaking.sol/TaskStaking.json'; // The compiled contract

// These are the arguments for your contract's constructor
const PLATFORM_WALLET_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Anvil's 2nd account
const MINIMUM_STAKE_IN_ETH = '0.01';

async function main() {
  // 1. Setup a Public Client
  // This client is used for read-only actions, like reading data from the blockchain.
  const publicClient = createPublicClient({
    chain: foundry, // Connect to the local Foundry/Anvil chain
    transport: http(), // Use standard HTTP transport
  });

  // 2. Setup a Wallet Client
  // This client is used for write actions, like sending transactions and deploying contracts.
  // We get the private key for the first Anvil account.
  // ⚠️ IMPORTANT: In a real app, never expose private keys like this!
  const deployerPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const deployerAccount = privateKeyToAccount(deployerPrivateKey);

  const walletClient = createWalletClient({
    account: deployerAccount,
    chain: foundry,
    transport: http(),
  });

  console.log(`Deployer address: ${walletClient.account.address}`);
  const balance = await publicClient.getBalance({ address: walletClient.account.address });
  console.log(`Deployer balance: ${formatEther(balance)} ETH`);
  console.log(`\nDeploying TaskStaking contract...`);
  console.log(`  Platform Wallet: ${PLATFORM_WALLET_ADDRESS}`);
  console.log(`  Minimum Stake: ${MINIMUM_STAKE_IN_ETH} ETH`);

  // 3. Deploy the contract
  const hash = await walletClient.deployContract({
    abi: contractJson.abi,
    bytecode: contractJson.bytecode.object as `0x${string}`,
    args: [PLATFORM_WALLET_ADDRESS, BigInt(parseFloat(MINIMUM_STAKE_IN_ETH) * 1e18)],
  });

  console.log(`\nTransaction sent! Hash: ${hash}`);
  console.log('Waiting for transaction to be mined...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error('Contract address not found in receipt.');
  }

  console.log('✅ Contract deployed successfully!');
  console.log(`Contract Address: ${receipt.contractAddress}`);
}

main().catch((error) => {
  console.error('Deployment failed:', error);
  process.exit(1);
});