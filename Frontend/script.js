// ====== API BASE URL (LOCAL + LIVE AUTO) ======
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gg-qrk5.onrender.com"; // 👈 apna backend URL

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
      img.alt = "Preview Image";
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
        if (gossip.media_path.endsWith(".mp4")) {
          mediaHTML = `<video src="${API_BASE}${gossip.media_path}" controls></video>`;
        } else {
          mediaHTML = `<img src="${API_BASE}${gossip.media_path}" alt="Gossip Image">`;
        }
      }

      card.innerHTML = `
        ${mediaHTML}
        <div class="card-content">
          <h3>${gossip.diva_name || "Anonymous"}</h3>
          <p>${gossip.content}</p>
        </div>
      `;

      gossipContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load gossips:", err);
    gossipContainer.innerHTML = "<p>Failed to load gossips 💔</p>";
  }
}

loadLatestGossips();

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
