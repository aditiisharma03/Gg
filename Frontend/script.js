// ====== API BASE URL (LOCAL + LIVE AUTO) ======
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gg-qrk5.onrender.com";

// ====== ELEMENTS ======
const gossipContainer = document.getElementById("gossipCards");
const gossipForm = document.getElementById("gossipForm");
const preview = document.getElementById("preview");

// ====== REACTION STATE (PERSISTENT) ======
const reacted = JSON.parse(localStorage.getItem("reacted")) || {};

// ====== GOSSIP PREVIEW ======
const mediaInput = document.getElementById("mediaInput");
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

// ====== LOAD LATEST GOSSIPS ======
async function loadLatestGossips() {
  if (!gossipContainer) return;

  try {
    const res = await fetch(`${API_BASE}/gossips/latest`);
    const gossips = await res.json();
    gossipContainer.innerHTML = "";

    gossips.forEach(gossip => {
      reacted[gossip.id] = reacted[gossip.id] || {};

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
          <h3>
            ${gossip.diva_name || "Anonymous"}
            <span class="edit-post" onclick="editPost(${gossip.id})">⋮</span>
          </h3>

          <p id="post-content-${gossip.id}">${gossip.content}</p>

          <div class="reactions">
            ${["❤️","😂","😮","😡"].map(emoji => `
              <span onclick="toggleReaction(${gossip.id}, '${emoji}')">
                ${emoji} <span id="r-${gossip.id}-${emoji}">0</span>
              </span>
            `).join("")}
          </div>

          <div class="comments">
            <div class="comment-list" id="comments-${gossip.id}" style="display:flex;flex-direction:column-reverse"></div>
            <div class="comment-input">
              <input type="text" id="input-${gossip.id}" placeholder="Add a comment 💬">
              <button onclick="postComment(${gossip.id})">Post</button>
            </div>
          </div>
        </div>
      `;

      gossipContainer.appendChild(card);
      loadReactions(gossip.id);
      loadComments(gossip.id, 2);
    });

  } catch (err) {
    console.error(err);
    gossipContainer.innerHTML = "<p>Failed to load gossips 💔</p>";
  }
}

// ====== REACTIONS ======
async function loadReactions(gossipId) {
  try {
    const res = await fetch(`${API_BASE}/gossips/${gossipId}/reactions`);
    const data = await res.json();

    data.forEach(r => {
      const el = document.getElementById(`r-${gossipId}-${r.emoji}`);
      if (el) el.innerText = r.count;
    });
  } catch (err) {
    console.error(err);
  }
}

async function toggleReaction(gossipId, emoji) {
  reacted[gossipId] = reacted[gossipId] || {};
  const hasReacted = reacted[gossipId][emoji] || false;

  try {
    await fetch(`${API_BASE}/gossips/${gossipId}/reactions/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emoji,
        action: hasReacted ? "remove" : "add"
      }),
    });

    reacted[gossipId][emoji] = !hasReacted;
    localStorage.setItem("reacted", JSON.stringify(reacted));

    loadReactions(gossipId);
  } catch (err) {
    console.error("Reaction error:", err);
  }
}

// ====== COMMENTS ======
async function loadComments(gossipId, limit = null) {
  const res = await fetch(`${API_BASE}/gossips/${gossipId}/comments`);
  const comments = await res.json();
  const list = document.getElementById(`comments-${gossipId}`);
  list.innerHTML = "";

  let show = comments;
  if (limit && comments.length > limit) show = comments.slice(-limit);

  show.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<strong>${c.commenter_name || "Anonymous"}:</strong> ${c.comment}`;
    list.appendChild(div);
  });
}

async function postComment(gossipId) {
  const input = document.getElementById(`input-${gossipId}`);
  const text = input.value.trim();
  if (!text) return;

  const name = prompt("Your name:", "Anonymous") || "Anonymous";

  await fetch(`${API_BASE}/gossips/${gossipId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commenter_name: name, comment: text }),
  });

  input.value = "";
  loadComments(gossipId, 2);
}

// ====== EDIT POST ======
function editPost(gossipId) {
  const current = document.getElementById(`post-content-${gossipId}`).innerText;
  const updated = prompt("Edit post:", current);
  if (!updated) return;

  fetch(`${API_BASE}/gossips/${gossipId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: updated }),
  }).then(loadLatestGossips);
}

// ====== SUBMIT GOSSIP ======
if (gossipForm) {
  gossipForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = new FormData(gossipForm);

    const res = await fetch(`${API_BASE}/gossips`, {
      method: "POST",
      body: data
    });

    const result = await res.json();
    if (result.success) {
      gossipForm.reset();
      preview.innerHTML = "";
      loadLatestGossips();
      alert("Gossip posted 💖");
    }
  });
}

// ====== INIT ======
if (gossipContainer) loadLatestGossips();
