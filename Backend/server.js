const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const cors = require("cors"); // <-- add this
const db = require("./db"); // your db.js

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors()); // <-- allow frontend to fetch from different origin
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable file upload
app.use(fileUpload());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========== ROUTES ==========

// Test route
app.get("/", (req, res) => {
  res.send("Gossip Backend is running 💖");
});

// Get latest gossips (limit 3 for home page)
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

// Get all gossips
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

// Add a new gossip
app.post("/gossips", async (req, res) => {
  try {
    const { diva_name, content } = req.body;
    let media_path = null;

    // Handle uploaded file
    if (req.files && req.files.media) {
      const file = req.files.media;
      const uploadDir = path.join(__dirname, "uploads");

      // Ensure the uploads folder exists
      const fs = require("fs");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

      const uploadPath = path.join(uploadDir, Date.now() + "_" + file.name);
      await file.mv(uploadPath);
      media_path = "/uploads/" + path.basename(uploadPath);
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO gossips (diva_name, content, media_path, created_at) VALUES (?, ?, ?, NOW())",
        [diva_name || "Anonymous", content, media_path]
      );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post gossip" });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// ========== CONTACT US ROUTE ==========
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Simple validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Please fill all fields" });
    }

    // Insert into database (create a new table `contact_us` in MySQL)
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO contact_us (name, email, message, created_at) VALUES (?, ?, ?, NOW())",
        [name, email, message]
      );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});
