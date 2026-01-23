const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const cors = require("cors");
const db = require("./db"); // Your MySQL connection

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ====== ROUTES ======
app.get("/", (req, res) => res.send("Gossip Backend is running 💖"));

// ===== GOSSIPS =====
// Get latest gossips (for home page)
app.get("/gossips/latest", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT g.*, 
        (SELECT SUM(count) FROM gossip_reactions WHERE gossip_id = g.id) as total_reactions
       FROM gossips g 
       ORDER BY g.created_at DESC 
       LIMIT 3`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all gossips
app.get("/gossips", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT g.*, 
        (SELECT SUM(count) FROM gossip_reactions WHERE gossip_id = g.id) as total_reactions
       FROM gossips g 
       ORDER BY g.created_at DESC`
    );
    res.json(rows);
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
        (SELECT SUM(count) FROM gossip_reactions WHERE gossip_id = g.id) as total_reactions
       FROM gossips g 
       WHERE g.id = ?`,
      [req.params.id]
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
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

      const uploadPath = path.join(uploadDir, Date.now() + "_" + file.name);
      await file.mv(uploadPath);
      media_path = "/uploads/" + path.basename(uploadPath);
    }

    const [result] = await db.promise().query(
      "INSERT INTO gossips (diva_name, content, media_path, created_at) VALUES (?, ?, ?, NOW())",
      [diva_name || "Anonymous", content, media_path]
    );

    const gossipId = result.insertId;

    // Initialize reactions with default emojis
    const defaultEmojis = ["❤️", "😂", "😮", "😡", "😢"];
    for (let emoji of defaultEmojis) {
      await db.promise().query(
        "INSERT INTO gossip_reactions (gossip_id, emoji, count) VALUES (?, ?, 0)",
        [gossipId, emoji]
      );
    }

    // Fetch the newly created gossip
    const [newGossip] = await db.promise().query(
      "SELECT * FROM gossips WHERE id = ?",
      [gossipId]
    );

    res.json({ success: true, id: gossipId, gossip: newGossip[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post gossip" });
  }
});

// Edit gossip
app.put("/gossips/:id", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    await db.promise().query(
      "UPDATE gossips SET content = ? WHERE id = ?",
      [content, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to edit post" });
  }
});

// Delete gossip
app.delete("/gossips/:id", async (req, res) => {
  try {
    // First delete related data (comments, reactions)
    await db.promise().query("DELETE FROM gossip_comments WHERE gossip_id = ?", [req.params.id]);
    await db.promise().query("DELETE FROM gossip_reactions WHERE gossip_id = ?", [req.params.id]);
    await db.promise().query("DELETE FROM reported_gossips WHERE gossip_id = ?", [req.params.id]);
    
    // Then delete the gossip
    await db.promise().query("DELETE FROM gossips WHERE id = ?", [req.params.id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
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
    `);
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ===== COMMENTS =====
app.get("/gossips/:id/comments", async (req, res) => {
  try {
    const gossipId = req.params.id;
    const [rows] = await db.promise().query(
      "SELECT * FROM gossip_comments WHERE gossip_id = ? ORDER BY created_at DESC",
      [gossipId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/gossips/:id/comments", async (req, res) => {
  try {
    const gossipId = req.params.id;
    const { commenter_name, comment } = req.body;

    if (!comment?.trim()) 
      return res.status(400).json({ error: "Comment required" });

    const [result] = await db.promise().query(
      "INSERT INTO gossip_comments (gossip_id, commenter_name, comment, created_at) VALUES (?, ?, ?, NOW())",
      [gossipId, commenter_name || "Anonymous", comment]
    );

    // Get the newly created comment
    const [newComment] = await db.promise().query(
      "SELECT * FROM gossip_comments WHERE id = ?",
      [result.insertId]
    );

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

    await db.promise().query(
      "UPDATE gossip_comments SET comment = ? WHERE id = ?",
      [comment, req.params.commentId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to edit comment" });
  }
});

// Delete comment
app.delete("/gossips/:gossipId/comments/:commentId", async (req, res) => {
  try {
    await db.promise().query(
      "DELETE FROM gossip_comments WHERE id = ?",
      [req.params.commentId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// ===== REACTIONS =====
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

// Toggle reaction (like/unlike)
app.post("/gossips/:id/reactions/toggle", async (req, res) => {
  try {
    const { emoji, action } = req.body;
    if (!emoji || !["add", "remove"].includes(action)) {
      return res.status(400).json({ error: "Invalid emoji/action" });
    }

    const delta = action === "add" ? 1 : -1;
    
    // Update reaction count
    await db.promise().query(
      "UPDATE gossip_reactions SET count = GREATEST(0, count + ?) WHERE gossip_id = ? AND emoji = ?",
      [delta, req.params.id, emoji]
    );

    // Get updated counts
    const [updated] = await db.promise().query(
      "SELECT emoji, count FROM gossip_reactions WHERE gossip_id = ? AND emoji = ?",
      [req.params.id, emoji]
    );

    res.json({ 
      success: true, 
      count: updated[0]?.count || 0,
      emoji 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle reaction" });
  }
});

// Add specific reaction (for quick reaction buttons)
app.post("/gossips/:id/reactions/add", async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ error: "Emoji required" });
    }

    // Check if reaction exists
    const [existing] = await db.promise().query(
      "SELECT id FROM gossip_reactions WHERE gossip_id = ? AND emoji = ?",
      [req.params.id, emoji]
    );

    if (existing.length === 0) {
      // Create new reaction type
      await db.promise().query(
        "INSERT INTO gossip_reactions (gossip_id, emoji, count) VALUES (?, ?, 1)",
        [req.params.id, emoji]
      );
    } else {
      // Increment existing
      await db.promise().query(
        "UPDATE gossip_reactions SET count = count + 1 WHERE gossip_id = ? AND emoji = ?",
        [req.params.id, emoji]
      );
    }

    // Get updated count
    const [updated] = await db.promise().query(
      "SELECT count FROM gossip_reactions WHERE gossip_id = ? AND emoji = ?",
      [req.params.id, emoji]
    );

    res.json({ 
      success: true, 
      count: updated[0]?.count || 1,
      emoji 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add reaction" });
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

    const [result] = await db.promise().query(
      "INSERT INTO contact_us (name, email, message, created_at) VALUES (?, ?, ?, NOW())",
      [name, email, message]
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
      "SELECT * FROM contact_us ORDER BY created_at DESC"
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
    const [gossipCount] = await db.promise().query("SELECT COUNT(*) as count FROM gossips");
    const [commentCount] = await db.promise().query("SELECT COUNT(*) as count FROM gossip_comments");
    const [reactionCount] = await db.promise().query("SELECT SUM(count) as total FROM gossip_reactions");
    const [reportCount] = await db.promise().query("SELECT COUNT(*) as count FROM reported_gossips");

    res.json({
      gossips: gossipCount[0].count,
      comments: commentCount[0].count,
      reactions: reactionCount[0].total || 0,
      reports: reportCount[0].count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ===== START SERVER =====
app.listen(PORT, () => console.log(`💖 Server running on port ${PORT}`));