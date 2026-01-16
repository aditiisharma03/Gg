// ====== API BASE URL ======
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gg-qrk5.onrender.com";

// ====== ELEMENTS ======
const allGossipsContainer = document.getElementById("allGossips");

// Create View More button
const viewMoreBtn = document.createElement("button");
viewMoreBtn.innerText = "View More Gossips 💖";
viewMoreBtn.classList.add("view-more-btn");

// ====== STATE ======
let gossipsData = [];
let expanded = false; // prevent double render
const INITIAL_COUNT = 6;

// ====== FETCH ALL GOSSIPS ======
async function fetchAllGossips() {
  try {
    const res = await fetch(`${API_BASE}/gossips`);
    if (!res.ok) throw new Error("Failed to fetch");

    gossipsData = await res.json();
    allGossipsContainer.innerHTML = "";
    expanded = false;

    renderGossips(gossipsData.slice(0, INITIAL_COUNT));

    if (gossipsData.length > INITIAL_COUNT) {
      viewMoreBtn.style.display = "block";
      allGossipsContainer.after(viewMoreBtn);
    } else {
      viewMoreBtn.style.display = "none";
    }
  } catch (err) {
    console.error(err);
    allGossipsContainer.innerHTML = "<p>Failed to load gossips 💔</p>";
  }
}

// ====== RENDER GOSSIPS ======
function renderGossips(gossips) {
  gossips.forEach(async (gossip) => {
    const card = document.createElement("div");
    card.classList.add("card");

    let mediaHTML = "";
    if (gossip.media_path) {
      const mediaURL = `${API_BASE}${gossip.media_path}`;
      mediaHTML = gossip.media_path.endsWith(".mp4")
        ? `<video src="${mediaURL}" controls></video>`
        : `<img src="${mediaURL}" alt="Gossip Image">`;
    }

    // Card HTML
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

    allGossipsContainer.appendChild(card);

    // Load reactions from backend
    loadReactions(gossip.id);

    // Load comments from backend
    loadComments(gossip.id);
  });
}

// ====== VIEW MORE CLICK ======
viewMoreBtn.addEventListener("click", () => {
  if (expanded) return;
  renderGossips(gossipsData.slice(INITIAL_COUNT));
  expanded = true;
  viewMoreBtn.style.display = "none";
});

// ====== REACTIONS ======
async function loadReactions(gossipId) {
  try {
    const res = await fetch(`${API_BASE}/gossips/${gossipId}/reactions`);
    const data = await res.json();
    data.forEach(r => {
      const counter = document.getElementById(`r-${gossipId}-${r.emoji}`);
      if (counter) counter.innerText = r.count;
    });
  } catch (err) {
    console.error("Failed to load reactions:", err);
  }
}

async function react(gossipId, emoji) {
  try {
    // Toggle: if count > 0, remove; else add
    const counter = document.getElementById(`r-${gossipId}-${emoji}`);
    const current = parseInt(counter.innerText);
    const action = current > 0 ? "remove" : "add";

    await fetch(`${API_BASE}/gossips/${gossipId}/reactions/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, action })
    });

    // Reload reactions
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
    comments.forEach(c => {
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
      body: JSON.stringify({ commenter_name: "Anonymous", comment: text })
    });

    input.value = "";
    loadComments(gossipId);
  } catch (err) {
    console.error("Failed to add comment:", err);
  }
}

// ====== INIT ======
if (allGossipsContainer) {
  fetchAllGossips();
}
