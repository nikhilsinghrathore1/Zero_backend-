import 'dotenv/config';
import express from 'express';
import { drizzle } from 'drizzle-orm/neon-http';
import { tasktable, usersTable } from './db/schema'; // ✅ Import both tables
import { eq } from 'drizzle-orm';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const port = process.env.PORT || 3001

const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));

// Function to create uploads directory
async function ensureUploadsDirectory() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image formats
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

const db = drizzle(process.env.DATABASE_URL!);

// Route to create a new task
app.post('/create-task', async (req, res) => {
  console.log("create task route called"); 
  const { Taskid, title, description, deadline, staked_amount, userAddress } = req.body;

  // Updated validation to include Taskid
  if (!Taskid || !title || !userAddress || !staked_amount) {
    return res.status(400).json({ error: 'Missing required fields: Taskid, title, userAddress, and staked_amount are required' });
  }
  
  console.log(req.body);
  
  try {
    // Check if task with this Taskid already exists
    const existingTask = await db.select().from(tasktable).where(eq(tasktable.Taskid, Taskid));
    
    if (existingTask.length > 0) {
      return res.status(409).json({ error: 'Task with this ID already exists' });
    }

    const task: typeof tasktable.$inferInsert = { 
      Taskid, // Now required from frontend
      title,
      description,
      deadline: deadline ? new Date(deadline) : undefined,
      staked_amount: staked_amount.toString(),
      userAddress,
    };

    const result = await db.insert(tasktable).values(task).returning();
    return res.status(201).json({ message: 'Task created successfully', task: result[0] });
  } catch (err) {
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
    const tasks = await db.select().from(tasktable).where(eq(tasktable.userAddress, userAddress));
    return res.status(200).json({ tasks });
  } catch (err) {
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
    // Check if user already exists
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.userAddress, userAddress));
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User already exists', user: existingUser[0] });
    }

    const user: typeof usersTable.$inferInsert = {
      userAddress,
      badges: [],
      streak: 0,
      total_spent: '0',
    };

    const result = await db.insert(usersTable).values(user).returning();
    return res.status(201).json({ message: 'User created successfully', user: result[0] });
  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// Helper function to determine proof type and format data
function formatProofData(file: Express.Multer.File | undefined, textProof: string | undefined, urlProof: string | undefined): string | null {
  if (file) {
    // File uploaded
    const fileData = {
      type: 'file',
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString()
    };
    return JSON.stringify(fileData);
  } else if (urlProof) {
    // URL provided
    const urlData = {
      type: 'url',
      url: urlProof,
      submittedAt: new Date().toISOString()
    };
    return JSON.stringify(urlData);
  } else if (textProof) {
    // Plain text
    const textData = {
      type: 'text',
      content: textProof,
      submittedAt: new Date().toISOString()
    };
    return JSON.stringify(textData);
  }
  return null;
}

// Route to submit proof for a specific task (supports file upload, URL, or text)
app.patch('/submit-proof/:taskId', upload.single('proofFile'), async (req, res) => {
  const { taskId } = req.params;
  const userAddress = req.body?.userAddress;
  const textProof = req.body?.textProof;
  const urlProof = req.body?.urlProof;
  console.log(req.body);

  const file = req.file;

  if (!taskId || !userAddress) {
    return res.status(400).json({ error: 'Missing required fields: taskId and userAddress' });
  }

  // Check if at least one proof type is provided
  if (!file && !textProof && !urlProof) {
    return res.status(400).json({ 
      error: 'Please provide proof in one of the following formats: file upload, URL, or text description' 
    });
  }

  try {
    // First, check if the task exists and belongs to the user
    const existingTask = await db.select().from(tasktable).where(eq(tasktable.Taskid, parseInt(taskId)));
    
    if (existingTask.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (existingTask[0].userAddress !== userAddress) {
      return res.status(403).json({ error: 'Unauthorized: Task does not belong to this user' });
    }

    // Format proof data based on type
    const proofData = formatProofData(file, textProof, urlProof);
    
    if (!proofData) {
      return res.status(400).json({ error: 'Failed to process proof data' });
    }

    // Update the task with proof
    const updatedTask = await db
      .update(tasktable)
      .set({ proof: proofData })
      .where(eq(tasktable.Taskid, parseInt(taskId)))
      .returning();

    // Parse proof data for response
    const parsedProof = JSON.parse(proofData);
    
    return res.status(200).json({ 
      message: 'Proof submitted successfully', 
      task: {
        ...updatedTask[0],
        proofDetails: parsedProof
      }
    });
  } catch (err) {
    console.error('Error submitting proof:', err);
    
    // Clean up uploaded file if there was an error
    if (file) {
      try {
        await fs.unlink(file.path);
      } catch (unlinkErr) {
        console.error('Error cleaning up file:', unlinkErr);
      }
    }
    
    return res.status(500).json({ error: 'Failed to submit proof' });
  }
});

// Route to update verified field for a task
app.patch('/verify-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { verified } = req.body;

  // Validate required fields
  if (!taskId) {
    return res.status(400).json({ error: 'Missing required field: taskId' });
  }

  if (typeof verified !== 'boolean') {
    return res.status(400).json({ error: 'Verified field must be a boolean value (true or false)' });
  }

  try {
    // Check if the task exists
    const existingTask = await db.select().from(tasktable).where(eq(tasktable.Taskid, parseInt(taskId)));
    
    if (existingTask.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update the verified field
    const updatedTask = await db
      .update(tasktable)
      .set({ verified: verified })
      .where(eq(tasktable.Taskid, parseInt(taskId)))
      .returning();

    return res.status(200).json({ 
      message: `Task ${verified ? 'verified' : 'unverified'} successfully`, 
      task: updatedTask[0]
    });
  } catch (err) {
    console.error('Error updating task verification:', err);
    return res.status(500).json({ error: 'Failed to update task verification' });
  }
});

// Route to serve uploaded files
app.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'uploads', filename);
  
  // Security check to prevent directory traversal
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving file:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// Route to get user profile
app.get('/user/:userAddress', async (req, res) => {
  const { userAddress } = req.params;

  if (!userAddress) {
    return res.status(400).json({ error: 'Missing userAddress' });
  }

  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.userAddress, userAddress));
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: user[0] });
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.listen(port, async () => {
  // Ensure uploads directory exists when server starts
  await ensureUploadsDirectory();
  console.log('Server running on port ', port);
});