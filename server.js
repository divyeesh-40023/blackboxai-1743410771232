require('dotenv').config();
const express = require('express');
const { getDb } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

// Middleware
app.use(express.json());

// Database connection
const db = getDb();

// API routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDb();
    const users = db.collection('users');
    
    const user = await users.findOne({ username });
    if (!user) throw new Error('User not found');
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new Error('Invalid password');
    
    const token = jwt.sign(
      { id: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ 
      token,
      redirect: `${user.role}-dashboard.html`
    });
    
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Serve static files
app.use(express.static('public'));

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'Server running' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Access locally at: http://localhost:${PORT}`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
      });
    });
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
      console.log('Trying port 3001 instead...');
      app.listen(3001, () => {
        console.log(`Server running on port 3001`);
      });
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  }
}

startServer();
