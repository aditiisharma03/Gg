// ====== API BASE URL (LOCAL + LIVE AUTO) ======
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gg-qrk5.onrender.com";

// ====== ELEMENTS ======
const allGossipsContainer = document.getElementById("allGossips");
const loadMoreBtn = document.getElementById("loadMore");

// hide button on page load
if (loadMoreBtn) loadMoreBtn.style.display = "none";

// ====== STATE ======
let gossipsData = [];
let displayed = 0;
const perPage = 6;

// persistent reactions
const reacted = JSON.parse(localStorage.getItem("reacted")) || {};

// ====== FETCH ALL GOSSIPS ======
async function fetchAllGossips() {
  try {
    const res = await fetch(`${API_BASE}/gossips`);
    gossipsData = await res.json();

    displayed = 0;
    allGossipsContainer.innerHTML = "";

    loadMoreGossips();
  } catch (err) {
    console.error(err);
    allGossipsContainer.innerHTML = "<p>Failed to load gossips 💔</p>";
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
  }
}

// ====== LOAD MORE GOSSIPS ======
function loadMoreGossips() {
  const next = gossipsData.slice(displayed, displayed + perPage);

  next.forEach(gossip => {
    reacted[gossip.id] = reacted[gossip.id] || {};

    const card = document.createElement("div");
    card.className = "card";

    let mediaHTML = "";
    if (gossip.media_path) {
      const url = `${API_BASE}${gossip.media_path}`;
      mediaHTML = gossip.media_path.endsWith(".mp4")
        ? `<video src="${url}" controls></video>`
        : `<img src="${url}" />`;
    }

    card.innerHTML = `
      ${mediaHTML}
      <div class="card-content">
        <h3>
          ${gossip.diva_name || "Anonymous"}
          <span class="edit-post" onclick="editPost(${gossip.id})">⋮</span>
        </h3>

        <p id="post-content-${gossip.id}" class="post-text collapsed">
          ${gossip.content}
        </p>

        <span class="read-more" id="read-more-${gossip.id}" onclick="toggleReadMore(${gossip.id})">
          Read more
        </span>

        <div class="reactions">
          ${["❤️","😂","😮","😡"].map(e =>
            `<span onclick="toggleReaction(${gossip.id}, '${e}')">
              ${e} <span id="r-${gossip.id}-${e}">0</span>
            </span>`
          ).join("")}
        </div>

        <div class="comments">
          <div class="comment-list" id="comments-${gossip.id}" style="display:flex;flex-direction:column-reverse"></div>
          <div class="comment-input">
            <input id="input-${gossip.id}" placeholder="Add a comment 💬">
            <button onclick="postComment(${gossip.id})">Post</button>
          </div>
        </div>
      </div>
    `;

    allGossipsContainer.appendChild(card);

    loadReactions(gossip.id);
    loadComments(gossip.id, 2);

    setTimeout(() => checkOverflow(gossip.id), 0);
  });

  displayed += next.length;

  if (loadMoreBtn) {
    loadMoreBtn.style.display =
      displayed < gossipsData.length ? "block" : "none";
  }
}

// ====== READ MORE / LESS ======
function checkOverflow(gossipId) {
  const textEl = document.getElementById(`post-content-${gossipId}`);
  const btn = document.getElementById(`read-more-${gossipId}`);

  if (textEl.scrollHeight <= textEl.clientHeight + 2) {
    btn.style.display = "none";
  } else {
    btn.style.display = "inline-block";
  }
}

function toggleReadMore(gossipId) {
  const textEl = document.getElementById(`post-content-${gossipId}`);
  const btn = document.getElementById(`read-more-${gossipId}`);

  if (textEl.classList.contains("collapsed")) {
    textEl.classList.remove("collapsed");
    textEl.style.maxHeight = "120px";
    textEl.style.overflowY = "auto";
    btn.innerText = "Read less";
  } else {
    textEl.classList.add("collapsed");
    textEl.style.maxHeight = "90px";
    textEl.style.overflowY = "hidden";
    btn.innerText = "Read more";
  }
}

// ====== REACTIONS ======
async function loadReactions(gossipId) {
  const res = await fetch(`${API_BASE}/gossips/${gossipId}/reactions`);
  const data = await res.json();

  data.forEach(r => {
    const el = document.getElementById(`r-${gossipId}-${r.emoji}`);
    if (el) el.innerText = r.count;
  });
}

async function toggleReaction(gossipId, emoji) {
  reacted[gossipId] = reacted[gossipId] || {};
  const hasReacted = reacted[gossipId][emoji] || false;

  await fetch(`${API_BASE}/gossips/${gossipId}/reactions/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emoji,
      action: hasReacted ? "remove" : "add",
    }),
  });

  reacted[gossipId][emoji] = !hasReacted;
  localStorage.setItem("reacted", JSON.stringify(reacted));

  loadReactions(gossipId);
}

// ====== COMMENTS ======
async function loadComments(gossipId, limit) {
  const res = await fetch(`${API_BASE}/gossips/${gossipId}/comments`);
  const comments = await res.json();

  const box = document.getElementById(`comments-${gossipId}`);
  box.innerHTML = "";

  const show = limit ? comments.slice(-limit) : comments;

  show.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<strong>${c.commenter_name || "Anonymous"}:</strong> ${c.comment}`;
    box.appendChild(div);
  });
}

async function postComment(gossipId) {
  const input = document.getElementById(`input-${gossipId}`);
  if (!input.value.trim()) return;

  const name = prompt("Your name:", "Anonymous") || "Anonymous";

  await fetch(`${API_BASE}/gossips/${gossipId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commenter_name: name,
      comment: input.value,
    }),
  });

  input.value = "";
  loadComments(gossipId, 2);
}

// ====== EDIT POST ======
function editPost(gossipId) {
  const contentEl = document.getElementById(`post-content-${gossipId}`);
  const updated = prompt("Edit post:", contentEl.innerText);
  if (!updated) return;

  fetch(`${API_BASE}/gossips/${gossipId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: updated }),
  }).then(fetchAllGossips);
}

// ====== INIT ======
if (allGossipsContainer) fetchAllGossips();
if (loadMoreBtn) loadMoreBtn.onclick = loadMoreGossips;