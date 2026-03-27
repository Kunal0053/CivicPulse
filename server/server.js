require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();

const PORT = process.env.PORT || 5000;
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- DATABASE MODELS ---
const ProjectSchema = new mongoose.Schema({
  name: String,
  description: String,
  latitude: Number, // saved as lat in schema
  longitude: Number, // saved as lng in schema
  lat: Number,
  lng: Number,
  radius: Number,
  budget: String,
  timeline: String,
  status: String,
  civicImpact: String,
  mediaUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const StatsSchema = new mongoose.Schema({
  alertsTriggered: { type: Number, default: 0 }
});

const Project = mongoose.model('Project', ProjectSchema);
const User = mongoose.model('User', UserSchema);
const Stats = mongoose.model('Stats', StatsSchema);

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- ROUTES ---

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).send('User not found');

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) return res.status(400).send('Invalid password');

  const token = jwt.sign({ _id: user._id }, JWT_SECRET);
  res.json({ token });
});

// Projects CRUD
app.get('/api/projects', async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  const project = new Project(req.body);
  try {
    const savedProject = await project.save();
    res.json(savedProject);
  } catch (err) { res.status(400).send(err); }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).send(err); }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(400).send(err); }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  let stats = await Stats.findOne();
  if (!stats) stats = await Stats.create({ alertsTriggered: 0 });
  res.json(stats);
});

app.post('/api/analytics/trigger', async (req, res) => {
  await Stats.findOneAndUpdate({}, { $inc: { alertsTriggered: 1 } }, { upsert: true });
  res.sendStatus(200);
});

// Seed Initial Admin (for demo purposes)
const seedAdmin = async () => {
  const existing = await User.findOne({ username: 'admin' });
  if (!existing) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password: hashedPassword });
    console.log('Seed: Created default admin (admin / admin123)');
  }
};

// Start Server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedAdmin();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));