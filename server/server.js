require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// --- MIDDLEWARE ---
app.use(cors({ origin: "*" }));
app.use(express.json());

// --- DATABASE MODELS ---

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },

  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, required: true },

  category: {
    type: String,
    enum: ['Hospital', 'Road', 'Bridge', 'College'],
    default: 'Road'
  },

  budget: String,
  timeline: String,

  status: {
    type: String,
    enum: ['Ongoing', 'Completed', 'Planned'],
    default: 'Ongoing'
  },

  civicImpact: { type: String, required: true },
  mediaUrl: String,

  ratings: [
    {
      value: Number
    }
  ],

  feedbacks: [
    {
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],

  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const StatsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  alertsTriggered: { type: Number, default: 0 }
});

const Project = mongoose.model('Project', ProjectSchema);
const User = mongoose.model('User', UserSchema);
const Stats = mongoose.model('Stats', StatsSchema);

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// --- ROUTES ---

// AUTH LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- PROJECT ROUTES ---

// GET ALL PROJECTS
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });

    const enriched = projects.map(p => {
      const avgRating = p.ratings.length
        ? (p.ratings.reduce((a, b) => a + b.value, 0) / p.ratings.length).toFixed(1)
        : 0;

      return { ...p.toObject(), avgRating };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// CREATE PROJECT
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const project = new Project(req.body);
    const saved = await project.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: "Failed to create project" });
  }
});

// UPDATE PROJECT
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updated) return res.status(404).json({ error: "Project not found" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

// DELETE PROJECT
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ error: "Project not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});

// --- RATING ---
app.post('/api/projects/:id/rate', async (req, res) => {
  try {
    const { value } = req.body;

    const project = await Project.findById(req.params.id);
    project.ratings.push({ value });

    await project.save();

    res.json({ message: "Rating added" });
  } catch (err) {
    res.status(400).json({ error: "Rating failed" });
  }
});

// --- FEEDBACK ---
app.post('/api/projects/:id/feedback', async (req, res) => {
  try {
    const { text } = req.body;

    const project = await Project.findById(req.params.id);
    project.feedbacks.push({ text });

    await project.save();

    res.json({ message: "Feedback added" });
  } catch (err) {
    res.status(400).json({ error: "Feedback failed" });
  }
});

// --- ANALYTICS ---
app.get('/api/analytics', async (req, res) => {
  try {
    let stats = await Stats.findById('global');

    if (!stats) {
      stats = await Stats.create({ _id: 'global', alertsTriggered: 0 });
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Analytics fetch failed" });
  }
});

app.post('/api/analytics/trigger', async (req, res) => {
  try {
    const updated = await Stats.findByIdAndUpdate(
      'global',
      { $inc: { alertsTriggered: 1 } },
      { upsert: true, new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Analytics update failed" });
  }
});

// --- ADMIN RESET (REMOVE AFTER DEMO) ---
app.get('/reset-admin', async (req, res) => {
  try {
    await User.deleteMany({ username: 'admin' });

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.create({
      username: 'admin',
      password: hashedPassword
    });

    res.send("Admin reset successful");
  } catch (err) {
    res.status(500).send("Error resetting admin");
  }
});

// --- SEED ADMIN ---
const seedAdmin = async () => {
  const existing = await User.findOne({ username: 'admin' });

  if (!existing) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password: hashedPassword });

    console.log('✅ Default Admin Created');
  }
};

// --- START SERVER ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedAdmin();

    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch(err => console.error('❌ MongoDB error:', err));