// ====== API BASE URL (LOCAL + LIVE AUTO) ======
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gg-qrk5.onrender.com"; // 👈 apna backend URL

// ====== ALL GOSSIPS PAGE SCRIPT ======
const allGossipsContainer = document.getElementById("allGossips");
const loadMoreBtn = document.getElementById("loadMore");

let gossipsData = [];
let displayed = 0;
const perPage = 6;

// Fetch all gossips from backend
async function fetchAllGossips() {
  try {
    const res = await fetch(`${API_BASE}/gossips`);
    if (!res.ok) throw new Error("Network response was not ok");

    gossipsData = await res.json();
    displayed = 0;
    allGossipsContainer.innerHTML = "";
    loadMoreGossips(); // first batch
  } catch (err) {
    console.error("Failed to fetch gossips:", err);
    allGossipsContainer.innerHTML = "<p>Failed to load gossips 💔</p>";
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
  }
}

// Load next batch
function loadMoreGossips() {
  const next = gossipsData.slice(displayed, displayed + perPage);

  next.forEach((gossip) => {
    const card = document.createElement("div");
    card.classList.add("card");

    let mediaHTML = "";
    if (gossip.media_path) {
      const mediaURL = `${API_BASE}${gossip.media_path}`;
      if (gossip.media_path.endsWith(".mp4")) {
        mediaHTML = `<video src="${mediaURL}" controls></video>`;
      } else {
        mediaHTML = `<img src="${mediaURL}" alt="Gossip Image">`;
      }
    }

    card.innerHTML = `
      ${mediaHTML}
      <div class="card-content">
        <h3>${gossip.diva_name || "Anonymous"}</h3>
        <p>${gossip.content}</p>
      </div>
    `;

    allGossipsContainer.appendChild(card);
  });

  displayed += next.length;

  // Show / hide Load More button
  if (displayed >= gossipsData.length) {
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
  } else {
    if (loadMoreBtn) loadMoreBtn.style.display = "block";
  }
}

// Load more button click
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", loadMoreGossips);
}

// Initial load
if (allGossipsContainer) {
  fetchAllGossips();
}
