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

// ====== FETCH LATEST GOSSIPS FOR HOME PAGE ======
const gossipContainer = document.getElementById("gossipCards");

async function loadLatestGossips() {
  if (!gossipContainer) return; // Skip if container not on this page

  try {
    const res = await fetch("http://localhost:3000/gossips/latest");
    const gossips = await res.json();

    gossipContainer.innerHTML = ""; // Clear old content

    gossips.forEach(gossip => {
      const card = document.createElement("div");
      card.classList.add("card");

      // Handle media (image/video)
      let mediaHTML = "";
      if (gossip.media_path) {
        if (gossip.media_path.endsWith(".mp4")) {
          mediaHTML = `<video src="http://localhost:3000${gossip.media_path}" controls></video>`;
        } else {
          mediaHTML = `<img src="http://localhost:3000${gossip.media_path}" alt="Gossip Image">`;
        }
      } else {
        mediaHTML = ""; // no static fallback, optional media
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

// Load latest gossips on page load
loadLatestGossips();

// ====== SUBMIT GOSSIP FORM ======
const gossipForm = document.getElementById("gossipForm");

if (gossipForm) {
  gossipForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(gossipForm);
    const diva_name = formData.get("diva_name");
    const content = formData.get("content");

    if (!content.trim()) {
      alert("Please enter your gossip 💖");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/gossips", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert("Gossip posted successfully! 💌");
        gossipForm.reset();
        preview.innerHTML = "";
        loadLatestGossips(); // Refresh latest gossips
      } else {
        alert("Failed to post gossip 💔");
      }
    } catch (err) {
      console.error("Error posting gossip:", err);
      alert("Error posting gossip 💔");
    }
  });
}
const contactForm = document.getElementById("contactForm");
contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(contactForm);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch("http://localhost:3000/contact", {
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
document.getElementById("cancelGossip").addEventListener("click", () => {
  document.getElementById("gossipForm").reset();
  document.getElementById("preview").innerHTML = "";
});
