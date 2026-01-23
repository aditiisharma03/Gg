// ====== CONFIGURATION ======
const API_BASE = location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "https://gg-qrk5.onrender.com";

const GOSSIPS_PER_PAGE = 2; // Show only 2 gossips initially

// ====== STATE ======
let allGossips = [];
let displayedGossips = [];
const userReactions = JSON.parse(localStorage.getItem("userReactions")) || {};

// ====== ELEMENTS ======
const gossipContainer = document.getElementById("gossipCards");
const gossipForm = document.getElementById("gossipForm");
const preview = document.getElementById("preview");
const mediaInput = document.getElementById("mediaInput");
const cancelBtn = document.getElementById("cancelGossip");
const loadMoreBtn = document.getElementById("loadMore");

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
  return name ? name.charAt(0).toUpperCase() : 'A';
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
  
  // Load more button - redirects to gossip.html
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
    
    const response = await fetch(`${API_BASE}/gossips`);
    if (!response.ok) throw new Error('Failed to fetch gossips');
    
    allGossips = await response.json();
    displayedGossips = allGossips.slice(0, GOSSIPS_PER_PAGE);
    
    renderGossips();
    
    // Show/hide load more button
    if (loadMoreBtn) {
      loadMoreBtn.style.display = allGossips.length > GOSSIPS_PER_PAGE ? 'block' : 'none';
    }
    
  } catch (error) {
    console.error('Error loading gossips:', error);
    showError();
  }
}

function showLoading() {
  if (gossipContainer) {
    gossipContainer.innerHTML = `
      <div class="loading-placeholder">
        <div class="loading-spinner" style="
          width: 40px;
          height: 40px;
          border: 3px solid #ffe6f2;
          border-top-color: #ff4da6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <p style="color: #ff4da6; text-align: center;">Loading gossips... 💖</p>
      </div>
    `;
  }
}

function showError() {
  if (gossipContainer) {
    gossipContainer.innerHTML = `
      <div class="error-placeholder" style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; color: #ff4da6; margin-bottom: 20px;">💔</div>
        <p style="color: #ff4da6; margin-bottom: 20px;">Failed to load gossips</p>
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
  if (!gossipContainer || displayedGossips.length === 0) {
    gossipContainer.innerHTML = `
      <div class="no-gossips" style="text-align: center; padding: 40px;">
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
    
    // Load reactions
    loadReactions(gossip.id);
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
  
  card.innerHTML = `
    ${gossip.media_path ? createMediaElement(gossip) : ''}
    
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
        </div>
      </div>
    </div>
    
    <div class="card-content">
      <p>${gossip.content}</p>
    </div>
    
    <div class="card-actions">
      <button class="action-btn like-btn ${userReactions[gossip.id]?.liked ? 'active' : ''}" 
              onclick="toggleLike(${gossip.id})">
        ${userReactions[gossip.id]?.liked ? '❤️' : '🤍'}
      </button>
      <button class="action-btn comment-btn" onclick="focusCommentInput(${gossip.id})">
        💬
      </button>
      <button class="action-btn share-btn" onclick="sharePost(${gossip.id})">
        🔄
      </button>
    </div>
    
    <div class="likes-count" id="likes-${gossip.id}">
      Loading likes...
    </div>
    
    
    
    <!-- Comments Section (Hidden by default) -->
    <div class="comments-section" id="comments-${gossip.id}">
      <div class="loading-comments">Loading comments... ✨</div>
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
  
  return card;
}

function createMediaElement(gossip) {
  const mediaURL = `${API_BASE}${gossip.media_path}`;
  if (gossip.media_path.match(/\.(mp4|webm|mov)$/i)) {
    return `<video src="${mediaURL}" controls style="width: 100%; max-height: 400px; object-fit: cover;"></video>`;
  } else {
    return `<img src="${mediaURL}" alt="Gossip image" loading="lazy" style="width: 100%; max-height: 400px; object-fit: cover;">`;
  }
}

// ====== VIEW COMMENTS FUNCTION ======
async function toggleComments(gossipId) {
  const commentsSection = document.getElementById(`comments-${gossipId}`);
  const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
  
  if (!commentsSection || !viewCommentsBtn) return;
  
  const isExpanded = commentsSection.classList.contains('expanded');
  
  if (!isExpanded) {
    // Load comments when expanding
    await loadComments(gossipId);
    
    // Update button to show comment count
    await updateCommentCountButton(gossipId);
  }
  
  // Toggle visibility
  commentsSection.classList.toggle('expanded');
  viewCommentsBtn.classList.toggle('expanded');
  
  // Update button text
  if (isExpanded) {
    viewCommentsBtn.innerHTML = '<span class="arrow">↓</span> View comments';
  } else {
    // Get comment count for button text
    await updateCommentCountButton(gossipId);
  }
}

// ====== COMMENT FUNCTIONS ======
async function loadComments(gossipId, limit = 10) {
  const commentsContainer = document.getElementById(`comments-${gossipId}`);
  if (!commentsContainer) return;
  
  try {
    // Show loading state
    commentsContainer.innerHTML = '<div class="loading-comments">Loading comments... ✨</div>';
    
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/comments`);
    if (!response.ok) throw new Error('Failed to fetch comments');
    
    const comments = await response.json();
    
    if (comments.length === 0) {
      commentsContainer.innerHTML = '<div class="no-comments">No comments yet. Be the first! 💬</div>';
      return;
    }
    
    // Sort by newest first
    const sortedComments = comments.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    const recentComments = limit ? sortedComments.slice(0, limit) : sortedComments;
    
    commentsContainer.innerHTML = recentComments.map(comment => createCommentHTML(comment)).join('');
    
  } catch (error) {
    console.error('Error loading comments:', error);
    commentsContainer.innerHTML = '<div class="no-comments">Error loading comments 💔</div>';
  }
}

async function updateCommentCountButton(gossipId) {
  const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
  if (!viewCommentsBtn) return;
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/comments`);
    if (!response.ok) return;
    
    const comments = await response.json();
    const commentCount = comments.length;
    
    const isExpanded = document.getElementById(`comments-${gossipId}`).classList.contains('expanded');
    
    if (isExpanded) {
      viewCommentsBtn.innerHTML = `<span class="arrow">↑</span> Hide comments (${commentCount})`;
    } else {
      viewCommentsBtn.innerHTML = `<span class="arrow">↓</span> View comments (${commentCount})`;
    }
  } catch (error) {
    // Keep default text if can't get count
    const isExpanded = document.getElementById(`comments-${gossipId}`).classList.contains('expanded');
    viewCommentsBtn.innerHTML = isExpanded 
      ? '<span class="arrow">↑</span> Hide comments' 
      : '<span class="arrow">↓</span> View comments';
  }
}

function createCommentHTML(comment) {
  const initials = getInitials(comment.commenter_name);
  const timeAgo = formatTimeAgo(comment.created_at || new Date());
  
  return `
    <div class="comment" data-id="${comment.id}">
      <div class="comment-avatar">${initials}</div>
      <div class="comment-content">
        <div class="comment-username">${comment.commenter_name || 'Anonymous'}</div>
        <div class="comment-text">${comment.comment}</div>
        <div class="comment-actions">
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
  const commentText = input.value.trim();
  
  if (!commentText) return;
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commenter_name: commenterName,
        comment: commentText
      })
    });
    
    if (!response.ok) throw new Error('Failed to post comment');
    
    const result = await response.json();
    
    if (result.success) {
      input.value = '';
      
      // Clear the comment count cache and reload
      await loadComments(gossipId);
      await updateCommentCountButton(gossipId);
      
      // Ensure comments section is expanded
      const commentsSection = document.getElementById(`comments-${gossipId}`);
      const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
      
      if (commentsSection && !commentsSection.classList.contains('expanded')) {
        commentsSection.classList.add('expanded');
        if (viewCommentsBtn) {
          viewCommentsBtn.classList.add('expanded');
        }
      }
      
      // Scroll to the new comment
      commentsSection.scrollTop = commentsSection.scrollHeight;
      
      showNotification('Comment posted! 💬', 'success');
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    showNotification('Failed to post comment 💔', 'error');
  }
}

function focusCommentInput(gossipId) {
  const input = document.getElementById(`comment-input-${gossipId}`);
  if (input) {
    input.focus();
    
    // Also expand comments if not already expanded
    const commentsSection = document.getElementById(`comments-${gossipId}`);
    const viewCommentsBtn = document.getElementById(`view-comments-${gossipId}`);
    
    if (commentsSection && !commentsSection.classList.contains('expanded')) {
      toggleComments(gossipId);
    }
  }
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
  const content = prompt('Edit your gossip:', 
    document.querySelector(`.card[data-id="${gossipId}"] .card-content p`)?.textContent || '');
  
  if (content === null) return;
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    if (response.ok) {
      const contentElement = document.querySelector(`.card[data-id="${gossipId}"] .card-content p`);
      if (contentElement) contentElement.textContent = content;
      showNotification('Gossip updated! ✨', 'success');
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
    await fetch(`${API_BASE}/gossips/${gossipId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    showNotification('Post reported successfully 🚨', 'success');
  } catch (error) {
    showNotification('Failed to report post 💔', 'error');
  }
  
  toggleMenu(gossipId);
}

// ====== LIKE FUNCTIONS ======
async function toggleLike(gossipId) {
  const isLiked = userReactions[gossipId]?.liked || false;
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/reactions/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        emoji: '❤️', 
        action: isLiked ? 'remove' : 'add' 
      })
    });
    
    if (response.ok) {
      userReactions[gossipId] = userReactions[gossipId] || {};
      userReactions[gossipId].liked = !isLiked;
      localStorage.setItem('userReactions', JSON.stringify(userReactions));
      
      // Update UI
      const likeBtn = document.querySelector(`.card[data-id="${gossipId}"] .like-btn`);
      if (likeBtn) {
        likeBtn.innerHTML = userReactions[gossipId].liked ? '❤️' : '🤍';
        likeBtn.classList.toggle('active', userReactions[gossipId].liked);
        
        // Animation
        likeBtn.style.transform = 'scale(1.2)';
        setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);
      }
      
      // Update likes count
      loadReactions(gossipId);
    }
  } catch (error) {
    showNotification('Failed to update like 💔', 'error');
  }
}

async function loadReactions(gossipId) {
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/reactions`);
    if (!response.ok) return;
    
    const reactions = await response.json();
    const likeReaction = reactions.find(r => r.emoji === '❤️');
    const likesCount = likeReaction ? likeReaction.count : 0;
    
    const likesElement = document.getElementById(`likes-${gossipId}`);
    if (likesElement) {
      likesElement.textContent = `${likesCount} like${likesCount !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Error loading reactions:', error);
  }
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
    preview.appendChild(img);
  } else if (file.type.startsWith('video')) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
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
    
    const response = await fetch(`${API_BASE}/gossips`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      gossipForm.reset();
      if (preview) preview.innerHTML = '';
      
      // Reload gossips
      await loadGossips();
      
      showNotification('Gossip posted successfully! 💖', 'success');
      
      // Scroll to gossips section
      document.getElementById('gossip').scrollIntoView({ behavior: 'smooth' });
    } else {
      throw new Error(result.error || 'Failed to post gossip');
    }
  } catch (error) {
    console.error('Error posting gossip:', error);
    showNotification('Failed to post gossip 💔', 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// ====== SHARE FUNCTION ======
async function sharePost(gossipId) {
  const shareUrl = `${window.location.origin}/gossip.html?id=${gossipId}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Banasthali Gossip',
        text: 'Check out this juicy gossip!',
        url: shareUrl
      });
    } catch (error) {
      console.log('Share cancelled');
    }
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      showNotification('Link copied to clipboard! 📋', 'success');
    });
  }
}

// Add to style tag for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .comments-section {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }
  
  .comments-section.expanded {
    max-height: 500px;
    overflow-y: auto;
  }
  
  .view-comments-btn.expanded .arrow {
    transform: rotate(180deg);
  }
  
  .arrow {
    display: inline-block;
    transition: transform 0.3s ease;
    margin-right: 5px;
  }
  
  .loading-comments, .no-comments {
    text-align: center;
    padding: 20px;
    color: #ff66b2;
    font-style: italic;
  }
  
  .comment {
    display: flex;
    gap: 10px;
    padding: 10px;
    border-bottom: 1px solid #ffe6f2;
  }
  
  .comment-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(45deg, #ff4da6, #ff66b2);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
  }
  
  .comment-avatar.small {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .comment-content {
    flex: 1;
  }
  
  .comment-username {
    font-weight: 600;
    color: #ff4da6;
    font-size: 14px;
  }
  
  .comment-text {
    margin: 5px 0;
    font-size: 14px;
  }
  
  .comment-time {
    font-size: 12px;
    color: #ff99cc;
  }
  
  .comment-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 5px;
  }
  
  .comment-action {
    background: none;
    border: none;
    color: #ff4da6;
    font-size: 12px;
    cursor: pointer;
  }
  
  .add-comment {
    display: flex;
    gap: 10px;
    padding: 10px;
    align-items: center;
  }
  
  .comment-input-wrapper {
    flex: 1;
  }
  
  .comment-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ffe6f2;
    border-radius: 20px;
    background: #fff5fa;
    color: #ff4da6;
  }
  
  .comment-submit {
    background: linear-gradient(45deg, #ff4da6, #ff66b2);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(255, 77, 166, 0.2);
    border-left: 4px solid #ff4da6;
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .notification.success {
    border-left-color: #4CAF50;
  }
  
  .notification.error {
    border-left-color: #f44336;
  }
  
  .notification.info {
    border-left-color: #2196F3;
  }
  
  .notification button {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 18px;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
// Mobile Navigation Toggle
function initMobileNav() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
  // Create hamburger button
  const navToggle = document.createElement('button');
  navToggle.className = 'nav-toggle';
  navToggle.innerHTML = '☰';
  navToggle.setAttribute('aria-label', 'Toggle menu');
  navToggle.setAttribute('aria-expanded', 'false');
  
  // Insert at beginning of navbar
  navbar.insertBefore(navToggle, navbar.firstChild);
  
  // Toggle menu on click
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const navLinks = document.querySelector('.nav-links');
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    
    navLinks.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', !isExpanded);
    navToggle.innerHTML = isExpanded ? '☰' : '✕';
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) {
      const navLinks = document.querySelector('.nav-links');
      const navToggle = document.querySelector('.nav-toggle');
      
      navLinks.classList.remove('active');
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = '☰';
      }
    }
  });
  
  // Close menu when clicking a link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      const navLinks = document.querySelector('.nav-links');
      const navToggle = document.querySelector('.nav-toggle');
      
      navLinks.classList.remove('active');
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = '☰';
      }
    });
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initMobileNav);