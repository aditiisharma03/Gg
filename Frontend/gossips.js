// ====== API BASE URL ======
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gg-qrk5.onrender.com";

// ====== ELEMENTS ======
const allGossipsContainer = document.getElementById("allGossips");

// View More button
const viewMoreBtn = document.createElement("button");
viewMoreBtn.innerText = "View More Gossips 💖";
viewMoreBtn.classList.add("view-more-btn");

// ====== STATE ======
let gossipsData = [];
let expanded = false; // prevent double render
const INITIAL_COUNT = 6;

// Track which emojis have been reacted to (per gossipId)
const reacted = {}; // e.g., { 1: { "❤️": true, "😂": false } }

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
  gossips.forEach((gossip) => {
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
        <h3>${gossip.diva_name || "Anonymous"}</h3>
        <p>${gossip.content}</p>

        <!-- Emoji Reactions -->
        <div class="reactions">
          ${["❤️", "😂", "😮", "😡"].map(
            (emoji) => `
            <span onclick="toggleReaction(${gossip.id}, '${emoji}')" style="cursor:pointer;">
              ${emoji} <span id="r-${gossip.id}-${emoji}">0</span>
            </span>
          `
          ).join("")}
        </div>

        <!-- Comments -->
        <div class="comments">
          <div class="comment-list" id="comments-${gossip.id}" style="display:flex; flex-direction:column-reverse;"></div>
          <div class="comment-input">
            <input type="text" id="input-${gossip.id}" placeholder="Add a comment 💬" />
            <button onclick="postComment(${gossip.id})">Post</button>
          </div>
        </div>
      </div>
    `;

    allGossipsContainer.appendChild(card);
  });
}

// ====== VIEW MORE CLICK ======
viewMoreBtn.addEventListener("click", () => {
  if (expanded) return;

  renderGossips(gossipsData.slice(INITIAL_COUNT));
  expanded = true;
  viewMoreBtn.style.display = "none";
});

// ====== TOGGLE REACTION ======
function toggleReaction(gossipId, emoji) {
  const counter = document.getElementById(`r-${gossipId}-${emoji}`);
  if (!counter) return;

  reacted[gossipId][emoji] = !reacted[gossipId][emoji]; // toggle

  if (reacted[gossipId][emoji]) {
    counter.innerText = parseInt(counter.innerText) + 1;
  } else {
    counter.innerText = Math.max(0, parseInt(counter.innerText) - 1);
  }
}

// ====== POST COMMENT ======
function postComment(gossipId) {
  const input = document.getElementById(`input-${gossipId}`);
  let text = input.value.trim();
  if (!text) return;

  // Ask for name if not provided
  const commenterName = prompt("Enter your name:", "Anonymous") || "Anonymous";

  const commentList = document.getElementById(`comments-${gossipId}`);
  const comment = document.createElement("div");
  comment.classList.add("comment");
  comment.innerHTML = `<strong>${commenterName}:</strong> ${text}`;

  commentList.prepend(comment); // last of flexbox
  input.value = "";
}

// ====== INIT ======
if (allGossipsContainer) {
  fetchAllGossips();
}
