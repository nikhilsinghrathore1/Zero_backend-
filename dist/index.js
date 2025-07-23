"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// index.ts or routes/task.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const neon_http_1 = require("drizzle-orm/neon-http");
const schema_1 = require("./db/schema");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const db = (0, neon_http_1.drizzle)(process.env.DATABASE_URL);
app.post('/create-task', async (req, res) => {
    const { title, description, deadline, staked_amount, userAddress } = req.body;
    if (!title || !userAddress || !staked_amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const task = {
            title,
            description,
            deadline: deadline ? new Date(deadline) : undefined,
            staked_amount: staked_amount.toString(),
            userAddress,
        };
        await db.insert(schema_1.usersTable).values(task);
        return res.status(201).json({ message: 'Task created successfully', task });
    }
    catch (err) {
        console.error('Error inserting task:', err);
        return res.status(500).json({ error: 'Failed to create task' });
    }
});
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
