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
    console.log("TOTAL GOSSIPS:", gossipsData.length);

    allGossipsContainer.innerHTML = "";
    expanded = false;

    // Render first 6
    renderGossips(gossipsData.slice(0, INITIAL_COUNT));

    // Show "View More" if needed
    if (gossipsData.length > INITIAL_COUNT) {
      viewMoreBtn.style.display = "block";
      allGossipsContainer.after(viewMoreBtn);
    } else {
      viewMoreBtn.style.display = "none";
    }
  } catch (err) {
    console.error(err);
    allGossipsContainer.innerHTML =
      "<p>Failed to load gossips 💔</p>";
  }
}

// ====== RENDER GOSSIPS ======
function renderGossips(gossips) {
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

    // Card HTML with reactions + comments
    card.innerHTML = `
      ${mediaHTML}
      <div class="card-content">
        <h3>${gossip.diva_name || "Anonymous"}</h3>
        <p>${gossip.content}</p>

        <!-- Emoji Reactions -->
        <div class="reactions">
          <span onclick="react(${gossip.id}, '❤️')">❤️ <span id="r-${gossip.id}-❤️">0</span></span>
          <span onclick="react(${gossip.id}, '😂')">😂 <span id="r-${gossip.id}-😂">0</span></span>
          <span onclick="react(${gossip.id}, '😮')">😮 <span id="r-${gossip.id}-😮">0</span></span>
          <span onclick="react(${gossip.id}, '😡')">😡 <span id="r-${gossip.id}-😡">0</span></span>
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
  });
}

// ====== VIEW MORE CLICK ======
viewMoreBtn.addEventListener("click", () => {
  if (expanded) return;

  renderGossips(gossipsData.slice(INITIAL_COUNT));
  expanded = true;
  viewMoreBtn.style.display = "none";
});

// ====== EMOJI REACTIONS (FRONTEND ONLY) ======
function react(gossipId, emoji) {
  const counter = document.getElementById(`r-${gossipId}-${emoji}`);
  if (!counter) return;

  counter.innerText = parseInt(counter.innerText) + 1;
}

// ====== COMMENTS (FRONTEND ONLY) ======
function addComment(event, gossipId) {
  if (event.key !== "Enter") return;

  const input = event.target;
  const text = input.value.trim();
  if (!text) return;

  const commentList = document.getElementById(`comments-${gossipId}`);

  const comment = document.createElement("div");
  comment.classList.add("comment");
  comment.innerText = text;

  commentList.appendChild(comment);
  input.value = "";
}

// ====== INIT ======
if (allGossipsContainer) {
  fetchAllGossips();
}
