"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const neon_http_1 = require("drizzle-orm/neon-http");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: '*' }));
const db = (0, neon_http_1.drizzle)(process.env.DATABASE_URL);
// Route to create a new task
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
        const result = await db.insert(schema_1.tasktable).values(task).returning(); // ✅ Use tasktable and return inserted data
        return res.status(201).json({ message: 'Task created successfully', task: result[0] });
    }
    catch (err) {
        console.error('Error inserting task:', err);
        return res.status(500).json({ error: 'Failed to create task' });
    }
});
// Route to fetch all tasks for a user
app.get('/tasks/:userAddress', async (req, res) => {
    const { userAddress } = req.params;
    if (!userAddress) {
        return res.status(400).json({ error: 'Missing userAddress' });
    }
    try {
        const tasks = await db.select().from(schema_1.tasktable).where((0, drizzle_orm_1.eq)(schema_1.tasktable.userAddress, userAddress)); // ✅ Use tasktable
        return res.status(200).json({ tasks });
    }
    catch (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});
// Route to create a new user
app.post('/create-user', async (req, res) => {
    const { userAddress } = req.body;
    if (!userAddress) {
        return res.status(400).json({ error: 'Missing userAddress' });
    }
    try {
        const user = {
            userAddress,
            badges: [],
            streak: 0,
            total_spent: '0',
        };
        const result = await db.insert(schema_1.usersTable).values(user).returning();
        return res.status(201).json({ message: 'User created successfully', user: result[0] });
    }
    catch (err) {
        console.error('Error creating user:', err);
        return res.status(500).json({ error: 'Failed to create user' });
    }
});
// Route to get user profile
app.get('/user/:userAddress', async (req, res) => {
    const { userAddress } = req.params;
    if (!userAddress) {
        return res.status(400).json({ error: 'Missing userAddress' });
    }
    try {
        const user = await db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.userAddress, userAddress));
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ user: user[0] });
    }
    catch (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
