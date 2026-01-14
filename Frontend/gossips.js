// ====== ALL GOSSIPS PAGE SCRIPT ======

const allGossipsContainer = document.getElementById("allGossips");
const loadMoreBtn = document.getElementById("loadMore");

let gossipsData = [];
let displayed = 0;
const perPage = 6;

// Fetch all gossips from backend
async function fetchAllGossips() {
  try {
    const res = await fetch("http://localhost:3000/gossips");
    if (!res.ok) throw new Error("Network response was not ok");
    gossipsData = await res.json();
    displayed = 0;
    allGossipsContainer.innerHTML = "";
    loadMoreGossips(); // Load first batch
  } catch (err) {
    console.error("Failed to fetch gossips:", err);
    allGossipsContainer.innerHTML = "<p>Failed to load gossips 💔</p>";
    loadMoreBtn.style.display = "none";
  }
}

// Load next batch of gossips
function loadMoreGossips() {
  const next = gossipsData.slice(displayed, displayed + perPage);

  next.forEach(gossip => {
    const card = document.createElement("div");
    card.classList.add("card");

    // Handle media (image/video)
    let mediaHTML = "";
    if (gossip.media_path) {
      // Prepend backend URL to media path
      const mediaURL = `http://localhost:3000${gossip.media_path}`;
      if (gossip.media_path.endsWith(".mp4")) {
        mediaHTML = `<video src="${mediaURL}" controls></video>`;
      } else {
        mediaHTML = `<img src="${mediaURL}" alt="Gossip Image">`;
      }
    } else {
      mediaHTML = ""; // no default image
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

  // Hide button if all gossips loaded
  if (displayed >= gossipsData.length) {
    loadMoreBtn.style.display = "none";
  } else {
    loadMoreBtn.style.display = "block";
  }
}

// Event listener for Load More button
if (loadMoreBtn) loadMoreBtn.addEventListener("click", loadMoreGossips);

// Fetch gossips when page loads
if (allGossipsContainer) fetchAllGossips();
