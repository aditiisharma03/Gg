const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========== ROUTES ==========
app.get("/", (req, res) => {
  res.send("Gossip Backend is running 💖");
});

// ===== GOSSIPS =====
app.get("/gossips/latest", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM gossips ORDER BY created_at DESC LIMIT 3"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/gossips", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM gossips ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/gossips", async (req, res) => {
  try {
    const { diva_name, content } = req.body;
    let media_path = null;

    if (req.files && req.files.media) {
      const file = req.files.media;
      const fs = require("fs");
      const uploadDir = path.join(__dirname, "uploads");

      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

      const uploadPath = path.join(uploadDir, Date.now() + "_" + file.name);
      await file.mv(uploadPath);
      media_path = "/uploads/" + path.basename(uploadPath);
    }

    // Insert gossip
    const [result] = await db.promise().query(
      "INSERT INTO gossips (diva_name, content, media_path, created_at) VALUES (?, ?, ?, NOW())",
      [diva_name || "Anonymous", content, media_path]
    );

    const gossipId = result.insertId;

    // Initialize reactions automatically
    const emojis = ["❤️", "😂", "😮", "😡"];
    for (let emoji of emojis) {
      await db.promise().query(
        "INSERT INTO gossip_reactions (gossip_id, emoji, count) VALUES (?, ?, 0)",
        [gossipId, emoji]
      );
    }

    res.json({ success: true, id: gossipId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post gossip" });
  }
});

// ===== COMMENTS =====
app.get("/gossips/:id/comments", async (req, res) => {
  const gossipId = req.params.id;
  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM gossip_comments WHERE gossip_id = ? ORDER BY created_at ASC",
      [gossipId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/gossips/:id/comments", async (req, res) => {
  const gossipId = req.params.id;
  const { commenter_name, comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: "Comment cannot be empty" });
  }

  try {
    const [result] = await db.promise().query(
      "INSERT INTO gossip_comments (gossip_id, commenter_name, comment, created_at) VALUES (?, ?, ?, NOW())",
      [gossipId, commenter_name || "Anonymous", comment]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// ===== REACTIONS =====
// Get reactions for a gossip
app.get("/gossips/:id/reactions", async (req, res) => {
  const gossipId = req.params.id;
  try {
    const [rows] = await db.promise().query(
      "SELECT emoji, count FROM gossip_reactions WHERE gossip_id = ?",
      [gossipId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// Toggle reaction (like/unlike) — just like Instagram
app.post("/gossips/:id/reactions/toggle", async (req, res) => {
  const gossipId = req.params.id;
  const { emoji, action } = req.body; // action = "add" or "remove"

  if (!emoji || !["add", "remove"].includes(action)) {
    return res.status(400).json({ error: "Invalid emoji or action" });
  }

  try {
    const delta = action === "add" ? 1 : -1;

    await db.promise().query(
      "UPDATE gossip_reactions SET count = count + ? WHERE gossip_id = ? AND emoji = ?",
      [delta, gossipId, emoji]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle reaction" });
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
    console.error("Contact form error:", err);
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
