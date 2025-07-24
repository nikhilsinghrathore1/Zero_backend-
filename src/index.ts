// src/index.ts

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { drizzle } from 'drizzle-orm/neon-http';
import { usersTable } from './db/schema';
import { eq, sql } from 'drizzle-orm';

// --- VIEM/BLOCKCHAIN IMPORTS ---
import { createPublicClient, http, createWalletClient, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import contractJson from '../contracts/out/TaskStaking.sol/TaskStaking.json';

// ---!! IMPORTANT: PASTE YOUR DEPLOYED CONTRACT ADDRESS HERE !! ---
const CONTRACT_ADDRESS = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

// --- SETUP VIEM CLIENTS ---
// This client is for read-only actions
const publicClient = createPublicClient({
  chain: foundry,
  transport: http(),
});

// This client will sign and send transactions for our backend
// We'll use the 3rd Anvil account as our "backend wallet"
const backendWalletPrivateKey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const backendAccount = privateKeyToAccount(backendWalletPrivateKey);

const walletClient = createWalletClient({
  account: backendAccount,
  chain: foundry,
  transport: http(),
});

// --- EXPRESS APP SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

const db = drizzle(process.env.DATABASE_URL!);

app.post('/create-task', async (req, res) => {
  const { title, description, deadline, staked_amount, userAddress } = req.body;

  if (!title || !userAddress || !staked_amount || !deadline) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // --- MAIN LOGIC ---
  try {
    // 1. Save the off-chain data to the database first to get an ID
    console.log('Step 1: Inserting task into database...');
    const newDbTask = await db
      .insert(usersTable)
      .values({
        title,
        description,
        deadline: new Date(deadline),
        staked_amount: staked_amount.toString(),
        userAddress,
      })
      .returning({ id: usersTable.id }); // Return the new task's ID

    const backendTaskId = newDbTask[0].id.toString();
    console.log(`Database task created with ID: ${backendTaskId}`);

    // 2. Call the smart contract function
    console.log('Step 2: Calling smart contract `createTask` function...');
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    const stakeAsValue = parseEther(staked_amount); // Converts "0.5" ETH to Wei

    const { request } = await publicClient.simulateContract({
      account: backendAccount, // The account that pays for the gas
      address: CONTRACT_ADDRESS,
      abi: contractJson.abi,
      functionName: 'createTask',
      args: [BigInt(deadlineTimestamp), backendTaskId],
      value: stakeAsValue, // The amount of ETH to stake
    });
    
    const txHash = await walletClient.writeContract(request);

    console.log(`Transaction sent! Hash: ${txHash}`);
    console.log('Waiting for transaction to be mined...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === 'reverted') {
      throw new Error('Transaction reverted');
    }

    console.log('✅ Smart contract task created successfully!');

    // 3. Respond to the client
    return res.status(201).json({
      message: 'Task created successfully on-chain and off-chain!',
      databaseId: backendTaskId,
      transactionHash: txHash,
    });
  } catch (err: any) {
    console.error('💥 An error occurred:', err);
    return res.status(500).json({ error: 'Failed to create task.', details: err.message });
  }
});

app.listen(3000, () => {
  console.log(`Server running on port 3000. Connected to contract: ${CONTRACT_ADDRESS}`);
});