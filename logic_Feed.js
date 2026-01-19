// Logic layer for feed posts — enforces simple business rules and persists to localStorage

(function () {
  const _FEED_KEY =
    typeof FEED_STORAGE_KEY !== "undefined"
      ? FEED_STORAGE_KEY
      : "pixiworld:feed";

  // migrate old key if present (non-fatal)
  try {
    const old = localStorage.getItem("feedData");
    if (old && !localStorage.getItem(_FEED_KEY)) {
      localStorage.setItem(_FEED_KEY, old);
      localStorage.removeItem("feedData");
    }
  } catch (e) {
    /* ignore storage errors */
  }

  function _readFeed() {
    try {
      const raw = localStorage.getItem(_FEED_KEY) || "[]";
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to read feed:", e);
      return [];
    }
  }

  function _writeFeed(posts) {
    try {
      localStorage.setItem(_FEED_KEY, JSON.stringify(posts || []));
    } catch (e) {
      console.error("Failed to write feed:", e);
    }
  }

  function getPosts() {
    return _readFeed();
  }

  /**
   * postData: { author, avatar, text }
   */
  function createPost({
    author = "You",
    authorId = null,
    avatar = "",
    text = "",
    image = null,
    marketplace = false,
  } = {}) {
    const content = (text || "").trim();
    if (!content && !image) return null;

    const posts = _readFeed();
    const id =
      "p-" + Date.now() + "-" + Math.floor(Math.random() * 9000 + 1000);
    const post = {
      id,
      author: author || "You",
      authorId: authorId || null,
      avatar: avatar || "",
      text: content,
      image: image || null,
      marketplace: !!marketplace,
      createdAt: new Date().toISOString(),
      isMine: !!authorId,
    };
    posts.push(post);
    _writeFeed(posts);
    return post;
  }

  // Delete a post (business layer -> delegates to data layer)
  function deletePost(postId) {
    if (!postId) return false;
    const posts = _readFeed();
    const next = posts.filter((p) => p && p.id !== postId);
    if (next.length === posts.length) return false;
    _writeFeed(next);
    return true;
  }

  function clearAllFeedData() {
    try {
      localStorage.removeItem(_FEED_KEY);
    } catch (e) {
      console.error("Failed to clear feed data:", e);
    }
  }

  // expose to global namespace for pres layer access
  window.FEED_STORAGE_KEY = _FEED_KEY;
  window.getPosts = getPosts;
  window.createPost = createPost;
  window.deletePost = deletePost;
  window.clearAllFeedData = clearAllFeedData;
})();
