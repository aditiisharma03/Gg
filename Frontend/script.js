// ====== API BASE URL ======
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gg-qrk5.onrender.com";

// ====== GOSSIP PREVIEW FOR UPLOAD ======
const mediaInput = document.getElementById("mediaInput");
const preview = document.getElementById("preview");

if (mediaInput) {
  mediaInput.addEventListener("change", () => {
    preview.innerHTML = "";
    const file = mediaInput.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    if (file.type.startsWith("image")) {
      const img = document.createElement("img");
      img.src = url;
      preview.appendChild(img);
    } else if (file.type.startsWith("video")) {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      preview.appendChild(video);
    }
  });
}

// ====== FETCH LATEST GOSSIPS ======
const gossipContainer = document.getElementById("gossipCards");

async function loadLatestGossips() {
  if (!gossipContainer) return;

  try {
    const res = await fetch(`${API_BASE}/gossips/latest`);
    const gossips = await res.json();

    gossipContainer.innerHTML = "";

    gossips.forEach((gossip) => {
      const card = document.createElement("div");
      card.classList.add("card");

      let mediaHTML = "";
      if (gossip.media_path) {
        const mediaURL = `${API_BASE}${gossip.media_path}`;
        mediaHTML = gossip.media_path.endsWith(".mp4")
          ? `<video src="${mediaURL}" controls></video>`
          : `<img src="${mediaURL}" alt="Gossip Image">`;
      }

      card.innerHTML = `
        ${mediaHTML}
        <div class="card-content">
          <h3>${gossip.diva_name || "Anonymous"}</h3>
          <p>${gossip.content}</p>

          <!-- Emoji Reactions -->
          <div class="reactions" id="reactions-${gossip.id}">
            ❤️ <span id="r-${gossip.id}-❤️">0</span>
            😂 <span id="r-${gossip.id}-😂">0</span>
            😮 <span id="r-${gossip.id}-😮">0</span>
            😡 <span id="r-${gossip.id}-😡">0</span>
          </div>

          <!-- Comments -->
          <div class="comments">
            <div class="comment-list" id="comments-${gossip.id}"></div>
            <input
              type="text"
              placeholder="Add a comment 💬"
              onkeypress="addComment(event, ${gossip.id})"
            />
          </div>
        </div>
      `;

      gossipContainer.appendChild(card);

      // Load reactions and comments from backend
      loadReactions(gossip.id);
      loadComments(gossip.id);
    });
  } catch (err) {
    console.error("Failed to load gossips:", err);
    gossipContainer.innerHTML = "<p>Failed to load gossips 💔</p>";
  }
}

loadLatestGossips();

// ====== REACTIONS ======
async function loadReactions(gossipId) {
  try {
    const res = await fetch(`${API_BASE}/gossips/${gossipId}/reactions`);
    const data = await res.json();
    data.forEach((r) => {
      const counter = document.getElementById(`r-${gossipId}-${r.emoji}`);
      if (counter) counter.innerText = r.count;
    });
  } catch (err) {
    console.error("Failed to load reactions:", err);
  }
}

async function react(gossipId, emoji) {
  try {
    // Send reaction toggle to backend
    await fetch(`${API_BASE}/gossips/${gossipId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });

    // Refresh counts
    loadReactions(gossipId);
  } catch (err) {
    console.error("Failed to update reaction:", err);
  }
}

// ====== COMMENTS ======
async function loadComments(gossipId) {
  try {
    const res = await fetch(`${API_BASE}/gossips/${gossipId}/comments`);
    const comments = await res.json();
    const commentList = document.getElementById(`comments-${gossipId}`);
    commentList.innerHTML = "";
    comments.forEach((c) => {
      const comment = document.createElement("div");
      comment.classList.add("comment");
      comment.innerText = `${c.commenter_name || "Anonymous"}: ${c.comment}`;
      commentList.appendChild(comment);
    });
  } catch (err) {
    console.error("Failed to load comments:", err);
  }
}

async function addComment(event, gossipId) {
  if (event.key !== "Enter") return;

  const input = event.target;
  const text = input.value.trim();
  if (!text) return;

  try {
    await fetch(`${API_BASE}/gossips/${gossipId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commenter_name: "Anonymous", comment: text }),
    });

    input.value = "";
    loadComments(gossipId);
  } catch (err) {
    console.error("Failed to add comment:", err);
  }
}

// ====== SUBMIT GOSSIP ======
const gossipForm = document.getElementById("gossipForm");

if (gossipForm) {
  gossipForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(gossipForm);
    const content = formData.get("content");

    if (!content.trim()) {
      alert("Please enter your gossip 💖");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/gossips`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert("Gossip posted successfully! 💌");
        gossipForm.reset();
        preview.innerHTML = "";
        loadLatestGossips();
      } else {
        alert("Failed to post gossip 💔");
      }
    } catch (err) {
      console.error(err);
      alert("Error posting gossip 💔");
    }
  });
}

// ====== CONTACT FORM ======
const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        alert("Message sent! 💌");
        contactForm.reset();
      } else {
        alert(result.error || "Failed to send message 💔");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending message 💔");
    }
  });
}

// ====== CANCEL GOSSIP ======
document.getElementById("cancelGossip")?.addEventListener("click", () => {
  gossipForm.reset();
  preview.innerHTML = "";
});
