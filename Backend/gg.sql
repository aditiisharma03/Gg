CREATE TABLE gossips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  diva_name VARCHAR(100) DEFAULT 'Anonymous',
  content TEXT NOT NULL,
  media_path VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO gossips (diva_name, content) VALUES
('Alice', 'Something juicy happened today!'),
('Bob', 'Library crush spotted!'),
('Anonymous', 'Secret whispers…');

CREATE TABLE contact_us (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150),
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
 SELECT * FROM contact_us;
 DELETE FROM gossips;
