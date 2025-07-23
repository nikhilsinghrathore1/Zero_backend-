
import 'dotenv/config';
import express from 'express';
import { drizzle } from 'drizzle-orm/neon-http';
import { usersTable } from './db/schema';
import { eq } from 'drizzle-orm';
import cors from "cors"

const app = express();
app.use(express.json());

const db = drizzle(process.env.DATABASE_URL!);

app.post('/create-task', async (req, res) => {
  const { title, description, deadline, staked_amount, userAddress } = req.body;

  if (!title || !userAddress || !staked_amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

// okay so the backend is now workign 

  try {
    const task: typeof usersTable.$inferInsert = {
      title,
      description,
      deadline: deadline ? new Date(deadline) : undefined,
      staked_amount: staked_amount.toString(),
      userAddress,
    };

    await db.insert(usersTable).values(task);
    return res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    console.error('Error inserting task:', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
