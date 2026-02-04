// ====== OPTIMIZED FRONTEND CODE ======

// Update your existing loadGossips function for faster initial load
async function loadGossips() {
  try {
    showLoading();
    
    // Use the basic endpoint for faster initial load
    const response = await fetch(`${API_BASE}/gossips/basic`);
    if (!response.ok) throw new Error('Failed to fetch gossips');
    
    const gossips = await response.json();
    allGossips = gossips;
    displayedGossips = allGossips.slice(0, GOSSIPS_PER_PAGE);
    
    renderGossips();
    
    // Load detailed data in background for first 3 gossips
    displayedGossips.forEach(async (gossip, index) => {
      if (index < 3) { // Only preload details for first 3
        await preloadGossipDetails(gossip.id);
      }
    });
    
  } catch (error) {
    console.error('Error loading gossips:', error);
    showError('Failed to load gossips');
  }
}

// New function to preload gossip details
async function preloadGossipDetails(gossipId) {
  try {
    const [reactionsRes, commentsRes] = await Promise.all([
      fetch(`${API_BASE}/gossips/${gossipId}/reactions`),
      fetch(`${API_BASE}/gossips/${gossipId}/comments?limit=3`)
    ]);
    
    if (reactionsRes.ok && commentsRes.ok) {
      const reactions = await reactionsRes.json();
      const comments = await commentsRes.json();
      
      // Cache the data
      cacheGossipData(gossipId, { reactions, comments });
    }
  } catch (error) {
    console.error('Preload error:', error);
  }
}

// Cache for gossip data
const gossipCache = {};

function cacheGossipData(gossipId, data) {
  gossipCache[gossipId] = {
    ...data,
    timestamp: Date.now()
  };
}

// Get cached data
function getCachedGossipData(gossipId) {
  const cached = gossipCache[gossipId];
  if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
    return cached;
  }
  return null;
}

// Optimized loadComments function
async function loadComments(gossipId) {
  const commentsContainer = document.getElementById(`comments-${gossipId}`);
  if (!commentsContainer) return;
  
  // Check cache first
  const cached = getCachedGossipData(gossipId);
  if (cached && cached.comments) {
    renderComments(gossipId, cached.comments);
    return;
  }
  
  try {
    // Show skeleton loading for comments
    commentsContainer.innerHTML = createCommentsSkeleton();
    
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/comments?limit=5`);
    if (!response.ok) return;
    
    const comments = await response.json();
    renderComments(gossipId, comments);
    
  } catch (error) {
    console.error('Error loading comments:', error);
    commentsContainer.innerHTML = '<div class="no-comments">Error loading comments 💔</div>';
  }
}

// Optimized loadReactions function
async function loadReactions(gossipId) {
  // Check cache first
  const cached = getCachedGossipData(gossipId);
  if (cached && cached.reactions) {
    updateReactionsUI(gossipId, cached.reactions);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/gossips/${gossipId}/reactions`);
    if (!response.ok) return;
    
    const reactions = await response.json();
    updateReactionsUI(gossipId, reactions);
    
  } catch (error) {
    console.error('Error loading reactions:', error);
  }
}

// Skeleton loading for comments
function createCommentsSkeleton() {
  return `
    <div class="comment-skeleton">
      ${Array(3).fill(`
        <div class="comment skeleton">
          <div class="comment-avatar skeleton-avatar"></div>
          <div class="comment-content">
            <div class="comment-username skeleton-text" style="width: 80px;"></div>
            <div class="comment-text skeleton-text" style="width: 100%;"></div>
            <div class="comment-actions">
              <div class="comment-time skeleton-text" style="width: 50px;"></div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Add skeleton styles
const skeletonStyles = `
  .skeleton {
    opacity: 0.7;
    animation: skeleton-loading 1s linear infinite alternate;
  }
  
  .skeleton-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #e0e0e0;
  }
  
  .skeleton-text {
    height: 12px;
    margin: 5px 0;
    border-radius: 4px;
    background-color: #e0e0e0;
  }
  
  @keyframes skeleton-loading {
    0% { opacity: 0.6; }
    100% { opacity: 0.9; }
  }
`;

// Add skeleton styles to existing styles
styleSheet.textContent += skeletonStyles;

// Optimized gossip card creation (lazy load media)
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
  
  // Create media placeholder with lazy loading
  const mediaPlaceholder = gossip.media_path ? 
    `<div class="media-placeholder" data-src="${API_BASE}${gossip.media_path}" 
          data-type="${gossip.media_path.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image'}"
          style="width: 100%; height: 200px; background: #f0f0f0; border-radius: 10px; margin: 15px;">
     </div>` : '';
  
  card.innerHTML = `
    ${mediaPlaceholder}
    
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
      <button class="action-btn like-btn skeleton" 
              onclick="toggleLike(${gossip.id})">
        🤍 Like
        <span class="like-count" id="like-count-${gossip.id}">0</span>
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
        <span class="arrow">↓</span> View comments
      </button>
    </div>
    
    <!-- Comments Section -->
    <div class="comments-section" id="comments-${gossip.id}">
      <div class="no-comments">Click to view comments 💬</div>
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
  
  // Lazy load media when card comes into view
  if (gossip.media_path) {
    const placeholder = card.querySelector('.media-placeholder');
    lazyLoadMedia(placeholder);
  }
  
  // Load reactions and comments in background
  setTimeout(() => {
    loadReactions(gossip.id);
  }, 100);
  
  return card;
}

// Lazy load media
function lazyLoadMedia(placeholder) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const src = placeholder.dataset.src;
        const type = placeholder.dataset.type;
        
        if (type === 'video') {
          const video = document.createElement('video');
          video.src = src;
          video.controls = true;
          video.style.cssText = 'width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px;';
          placeholder.replaceWith(video);
        } else {
          const img = document.createElement('img');
          img.src = src;
          img.loading = 'lazy';
          img.style.cssText = 'width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px; cursor: pointer;';
          img.onclick = () => openFullscreen(img.src);
          placeholder.replaceWith(img);
        }
        observer.unobserve(placeholder);
      }
    });
  }, { rootMargin: '50px' });
  
  observer.observe(placeholder);
}

// Optimized pagination for gossip.html
async function loadGossipsPage(page) {
  if (isLoading) return;
  
  isLoading = true;
  showLoadingIndicator();
  
  try {
    // Use paginated endpoint
    const response = await fetch(`${API_BASE}/gossips/paginated?page=${page}&limit=10`);
    if (!response.ok) throw new Error('Failed to fetch gossips');
    
    const data = await response.json();
    
    if (data.gossips.length === 0) {
      if (page === 1) {
        showNoGossipsMessage();
      } else {
        showNoMoreGossipsMessage();
      }
      return;
    }
    
    // Append gossips to container
    appendGossips(data.gossips);
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

// Optimize appendGossips to batch render
function appendGossips(gossips) {
  if (!gossipContainer) return;
  
  // Create document fragment for batch DOM update
  const fragment = document.createDocumentFragment();
  
  gossips.forEach(gossip => {
    const card = createGossipCard(gossip);
    fragment.appendChild(card);
  });
  
  gossipContainer.appendChild(fragment);
  
  // Preload details for newly added gossips (first 2)
  gossips.slice(0, 2).forEach(gossip => {
    preloadGossipDetails(gossip.id);
  });
}