const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const cors = require("cors");
const db = require("./db");
const compression = require("compression");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MIDDLEWARE ======
app.use(compression()); // Enable gzip compression
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simplicity
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: '*', // In production, specify your domain
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1d', // Cache for 1 day
  setHeaders: function (res, path) {
    if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Cache in-memory for frequently accessed data
let gossipsCache = {
  data: null,
  timestamp: 0,
  ttl: 30000 // 30 seconds
};

// ====== ROUTES ======
app.get("/", (req, res) => res.send("Gossip Backend is running 💖"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Get latest gossips with caching
app.get("/gossips/latest", async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (gossipsCache.data && (now - gossipsCache.timestamp) < gossipsCache.ttl) {
      console.log('Serving from cache');
      return res.json(gossipsCache.data);
    }
    
    console.log('Fetching fresh data from database');
    const [rows] = await db.promise().query(
      `SELECT g.id, g.diva_name, g.content, g.media_path, g.created_at,
        COALESCE(SUM(gr.count), 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
       FROM gossips g
       LEFT JOIN gossip_reactions gr ON g.id = gr.gossip_id
       LEFT JOIN (
         SELECT gossip_id, COUNT(*) as comment_count 
         FROM gossip_comments 
         GROUP BY gossip_id
       ) gc ON g.id = gc.gossip_id
       GROUP BY g.id
       ORDER BY g.created_at DESC 
       LIMIT 3`
    );
    
    // Update cache
    gossipsCache.data = rows;
    gossipsCache.timestamp = Date.now();
    
    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    
    // Try to serve from cache even if stale
    if (gossipsCache.data) {
      console.log('Serving stale cache due to error');
      return res.json(gossipsCache.data);
    }
    
    res.status(500).json({ error: "Database error" });
  }
});

// Get all gossips with pagination
app.get("/gossips", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db.promise().query(
      "SELECT COUNT(*) as total FROM gossips"
    );
    const total = countResult[0].total;
    
    // Get paginated data
    const [rows] = await db.promise().query(
      `SELECT g.id, g.diva_name, g.content, g.media_path, g.created_at,
        COALESCE(SUM(gr.count), 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
       FROM gossips g
       LEFT JOIN gossip_reactions gr ON g.id = gr.gossip_id
       LEFT JOIN (
         SELECT gossip_id, COUNT(*) as comment_count 
         FROM gossip_comments 
         GROUP BY gossip_id
       ) gc ON g.id = gc.gossip_id
       GROUP BY g.id
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get single gossip by ID
app.get("/gossips/:id", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT g.*, 
        COALESCE(SUM(gr.count), 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
       FROM gossips g
       LEFT JOIN gossip_reactions gr ON g.id = gr.gossip_id
       LEFT JOIN (
         SELECT gossip_id, COUNT(*) as comment_count 
         FROM gossip_comments 
         WHERE gossip_id = ?
         GROUP BY gossip_id
       ) gc ON g.id = gc.gossip_id
       WHERE g.id = ?
       GROUP BY g.id`,
      [req.params.id, req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Gossip not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Create gossip
app.post("/gossips", async (req, res) => {
  try {
    const { diva_name, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    let media_path = null;
    if (req.files?.media) {
      const file = req.files.media;
      const fs = require("fs");
      const uploadDir = path.join(__dirname, "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uploadPath = path.join(uploadDir, fileName);
      await file.mv(uploadPath);
      media_path = "/uploads/" + fileName;
    }

    const [result] = await db.promise().query(
      "INSERT INTO gossips (diva_name, content, media_path, created_at) VALUES (?, ?, ?, NOW())",
      [diva_name || "Anonymous", content, media_path]
    );

    const gossipId = result.insertId;

    // Clear cache when new gossip is added
    gossipsCache.data = null;
    gossipsCache.timestamp = 0;

    // Fetch the newly created gossip
    const [newGossip] = await db.promise().query(
      `SELECT g.*, 0 as total_reactions, 0 as comment_count
       FROM gossips g 
       WHERE g.id = ?`,
      [gossipId]
    );

    res.json({ success: true, id: gossipId, gossip: newGossip[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post gossip" });
  }
});

// Get comments with pagination
app.get("/gossips/:id/comments", async (req, res) => {
  try {
    const gossipId = req.params.id;
    const [rows] = await db.promise().query(
      "SELECT * FROM gossip_comments WHERE gossip_id = ? ORDER BY created_at DESC LIMIT 50",
      [gossipId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Get reactions
app.get("/gossips/:id/reactions", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT emoji, count FROM gossip_reactions WHERE gossip_id = ? ORDER BY emoji",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// Database connection pool optimization (db.js)
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gossip_db',
  waitForConnections: true,
  connectionLimit: 10, // Adjust based on your Render plan
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

module.exports = pool;

// ====== START SERVER WITH GRACEFUL SHUTDOWN ======
const server = app.listen(PORT, () => {
  console.log(`💖 Server running on port ${PORT}`);
  
  // Warm up the cache
  setTimeout(() => {
    console.log('Warming up cache...');
    // Initial cache load
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database connection pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database connection pool closed');
      process.exit(0);
    });
  });
});