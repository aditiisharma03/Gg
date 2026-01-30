// ====== CONFIGURATION ======
const API_BASE = location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "https://gg-qrk5.onrender.com";

// ====== STATE ======
let allGossips = [];
let displayedGossips = [];
const userReactions = JSON.parse(localStorage.getItem("userReactions")) || {};
const userComments = JSON.parse(localStorage.getItem("userComments")) || {};
const GOSSIPS_PER_PAGE = 3;

// ====== ELEMENTS ======
const gossipContainer = document.getElementById("gossipCards");
const gossipForm = document.getElementById("gossipForm");
const preview = document.getElementById("preview");
const mediaInput = document.getElementById("mediaInput");
const cancelBtn = document.getElementById("cancelGossip");
const loadMoreBtn = document.getElementById("loadMore");

// ====== STYLES ======
const styles = `
  /* Notifications */
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 10px;
    background: white;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 15px;
    animation: slideInRight 0.3s ease;
    border-left: 4px solid #ff4da6;
    max-width: 350px;
  }
  
  .notification.info { border-left-color: #4da6ff; }
  .notification.success { border-left-color: #4dffb8; }
  .notification.error { border-left-color: #ff4d4d; }
  
  .notification span {
    flex: 1;
    color: #333;
  }
  
  .notification button {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 18px;
  }
  
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  /* Loading Spinner */
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #ffe6f2;
    border-top-color: #ff4da6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Card Styles */
  .card {
    background: white;
    border-radius: 15px;
    margin: 20px auto;
    max-width: 500px;
    box-shadow: 0 5px 20px rgba(255, 77, 166, 0.1);
    border: 1px solid #ffe6f2;
    overflow: hidden;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .card-user {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(45deg, #ff4da6, #ff66b2);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 18px;
  }
  
  .username {
    font-weight: 600;
    color: #333;
  }
  
  .post-time {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }
  
  .three-dots-menu {
    position: relative;
  }
  
  .dots-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
    padding: 5px;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dots-btn:hover {
    background: #f5f5f5;
  }
  
  .menu-dropdown {
    position: absolute;
    top: 40px;
    right: 0;
    background: white;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
    display: none;
    min-width: 150px;
    z-index: 100;
  }
  
  .menu-dropdown.show {
    display: block;
    animation: fadeIn 0.2s ease;
  }
  
  .menu-dropdown button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 15px;
    border: none;
    background: none;
    cursor: pointer;
    color: #333;
    font-size: 14px;
    text-align: left;
  }
  
  .menu-dropdown button:hover {
    background: #f5f5f5;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .card-content {
    padding: 15px;
    color: #333;
    line-height: 1.5;
  }
  
  .card-actions {
    display: flex;
    gap: 10px;
    padding: 0 15px 15px;
  }
  
  .action-btn {
    background: #f8f8f8;
    border: none;
    border-radius: 20px;
    padding: 8px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    transition: all 0.2s ease;
  }
  
  .action-btn:hover {
    background: #f0f0f0;
    transform: translateY(-2px);
  }
  
  .action-btn.active {
    background: #ffe6f2;
    color: #ff4da6;
  }
  
  .likes-count {
    padding: 0 15px 10px;
    color: #666;
    font-size: 14px;
    font-weight: 500;
  }
  
  /* View Comments Button */
  .view-comments-btn {
    background: none;
    border: none;
    color: #ff4da6;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 15px;
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 0 auto;
  }
  
  .view-comments-btn .arrow {
    font-size: 12px;
    transition: transform 0.3s ease;
  }
  
  .view-comments-btn.expanded .arrow {
    transform: rotate(180deg);
  }
  
  /* Comments Section */
  .comments-section {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    padding: 0 15px;
  }
  
  .comments-section.expanded {
    max-height: 1000px;
  }
  
  .comment {
    display: flex;
    gap: 12px;
    padding: 15px 0;
    border-top: 1px solid #f0f0f0;
  }
  
  .comment-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(45deg, #4da6ff, #66b3ff);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    flex-shrink: 0;
  }
  
  .comment-avatar.small {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .comment-content {
    flex: 1;
  }
  
  .comment-username {
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }
  
  .comment-text {
    color: #333;
    margin: 5px 0;
    font-size: 14px;
    line-height: 1.4;
  }
  
  .comment-actions {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-top: 5px;
  }
  
  .comment-action {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
  }
  
  .comment-time {
    font-size: 12px;
    color: #999;
  }
  
  .no-comments {
    text-align: center;
    color: #999;
    padding: 20px;
    font-style: italic;
  }
  
  /* Add Comment */
  .add-comment {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
  }
  
  .comment-input-wrapper {
    flex: 1;
  }
  
  .comment-input {
    width: 100%;
    padding: 10px 15px;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.3s ease;
  }
  
  .comment-input:focus {
    border-color: #ff4da6;
  }
  
  .comment-submit {
    background: linear-gradient(45deg, #ff4da6, #ff66b2);
    color: white;
    border: none;
    border-radius: 20px;
    padding: 10px 20px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
  }
  
  .comment-submit:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 77, 166, 0.3);
  }
  
  /* Media Preview */
  #preview img,
  #preview video {
    width: 100%;
    max-height: 400px;
    border-radius: 10px;
    object-fit: cover;
    margin-top: 10px;
  }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ====== UTILITY FUNCTIONS ======
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">✕</button>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }, 4000);
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) return `${diffDay}d`;
  if (diffHour > 0) return `${diffHour}h`;
  if (diffMin > 0) return `${diffMin}m`;
  return 'Just now';
}

function getInitials(name) {
  if (!name || name === 'Anonymous') return 'A';
  const names = name.split(' ');
  if (names.length > 1) {
    return (names[0][0] + names[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function createMediaElement(gossip) {
  if (!gossip.media_path) return '';
  
  const mediaURL = `${API_BASE}${gossip.media_path}`;
  const isVideo = gossip.media_path.match(/\.(mp4|webm|mov)$/i);
  
  if (isVideo) {
    return `
      <div style="padding: 15px 15px 0;">
        <video src="${mediaURL}" controls style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px;"></video>
      </div>
    `;
  } else {
    return `
      <div style="padding: 15px 15px 0;">
        <img src="${mediaURL}" alt="Gossip image" loading="lazy" 
             style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px; cursor: pointer;"
             onclick="openFullscreen(this.src)">
      </div>
    `;
  }
}

function openFullscreen(src) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
  `;
  
  modal.appendChild(img);
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
}

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
});

async function initializeApp() {
  if (gossipContainer) {
    await loadGossips();
  }
}

function setupEventListeners() {
  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      gossipForm.reset();
      if (preview) preview.innerHTML = '';
      showNotification('Form cleared ✨', 'info');
    });
  }
  
  // Media preview
  if (mediaInput && preview) {
    mediaInput.addEventListener('change', handleMediaPreview);
  }
  
  // Form submission
  if (gossipForm) {
    gossipForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Load More button now opens gossip.html
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'gossip.html';
    });
  }
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.three-dots-menu')) {
      document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
  });
}

// ====== GOSSIP FUNCTIONS ======
async function loadGossips() {
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/gossips/latest`);
    if (!response.ok) throw new Error('Failed to fetch gossips');
    
    const gossips = await response.json();
    allGossips = gossips;
    displayedGossips = allGossips.slice(0, GOSSIPS_PER_PAGE);
    
    renderGossips();
    
  } catch (error) {
    console.error('Error loading gossips:', error);
    showError('Failed to load gossips');
  }
}

function showLoading() {
  if (gossipContainer) {
    gossipContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="loading-spinner"></div>
        <p style="color: #ff4da6; margin-top: 10px;">Loading gossips... 💖</p>
      </div>
    `;
  }
}

function showError(message) {
  if (gossipContainer) {
    gossipContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; color: #ff4da6; margin-bottom: 20px;">💔</div>
        <p style="color: #ff4da6; margin-bottom: 20px;">${message}</p>
        <button onclick="loadGossips()" style="
          background: linear-gradient(45deg, #ff4da6, #ff66b2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
        ">Try Again</button>
      </div>
    `;
  }
}

function renderGossips() {
  if (!gossipContainer) return;
  
  if (displayedGossips.length === 0) {
    gossipContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; color: #ff4da6; margin-bottom: 20px;">🌸</div>
        <p style="color: #ff4da6; font-size: 18px; margin-bottom: 10px;">No gossips yet!</p>
        <p style="color: #ff66b2;">Be the first to share something juicy 💖</p>
      </div>
    `;
    return;
  }
  
  gossipContainer.innerHTML = '';
  
  displayedGossips.forEach(gossip => {
    const card = createGossipCard(gossip);
    gossipContainer.appendChild(card);
  });
}

function createGossipCard(gossip) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = gossip.id;
  
  // Initialize user reactions for this gossip
  if (!userReactions[gossip.id]) {
    userReactions[gossip.id] = { liked: false };
  }
  
  const initials = getInitials(gossip.diva_name);
  const timeAgo = formatTimeAgo(gossip.created_at || new Date());
  const mediaHTML = createMediaElement(gossip);
  
  card.innerHTML = `
    ${mediaHTML}
    
    <div class="card-header">
      <div class="card-user">
        <div class="user-avatar">${initials}</div>
        <div>
          <div class="username">${gossip.diva_name || 'Anonymous'}</div>
          <div class="post-time">${timeAgo}</div>
        </div>
      </div>
      <div class="three-dots-menu">
        <button class="dots-btn" onclick="toggleMenu(${gossip.id})">⋯</button>
        <div class="menu-dropdown" id="menu-${gossip.id}">
          <button onclick="editPost(${gossip.id})">
            <span>✏️</span> Edit
          </button>
          <button onclick="reportPost(${gossip.id})">
            <span>🚨</span> Report
          </button>
          <button onclick="deletePost(${gossip.id})">
            <span>🗑️</span> Delete
          </button>
        </div>
      </div>
    </div>
    
    <div class="card-content">
      <p>${gossip.content}</p>
    </div>
    
    <div class="card-actions">
      <button class="action-btn like-btn ${userReactions[gossip.id]?.liked ? 'active' : ''}" 
              onclick="toggleLike(${gossip.id})">
        ${userReactions[gossip.id]?.liked ? '❤️ Liked' : '🤍 Like'}
        <span class="like-count" id="like-count-${gossip.id}">${gossip.total_reactions || 0}</span>
      </button>
      <button class="action-btn comment-btn" onclick="toggleComments(${gossip.id})">
        💬 Comment
      </button>
      <button class="action-btn share-btn" onclick="sharePost(${gossip.id})">
        🔄 Share
      </button>
    </div>
    
    <!-- View Comments Button -->
    <div style="text-align: center;">
      <button class="view-comments-btn" onclick="toggleComments(${gossip.id})" id="view-comments-${gossip.id}">
        <span class="arrow">↓</span> View comments (${gossip.comment_count || 0})
      </button>
    </div>
    
    <!-- Comments Section -->
    <div class="comments-section" id="comments-${gossip.id}">
      <div class="no-comments">Loading comments...</div>
    </div>
    
    <div class="add-comment">
      <div class="comment-avatar small">${getInitials('You')}</div>
      <div class="comment-input-wrapper">
        <input type="text" 
               class="comment-input" 
               id="comment-input-${gossip.id}" 
               placeholder="Add a comment..."
               onkeypress="if(event.key === 'Enter') postComment(${gossip.id})">
      </div>
      <button class="comment-submit" onclick="postComment(${gossip.id})">Post</button>
    </div>
  `;
  
  // Load comments from cache or server
  setTimeout(() => {
    loadComments(gossip.id);
  }, 100);
  
  return card;
}

// ====== MENU FUNCTIONS ======
function toggleMenu(gossipId) {
  const menu = document.getElementById(`menu-${gossipId}`);
  if (!menu) return;
  
  // Close other menus
  document.querySelectorAll('.menu-dropdown').forEach(m => {
    if (m.id !== `menu-${gossipId}`) m.classList.remove('show');
  });
  
  menu.classList.toggle('show');
}

async function editPost(gossipId) {
  const currentContent = document.querySelector(`.card[data-id="${gossipId}"] .card-content p`)?.textContent || '';
  const newContent = prompt('Edit your gossip:', currentContent);
  
  if (newContent === null || newContent === currentContent) {
    toggleMenu(gossipId);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent })
    });
    
    if (response.ok) {
      const contentElement = document.querySelector(`.card[data-id="${gossipId}"] .card-content p`);
      if (contentElement) contentElement.textContent = newContent;
      showNotification('Gossip updated! ✨', 'success');
    } else {
      throw new Error('Failed to update');
    }
  } catch (error) {
    showNotification('Failed to update gossip 💔', 'error');
  }
  
  toggleMenu(gossipId);
}

async function reportPost(gossipId) {
  const reason = prompt('Why are you reporting this post?');
  if (!reason) {
    toggleMenu(gossipId);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    if (response.ok) {
      showNotification('Post reported successfully 🚨', 'success');
    } else {
      throw new Error('Failed to report');
    }
  } catch (error) {
    showNotification('Failed to report post 💔', 'error');
  }
  
  toggleMenu(gossipId);
}

async function deletePost(gossipId) {
  if (!confirm('Are you sure you want to delete this post?')) {
    toggleMenu(gossipId);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      document.querySelector(`.card[data-id="${gossipId}"]`)?.remove();
      showNotification('Post deleted 🗑️', 'success');
    } else {
      throw new Error('Failed to delete');
    }
  } catch (error) {
    showNotification('Failed to delete post 💔', 'error');
  }
  
  toggleMenu(gossipId);
}

// ====== OPTIMIZED LIKE FUNCTIONS ======
async function toggleLike(gossipId) {
  const isLiked = userReactions[gossipId]?.liked || false;
  const likeBtn = document.querySelector(`.card[data-id="${gossipId}"] .like-btn`);
  const likeCountElement = document.getElementById(`like-count-${gossipId}`);
  
  if (!likeBtn || !likeCountElement) return;
  
  // Show immediate feedback (optimistic update)
  const currentCount = parseInt(likeCountElement.textContent) || 0;
  const newCount = isLiked ? currentCount - 1 : currentCount + 1;
  
  // Update UI immediately
  likeCountElement.textContent = newCount;
  likeBtn.innerHTML = !isLiked ? 
    `❤️ Liked <span class="like-count">${newCount}</span>` : 
    `🤍 Like <span class="like-count">${newCount}</span>`;
  likeBtn.classList.toggle('active', !isLiked);
  
  // Animation
  likeBtn.style.transform = 'scale(1.1)';
  setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);
  
  try {
    const endpoint = !isLiked ? 'add' : 'toggle';
    const body = !isLiked ? 
      JSON.stringify({ emoji: '❤️' }) : 
      JSON.stringify({ emoji: '❤️', action: 'remove' });
    
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/reactions/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    
    if (response.ok) {
      const result = await response.json();
      userReactions[gossipId] = userReactions[gossipId] || {};
      userReactions[gossipId].liked = !isLiked;
      localStorage.setItem('userReactions', JSON.stringify(userReactions));
      
      // Update with server count (in case of race conditions)
      likeCountElement.textContent = result.count || newCount;
      
      showNotification(!isLiked ? 'Liked! ❤️' : 'Like removed', 'success');
    } else {
      // Rollback on error
      likeCountElement.textContent = currentCount;
      likeBtn.innerHTML = isLiked ? 
        `❤️ Liked <span class="like-count">${currentCount}</span>` : 
        `🤍 Like <span class="like-count">${currentCount}</span>`;
      likeBtn.classList.toggle('active', isLiked);
      throw new Error('Failed to update like');
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    showNotification('Failed to update like 💔', 'error');
  }
}

// Simplified reaction loading - only loads when needed
async function loadReactions(gossipId) {
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/reactions`);
    if (!response.ok) return;
    
    const reactions = await response.json();
    const likeReaction = reactions.find(r => r.emoji === '❤️');
    const likesCount = likeReaction ? likeReaction.count : 0;
    
    const likeCountElement = document.getElementById(`like-count-${gossipId}`);
    if (likeCountElement) {
      likeCountElement.textContent = likesCount;
    }
  } catch (error) {
    console.error('Error loading reactions:', error);
  }
}

// ====== OPTIMIZED COMMENT FUNCTIONS ======
async function toggleComments(gossipId) {
  const commentsSection = document.getElementById(`comments-${gossipId}`);
  const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
  
  if (!commentsSection || !viewCommentsBtn) return;
  
  const isExpanded = commentsSection.classList.contains('expanded');
  
  if (!isExpanded) {
    // Load comments if not already loaded
    if (commentsSection.querySelector('.no-comments')?.textContent === 'Loading comments...') {
      await loadComments(gossipId);
    }
  }
  
  // Toggle classes
  commentsSection.classList.toggle('expanded');
  viewCommentsBtn.classList.toggle('expanded');
  
  // Update button text
  const arrow = isExpanded ? '↓' : '↑';
  const text = isExpanded ? 'View' : 'Hide';
  const commentCount = userComments[gossipId]?.length || 0;
  viewCommentsBtn.innerHTML = `<span class="arrow">${arrow}</span> ${text} comments (${commentCount})`;
}

async function loadComments(gossipId) {
  const commentsContainer = document.getElementById(`comments-${gossipId}`);
  if (!commentsContainer) return;
  
  // Check if we already have comments cached
  if (userComments[gossipId] && userComments[gossipId].length > 0) {
    displayCachedComments(gossipId);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/comments`);
    if (!response.ok) return;
    
    const comments = await response.json();
    userComments[gossipId] = comments;
    localStorage.setItem('userComments', JSON.stringify(userComments));
    
    displayComments(gossipId, comments);
    
  } catch (error) {
    console.error('Error loading comments:', error);
    commentsContainer.innerHTML = '<div class="no-comments">Error loading comments 💔</div>';
  }
}

function displayCachedComments(gossipId) {
  const commentsContainer = document.getElementById(`comments-${gossipId}`);
  const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
  const comments = userComments[gossipId] || [];
  
  if (comments.length === 0) {
    commentsContainer.innerHTML = '<div class="no-comments">No comments yet. Be the first! 💬</div>';
    
    if (viewCommentsBtn) {
      const isExpanded = viewCommentsBtn.classList.contains('expanded');
      const arrow = isExpanded ? '↑' : '↓';
      const text = isExpanded ? 'Hide' : 'View';
      viewCommentsBtn.innerHTML = `<span class="arrow">${arrow}</span> ${text} comments (0)`;
    }
    return;
  }
  
  commentsContainer.innerHTML = comments.map(comment => createCommentHTML(comment)).join('');
  
  if (viewCommentsBtn) {
    const commentCount = comments.length;
    const isExpanded = viewCommentsBtn.classList.contains('expanded');
    const arrow = isExpanded ? '↑' : '↓';
    const text = isExpanded ? 'Hide' : 'View';
    viewCommentsBtn.innerHTML = `<span class="arrow">${arrow}</span> ${text} comments (${commentCount})`;
  }
}

function displayComments(gossipId, comments) {
  const commentsContainer = document.getElementById(`comments-${gossipId}`);
  const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
  
  if (comments.length === 0) {
    commentsContainer.innerHTML = '<div class="no-comments">No comments yet. Be the first! 💬</div>';
    
    if (viewCommentsBtn) {
      const isExpanded = viewCommentsBtn.classList.contains('expanded');
      const arrow = isExpanded ? '↑' : '↓';
      const text = isExpanded ? 'Hide' : 'View';
      viewCommentsBtn.innerHTML = `<span class="arrow">${arrow}</span> ${text} comments (0)`;
    }
    return;
  }
  
  commentsContainer.innerHTML = comments.map(comment => createCommentHTML(comment)).join('');
  
  if (viewCommentsBtn) {
    const commentCount = comments.length;
    const isExpanded = viewCommentsBtn.classList.contains('expanded');
    const arrow = isExpanded ? '↑' : '↓';
    const text = isExpanded ? 'Hide' : 'View';
    viewCommentsBtn.innerHTML = `<span class="arrow">${arrow}</span> ${text} comments (${commentCount})`;
  }
}

function createCommentHTML(comment) {
  const initials = getInitials(comment.commenter_name);
  const timeAgo = formatTimeAgo(comment.created_at || new Date());
  
  return `
    <div class="comment">
      <div class="comment-avatar">${initials}</div>
      <div class="comment-content">
        <div class="comment-username">${comment.commenter_name || 'Anonymous'}</div>
        <div class="comment-text">${comment.comment}</div>
        <div class="comment-actions">
          <button class="comment-action" onclick="likeComment(${comment.id})">Like</button>
          <div class="comment-time">${timeAgo}</div>
        </div>
      </div>
    </div>
  `;
}

async function postComment(gossipId) {
  const input = document.getElementById(`comment-input-${gossipId}`);
  if (!input || !input.value.trim()) {
    showNotification('Please enter a comment! 💬', 'info');
    return;
  }
  
  const commenterName = prompt('Your name (optional):', 'Anonymous') || 'Anonymous';
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commenter_name: commenterName,
        comment: input.value.trim()
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Clear input
      input.value = '';
      
      // Add comment to cache
      if (!userComments[gossipId]) {
        userComments[gossipId] = [];
      }
      userComments[gossipId].unshift(result.comment);
      localStorage.setItem('userComments', JSON.stringify(userComments));
      
      // Update display
      displayComments(gossipId, userComments[gossipId]);
      
      showNotification('Comment posted! 💬', 'success');
      
      // Auto-expand comments section
      const commentsSection = document.getElementById(`comments-${gossipId}`);
      const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
      
      if (commentsSection && !commentsSection.classList.contains('expanded')) {
        commentsSection.classList.add('expanded');
        if (viewCommentsBtn) {
          viewCommentsBtn.classList.add('expanded');
          viewCommentsBtn.innerHTML = `<span class="arrow">↑</span> Hide comments (${userComments[gossipId].length})`;
        }
      }
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    showNotification('Failed to post comment 💔', 'error');
  }
}

async function likeComment(commentId) {
  showNotification('Comment liked! 👍', 'success');
}

// ====== FORM HANDLING ======
function handleMediaPreview() {
  if (!preview) return;
  
  preview.innerHTML = '';
  const file = mediaInput.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  if (file.type.startsWith('image')) {
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px;';
    preview.appendChild(img);
  } else if (file.type.startsWith('video')) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.cssText = 'width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px;';
    preview.appendChild(video);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = gossipForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.textContent = 'Posting... ✨';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(gossipForm);
    const content = formData.get('content');
    
    if (!content || content.trim().length < 3) {
      throw new Error('Please enter at least 3 characters for your gossip');
    }
    
    const response = await fetch(`${API_BASE}/gossips`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.id) {
      // Reset form
      gossipForm.reset();
      if (preview) preview.innerHTML = '';
      
      // Show success notification
      showNotification('Gossip posted successfully! 💖', 'success');
      
      // Reload gossips to show the new post
      await loadGossips();
      
      // Scroll to top to show the new gossip
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      throw new Error(result.error || 'Failed to post gossip');
    }
  } catch (error) {
    console.error('Error posting gossip:', error);
    showNotification(error.message || 'Failed to post gossip 💔', 'error');
  } finally {
    // Restore button state
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// ====== SHARE FUNCTION ======
async function sharePost(gossipId) {
  try {
    const gossipCard = document.querySelector(`.card[data-id="${gossipId}"]`);
    if (!gossipCard) return;
    
    const content = gossipCard.querySelector('.card-content p')?.textContent || '';
    const author = gossipCard.querySelector('.username')?.textContent || 'Anonymous';
    const time = gossipCard.querySelector('.post-time')?.textContent || '';
    
    const shareText = `Check out this gossip from ${author} (${time}):\n\n"${content}"\n\n👀 See more at: ${window.location.href}`;
    
    if (navigator.share) {
      // Use Web Share API if available
      await navigator.share({
        title: 'Diva Drama',
        text: shareText,
        url: window.location.href
      });
      showNotification('Shared successfully! 🔄', 'success');
    } else if (navigator.clipboard) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      showNotification('Copied to clipboard! 📋', 'success');
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('Copied to clipboard! 📋', 'success');
    }
  } catch (error) {
    console.error('Error sharing:', error);
    if (error.name !== 'AbortError') {
      showNotification('Failed to share 💔', 'error');
    }
  }
}

// ====== INFINITE SCROLL FOR GOSSIP.HTML ======
let isLoading = false;
let currentPage = 1;

// Only initialize infinite scroll on gossip.html
if (window.location.pathname.includes('gossip.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    await initializeInfiniteScroll();
    setupInfiniteScroll();
  });
}

async function initializeInfiniteScroll() {
  try {
    // Load first page
    await loadGossipsPage(1);
    
    // Add load more button initially
    addLoadMoreButton();
  } catch (error) {
    console.error('Error initializing infinite scroll:', error);
  }
}

async function loadGossipsPage(page) {
  if (isLoading) return;
  
  isLoading = true;
  showLoadingIndicator();
  
  try {
    const response = await fetch(`${API_BASE}/gossips?page=${page}&limit=10`);
    if (!response.ok) throw new Error('Failed to fetch gossips');
    
    const gossips = await response.json();
    
    if (gossips.length === 0) {
      if (page === 1) {
        showNoGossipsMessage();
      } else {
        showNoMoreGossipsMessage();
      }
      return;
    }
    
    // Append gossips to container
    appendGossips(gossips);
    currentPage = page;
    
  } catch (error) {
    console.error('Error loading page:', error);
    showNotification('Failed to load more gossips 💔', 'error');
  } finally {
    isLoading = false;
    hideLoadingIndicator();
    updateLoadMoreButton();
  }
}

function showLoadingIndicator() {
  const loadingDiv = document.getElementById('loading-indicator');
  if (loadingDiv) {
    loadingDiv.style.display = 'block';
  } else {
    const indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.style.cssText = `
      text-align: center;
      padding: 20px;
      display: none;
    `;
    indicator.innerHTML = `
      <div class="loading-spinner"></div>
      <p style="color: #ff4da6; margin-top: 10px;">Loading more gossips... 💕</p>
    `;
    gossipContainer?.appendChild(indicator);
  }
  
  document.getElementById('loading-indicator').style.display = 'block';
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

function showNoGossipsMessage() {
  if (gossipContainer) {
    gossipContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; color: #ff4da6; margin-bottom: 20px;">🌸</div>
        <p style="color: #ff4da6; font-size: 18px; margin-bottom: 10px;">No gossips yet!</p>
        <p style="color: #ff66b2;">Be the first to share something juicy 💖</p>
      </div>
    `;
  }
}

function showNoMoreGossipsMessage() {
  const noMoreDiv = document.createElement('div');
  noMoreDiv.style.cssText = `
    text-align: center;
    padding: 20px;
    color: #ff66b2;
    font-style: italic;
  `;
  noMoreDiv.textContent = "That's all the gossip for now! 🌸";
  
  // Remove load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) loadMoreBtn.remove();
  
  gossipContainer?.appendChild(noMoreDiv);
}

function appendGossips(gossips) {
  gossips.forEach(gossip => {
    const card = createGossipCard(gossip);
    gossipContainer?.appendChild(card);
  });
}

function addLoadMoreButton() {
  const existingBtn = document.getElementById('load-more-btn');
  if (existingBtn) return;
  
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.id = 'load-more-btn';
  loadMoreBtn.style.cssText = `
    display: block;
    margin: 30px auto;
    background: linear-gradient(45deg, #ff4da6, #ff66b2);
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 25px;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 77, 166, 0.2);
  `;
  loadMoreBtn.textContent = 'Load More Gossip 💕';
  loadMoreBtn.onclick = () => loadGossipsPage(currentPage + 1);
  loadMoreBtn.onmouseenter = () => {
    loadMoreBtn.style.transform = 'translateY(-2px)';
    loadMoreBtn.style.boxShadow = '0 6px 20px rgba(255, 77, 166, 0.3)';
  };
  loadMoreBtn.onmouseleave = () => {
    loadMoreBtn.style.transform = 'translateY(0)';
    loadMoreBtn.style.boxShadow = '0 4px 15px rgba(255, 77, 166, 0.2)';
  };
  
  gossipContainer?.parentNode?.insertBefore(loadMoreBtn, gossipContainer?.nextSibling);
}

function updateLoadMoreButton() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = isLoading;
    loadMoreBtn.textContent = isLoading ? 'Loading... ✨' : 'Load More Gossip 💕';
  }
}

function setupInfiniteScroll() {
  // Add scroll event listener for infinite scroll
  window.addEventListener('scroll', () => {
    if (isLoading) return;
    
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const threshold = 100; // pixels from bottom
    
    if (scrollPosition >= pageHeight - threshold) {
      loadGossipsPage(currentPage + 1);
    }
  });
}

// ====== SEARCH FUNCTIONALITY ======
if (document.getElementById('searchInput')) {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  
  searchInput?.addEventListener('input', debounce(handleSearch, 300));
  searchBtn?.addEventListener('click', handleSearch);
}

async function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const query = searchInput?.value.trim();
  
  if (!query) {
    await loadGossips();
    return;
  }
  
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/gossips/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    
    const gossips = await response.json();
    
    if (gossips.length === 0) {
      showNoResultsMessage(query);
    } else {
      displaySearchResults(gossips, query);
    }
  } catch (error) {
    console.error('Search error:', error);
    showNotification('Search failed 💔', 'error');
  }
}

function showNoResultsMessage(query) {
  if (gossipContainer) {
    gossipContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; color: #ff4da6; margin-bottom: 20px;">🔍</div>
        <p style="color: #ff4da6; font-size: 18px; margin-bottom: 10px;">No gossips found for "${query}"</p>
        <p style="color: #ff66b2;">Try different keywords or share the gossip yourself! 💖</p>
      </div>
    `;
  }
}

function displaySearchResults(gossips, query) {
  if (!gossipContainer) return;
  
  gossipContainer.innerHTML = '';
  
  // Highlight search terms in results
  gossips.forEach(gossip => {
    const card = createGossipCard(gossip);
    
    // Highlight matching text
    const contentElement = card.querySelector('.card-content p');
    if (contentElement) {
      const text = contentElement.textContent;
      const regex = new RegExp(`(${query})`, 'gi');
      const highlighted = text.replace(regex, '<mark style="background-color: #ffebf3; color: #ff4da6; padding: 2px 4px; border-radius: 4px;">$1</mark>');
      contentElement.innerHTML = highlighted;
    }
    
    gossipContainer.appendChild(card);
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ====== SIMPLE POLLING FOR REAL-TIME UPDATES ======
// Simple polling to update like counts without page refresh
function startPollingForUpdates() {
  // Only poll if we're on a page with gossips
  if (!gossipContainer) return;
  
  setInterval(async () => {
    // Update like counts for displayed gossips
    displayedGossips.forEach(async (gossip) => {
      try {
        const response = await fetch(`${API_BASE}/gossips/${gossip.id}/reactions`);
        if (response.ok) {
          const reactions = await response.json();
          const likeReaction = reactions.find(r => r.emoji === '❤️');
          const likesCount = likeReaction ? likeReaction.count : 0;
          
          const likeCountElement = document.getElementById(`like-count-${gossip.id}`);
          if (likeCountElement) {
            // Only update if the count has changed
            const currentCount = parseInt(likeCountElement.textContent) || 0;
            if (currentCount !== likesCount) {
              likeCountElement.textContent = likesCount;
            }
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    });
  }, 10000); // Poll every 10 seconds
}

// Initialize polling
if (gossipContainer) {
  setTimeout(startPollingForUpdates, 5000); // Start after 5 seconds
}

// ====== EXPORT FOR GLOBAL USE ======
// Make essential functions available globally
window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.postComment = postComment;
window.sharePost = sharePost;
window.toggleMenu = toggleMenu;
window.editPost = editPost;
window.reportPost = reportPost;
window.deletePost = deletePost;
window.loadGossips = loadGossips;
window.openFullscreen = openFullscreen;

// Show welcome message on first visit
if (!localStorage.getItem('welcomeShown')) {
  setTimeout(() => {
    showNotification('Welcome to Diva Drama! Share your juiciest gossip 💋', 'success');
    localStorage.setItem('welcomeShown', 'true');
  }, 1000);
}