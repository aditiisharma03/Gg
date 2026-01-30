const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const cors = require("cors");
const db = require("./db"); // Your MySQL connection
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ====== WEBSOCKET SETUP ======
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast function for real-time updates
function broadcastUpdate(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ====== MIDDLEWARE ======
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Add cache control headers
app.use((req, res, next) => {
  // Cache static assets for 1 year
  if (req.path.startsWith('/uploads/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  // Cache API responses for 5 seconds
  else if (req.path.startsWith('/gossips/')) {
    res.setHeader('Cache-Control', 'public, max-age=5');
  }
  next();
});

// ====== ROUTES ======
app.get("/", (req, res) => res.send("Gossip Backend is running 💖"));

// ===== OPTIMIZED GOSSIPS ENDPOINTS =====
// Get latest gossips (optimized with comments)
app.get("/gossips/latest", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    
    // Use a single optimized query
    const [gossips] = await db.promise().query(`
      SELECT 
        g.*,
        COALESCE(gr.total_reactions, 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
      FROM gossips g
      LEFT JOIN (
        SELECT gossip_id, SUM(count) as total_reactions 
        FROM gossip_reactions 
        GROUP BY gossip_id
      ) gr ON g.id = gr.gossip_id
      LEFT JOIN (
        SELECT gossip_id, COUNT(*) as comment_count 
        FROM gossip_comments 
        GROUP BY gossip_id
      ) gc ON g.id = gc.gossip_id
      ORDER BY g.created_at DESC 
      LIMIT ?
    `, [limit]);
    
    // Only load comments if specifically requested
    if (req.query.withComments === 'true') {
      const gossipIds = gossips.map(g => g.id);
      if (gossipIds.length > 0) {
        const [comments] = await db.promise().query(`
          SELECT * FROM gossip_comments 
          WHERE gossip_id IN (?) 
          ORDER BY created_at DESC
          LIMIT 10
        `, [gossipIds]);
        
        // Group comments by gossip_id
        const commentsByGossip = {};
        comments.forEach(comment => {
          if (!commentsByGossip[comment.gossip_id]) {
            commentsByGossip[comment.gossip_id] = [];
          }
          commentsByGossip[comment.gossip_id].push(comment);
        });
        
        // Attach limited comments to each gossip
        gossips.forEach(gossip => {
          gossip.comments = commentsByGossip[gossip.id]?.slice(0, 3) || []; // Only first 3 comments
        });
      }
    }
    
    res.json(gossips);
  } catch (err) {
    console.error("Error in /gossips/latest:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all gossips with pagination
app.get("/gossips", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const [[{ total }]] = await db.promise().query(
      "SELECT COUNT(*) as total FROM gossips"
    );
    
    // Get paginated gossips with counts
    const [rows] = await db.promise().query(`
      SELECT 
        g.*,
        COALESCE(gr.total_reactions, 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
      FROM gossips g
      LEFT JOIN (
        SELECT gossip_id, SUM(count) as total_reactions 
        FROM gossip_reactions 
        GROUP BY gossip_id
      ) gr ON g.id = gr.gossip_id
      LEFT JOIN (
        SELECT gossip_id, COUNT(*) as comment_count 
        FROM gossip_comments 
        GROUP BY gossip_id
      ) gc ON g.id = gc.gossip_id
      ORDER BY g.created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    res.json({
      gossips: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error in /gossips:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get single gossip by ID
app.get("/gossips/:id", async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        g.*,
        COALESCE(gr.total_reactions, 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
      FROM gossips g
      LEFT JOIN (
        SELECT gossip_id, SUM(count) as total_reactions 
        FROM gossip_reactions 
        WHERE gossip_id = ?
        GROUP BY gossip_id
      ) gr ON g.id = gr.gossip_id
      LEFT JOIN (
        SELECT gossip_id, COUNT(*) as comment_count 
        FROM gossip_comments 
        WHERE gossip_id = ?
        GROUP BY gossip_id
      ) gc ON g.id = gc.gossip_id
      WHERE g.id = ?
    `, [req.params.id, req.params.id, req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Gossip not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in /gossips/:id:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Create gossip
app.post("/gossips", async (req, res) => {
  try {
    const { diva_name, content } = req.body;
    
    if (!content?.trim()) {
      return res.status(400).json({ error: "Content required" });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: "Content too long (max 1000 characters)" });
    }

    let media_path = null;
    if (req.files?.media) {
      const file = req.files.media;
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type" });
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large (max 10MB)" });
      }
      
      const fs = require("fs");
      const uploadDir = path.join(__dirname, "uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uniqueName = Date.now() + "_" + Math.random().toString(36).substring(7) + path.extname(file.name);
      const uploadPath = path.join(uploadDir, uniqueName);
      
      await file.mv(uploadPath);
      media_path = "/uploads/" + uniqueName;
    }

    // Start transaction
    const connection = await db.promise().getConnection();
    
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query(
        "INSERT INTO gossips (diva_name, content, media_path, created_at) VALUES (?, ?, ?, NOW())",
        [diva_name || "Anonymous", content.trim(), media_path]
      );

      const gossipId = result.insertId;

      // Initialize reactions with default emojis
      const defaultEmojis = ["❤️", "😂", "😮", "😡", "😢"];
      for (let emoji of defaultEmojis) {
        await connection.query(
          "INSERT INTO gossip_reactions (gossip_id, emoji, count) VALUES (?, ?, 0)",
          [gossipId, emoji]
        );
      }

      // Get the newly created gossip with counts
      const [newGossip] = await connection.query(`
        SELECT 
          g.*,
          COALESCE(gr.total_reactions, 0) as total_reactions,
          COALESCE(gc.comment_count, 0) as comment_count
        FROM gossips g
        LEFT JOIN (
          SELECT gossip_id, SUM(count) as total_reactions 
          FROM gossip_reactions 
          WHERE gossip_id = ?
          GROUP BY gossip_id
        ) gr ON g.id = gr.gossip_id
        LEFT JOIN (
          SELECT gossip_id, COUNT(*) as comment_count 
          FROM gossip_comments 
          WHERE gossip_id = ?
          GROUP BY gossip_id
        ) gc ON g.id = gc.gossip_id
        WHERE g.id = ?
      `, [gossipId, gossipId, gossipId]);

      await connection.commit();
      connection.release();

      // Broadcast new gossip to all connected clients
      broadcastUpdate({
        type: 'NEW_GOSSIP',
        gossip: newGossip[0]
      });

      res.json({ 
        success: true, 
        id: gossipId, 
        gossip: newGossip[0] 
      });
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
    
  } catch (err) {
    console.error("Error in POST /gossips:", err);
    res.status(500).json({ error: "Failed to post gossip" });
  }
});

// Edit gossip
app.put("/gossips/:id", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    const [result] = await db.promise().query(
      "UPDATE gossips SET content = ? WHERE id = ?",
      [content, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Gossip not found" });
    }
    
    // Get updated gossip with counts
    const [updatedGossip] = await db.promise().query(`
      SELECT 
        g.*,
        COALESCE(gr.total_reactions, 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
      FROM gossips g
      LEFT JOIN (
        SELECT gossip_id, SUM(count) as total_reactions 
        FROM gossip_reactions 
        WHERE gossip_id = ?
        GROUP BY gossip_id
      ) gr ON g.id = gr.gossip_id
      LEFT JOIN (
        SELECT gossip_id, COUNT(*) as comment_count 
        FROM gossip_comments 
        WHERE gossip_id = ?
        GROUP BY gossip_id
      ) gc ON g.id = gc.gossip_id
      WHERE g.id = ?
    `, [req.params.id, req.params.id, req.params.id]);
    
    // Broadcast update
    broadcastUpdate({
      type: 'UPDATE_GOSSIP',
      gossipId: req.params.id,
      gossip: updatedGossip[0]
    });
    
    res.json({ success: true, gossip: updatedGossip[0] });
  } catch (err) {
    console.error("Error in PUT /gossips/:id:", err);
    res.status(500).json({ error: "Failed to edit post" });
  }
});

// Delete gossip
app.delete("/gossips/:id", async (req, res) => {
  try {
    // Start transaction
    const connection = await db.promise().getConnection();
    
    try {
      await connection.beginTransaction();
      
      // First delete related data
      await connection.query("DELETE FROM gossip_comments WHERE gossip_id = ?", [req.params.id]);
      await connection.query("DELETE FROM gossip_reactions WHERE gossip_id = ?", [req.params.id]);
      await connection.query("DELETE FROM reported_gossips WHERE gossip_id = ?", [req.params.id]);
      
      // Get media path before deleting gossip
      const [[gossip]] = await connection.query(
        "SELECT media_path FROM gossips WHERE id = ?",
        [req.params.id]
      );
      
      if (!gossip) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: "Gossip not found" });
      }
      
      // Delete the gossip
      const [result] = await connection.query(
        "DELETE FROM gossips WHERE id = ?",
        [req.params.id]
      );
      
      if (result.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: "Gossip not found" });
      }
      
      // Delete associated media file if exists
      if (gossip.media_path) {
        const fs = require("fs");
        const filePath = path.join(__dirname, gossip.media_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await connection.commit();
      connection.release();
      
      // Broadcast deletion
      broadcastUpdate({
        type: 'DELETE_GOSSIP',
        gossipId: req.params.id
      });
      
      res.json({ success: true });
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (err) {
    console.error("Error in DELETE /gossips/:id:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ===== REPORT GOSSIP =====
app.post("/gossips/:id/report", async (req, res) => {
  try {
    const { reason } = req.body;
    const gossipId = req.params.id;

    if (!reason?.trim()) {
      return res.status(400).json({ error: "Report reason required" });
    }

    if (reason.length > 500) {
      return res.status(400).json({ error: "Reason too long (max 500 characters)" });
    }

    // Check if gossip exists
    const [gossip] = await db.promise().query(
      "SELECT id FROM gossips WHERE id = ?",
      [gossipId]
    );

    if (gossip.length === 0) {
      return res.status(404).json({ error: "Gossip not found" });
    }

    // Insert report
    await db.promise().query(
      "INSERT INTO reported_gossips (gossip_id, reason, reported_at) VALUES (?, ?, NOW())",
      [gossipId, reason]
    );

    res.json({ success: true, message: "Gossip reported successfully" });
  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ error: "Failed to report gossip" });
  }
});

// Get reports (admin only)
app.get("/admin/reports", async (req, res) => {
  try {
    const [reports] = await db.promise().query(`
      SELECT rg.*, g.content, g.diva_name, g.created_at as gossip_created
      FROM reported_gossips rg
      JOIN gossips g ON rg.gossip_id = g.id
      ORDER BY rg.reported_at DESC
      LIMIT 100
    `);
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ===== OPTIMIZED COMMENTS =====
app.get("/gossips/:id/comments", async (req, res) => {
  try {
    const gossipId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [[{ total }]] = await db.promise().query(
      "SELECT COUNT(*) as total FROM gossip_comments WHERE gossip_id = ?",
      [gossipId]
    );
    
    // Get paginated comments
    const [rows] = await db.promise().query(
      "SELECT * FROM gossip_comments WHERE gossip_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [gossipId, limit, offset]
    );
    
    res.json({
      comments: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error in /gossips/:id/comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/gossips/:id/comments", async (req, res) => {
  try {
    const gossipId = req.params.id;
    const { commenter_name, comment } = req.body;

    if (!comment?.trim()) {
      return res.status(400).json({ error: "Comment required" });
    }

    if (comment.length > 500) {
      return res.status(400).json({ error: "Comment too long (max 500 characters)" });
    }

    const [result] = await db.promise().query(
      "INSERT INTO gossip_comments (gossip_id, commenter_name, comment, created_at) VALUES (?, ?, ?, NOW())",
      [gossipId, commenter_name || "Anonymous", comment.trim()]
    );

    // Get the newly created comment
    const [newComment] = await db.promise().query(
      "SELECT * FROM gossip_comments WHERE id = ?",
      [result.insertId]
    );

    // Broadcast new comment
    broadcastUpdate({
      type: 'NEW_COMMENT',
      gossipId: gossipId,
      comment: newComment[0]
    });

    res.json({ success: true, comment: newComment[0] });
  } catch (err) {
    console.error("Comment Error:", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// Edit comment
app.put("/gossips/:gossipId/comments/:commentId", async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ error: "Comment required" });

    const [result] = await db.promise().query(
      "UPDATE gossip_comments SET comment = ? WHERE id = ?",
      [comment, req.params.commentId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to edit comment" });
  }
});

// Delete comment
app.delete("/gossips/:gossipId/comments/:commentId", async (req, res) => {
  try {
    const [result] = await db.promise().query(
      "DELETE FROM gossip_comments WHERE id = ?",
      [req.params.commentId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// ===== OPTIMIZED REACTIONS =====
app.get("/gossips/:id/reactions", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT emoji, count FROM gossip_reactions WHERE gossip_id = ? ORDER BY count DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error in /gossips/:id/reactions:", err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// Unified reaction handler
app.post("/gossips/:id/reactions", async (req, res) => {
  try {
    const { emoji, action = 'toggle' } = req.body;
    
    if (!emoji) {
      return res.status(400).json({ error: "Emoji required" });
    }

    // Validate action
    if (!['toggle', 'add', 'remove'].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const gossipId = req.params.id;
    
    // Check if gossip exists
    const [gossip] = await db.promise().query(
      "SELECT id FROM gossips WHERE id = ?",
      [gossipId]
    );
    
    if (gossip.length === 0) {
      return res.status(404).json({ error: "Gossip not found" });
    }

    // Check if reaction exists
    const [existing] = await db.promise().query(
      "SELECT id, count FROM gossip_reactions WHERE gossip_id = ? AND emoji = ?",
      [gossipId, emoji]
    );

    let newCount;
    
    if (existing.length === 0) {
      // Create new reaction
      if (action === 'remove') {
        return res.json({ success: true, count: 0, emoji });
      }
      
      await db.promise().query(
        "INSERT INTO gossip_reactions (gossip_id, emoji, count) VALUES (?, ?, 1)",
        [gossipId, emoji]
      );
      newCount = 1;
    } else {
      const currentCount = existing[0].count;
      
      if (action === 'toggle') {
        // Toggle between 0 and 1 (for like/unlike)
        newCount = currentCount === 0 ? 1 : 0;
      } else if (action === 'add') {
        newCount = currentCount + 1;
      } else { // remove
        newCount = Math.max(0, currentCount - 1);
      }
      
      await db.promise().query(
        "UPDATE gossip_reactions SET count = ? WHERE gossip_id = ? AND emoji = ?",
        [newCount, gossipId, emoji]
      );
    }

    // Get total reactions
    const [[{ total }]] = await db.promise().query(
      "SELECT SUM(count) as total FROM gossip_reactions WHERE gossip_id = ?",
      [gossipId]
    );

    // Broadcast reaction update
    broadcastUpdate({
      type: 'REACTION_UPDATE',
      gossipId: gossipId,
      emoji: emoji,
      count: newCount || 0,
      totalReactions: total || 0
    });

    res.json({ 
      success: true, 
      count: newCount || 0,
      emoji,
      totalReactions: total || 0
    });
    
  } catch (err) {
    console.error("Error in POST /gossips/:id/reactions:", err);
    res.status(500).json({ error: "Failed to update reaction" });
  }
});

// Get total reactions count
app.get("/gossips/:id/reactions/total", async (req, res) => {
  try {
    const [result] = await db.promise().query(
      "SELECT SUM(count) as total FROM gossip_reactions WHERE gossip_id = ?",
      [req.params.id]
    );
    res.json({ total: result[0].total || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get total reactions" });
  }
});

// ===== CONTACT =====
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Please fill all fields" });
    }

    // Basic validation
    if (name.length > 100) {
      return res.status(400).json({ error: "Name too long" });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: "Message too long" });
    }

    const [result] = await db.promise().query(
      "INSERT INTO contact_us (name, email, message, created_at) VALUES (?, ?, ?, NOW())",
      [name.trim(), email.trim(), message.trim()]
    );
    
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});

// Get all contact messages (admin)
app.get("/admin/contact-messages", async (req, res) => {
  try {
    const [messages] = await db.promise().query(
      "SELECT * FROM contact_us ORDER BY created_at DESC LIMIT 100"
    );
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contact messages" });
  }
});

// ===== STATISTICS =====
app.get("/admin/stats", async (req, res) => {
  try {
    // Use single query for better performance
    const [stats] = await db.promise().query(`
      SELECT 
        (SELECT COUNT(*) FROM gossips) as gossips,
        (SELECT COUNT(*) FROM gossip_comments) as comments,
        (SELECT SUM(count) FROM gossip_reactions) as reactions,
        (SELECT COUNT(*) FROM reported_gossips) as reports,
        (SELECT COUNT(*) FROM contact_us) as contact_messages
    `);
    
    res.json(stats[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// ===== HEALTH CHECK =====
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    websocketClients: clients.size
  });
});

// ===== SEARCH =====
app.get("/gossips/search", async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }
    
    const searchTerm = `%${query.trim()}%`;
    
    const [results] = await db.promise().query(`
      SELECT 
        g.*,
        COALESCE(gr.total_reactions, 0) as total_reactions,
        COALESCE(gc.comment_count, 0) as comment_count
      FROM gossips g
      LEFT JOIN (
        SELECT gossip_id, SUM(count) as total_reactions 
        FROM gossip_reactions 
        GROUP BY gossip_id
      ) gr ON g.id = gr.gossip_id
      LEFT JOIN (
        SELECT gossip_id, COUNT(*) as comment_count 
        FROM gossip_comments 
        GROUP BY gossip_id
      ) gc ON g.id = gc.gossip_id
      WHERE g.content LIKE ? OR g.diva_name LIKE ?
      ORDER BY g.created_at DESC
      LIMIT 50
    `, [searchTerm, searchTerm]);
    
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "File too large (max 10MB)" });
    }
  }
  
  res.status(500).json({ error: "Something went wrong!" });
});

// ===== START SERVER =====
server.listen(PORT, () => {
  console.log(`💖 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  wss.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});