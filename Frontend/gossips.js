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
let expanded = false; // 👈 IMPORTANT
const INITIAL_COUNT = 6;

// ====== FETCH ALL GOSSIPS ======
async function fetchAllGossips() {
  try {
    const res = await fetch(`${API_BASE}/gossips`);
    if (!res.ok) throw new Error("Failed to fetch");

    gossipsData = await res.json();
    console.log("TOTAL GOSSIPS:", gossipsData.length); // debug proof

    allGossipsContainer.innerHTML = "";
    expanded = false;

    // Render first 6
    renderGossips(gossipsData.slice(0, INITIAL_COUNT));

    // Add button only if needed
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

    card.innerHTML = `
      ${mediaHTML}
      <div class="card-content">
        <h3>${gossip.diva_name || "Anonymous"}</h3>
        <p>${gossip.content}</p>
      </div>
    `;

    allGossipsContainer.appendChild(card);
  });
}

// ====== VIEW MORE CLICK ======
viewMoreBtn.addEventListener("click", () => {
  if (expanded) return; // 👈 prevent double render

  renderGossips(gossipsData.slice(INITIAL_COUNT));
  expanded = true;
  viewMoreBtn.style.display = "none";
});

// ====== INIT ======
if (allGossipsContainer) {
  fetchAllGossips();
}
