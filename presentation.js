// Presentation layer for feed posts — handles DOM rendering and user interaction

let pendingPostData = null;
const SAFETY_CHECK_KEY = "pixiworld:safetyChecked"; // New key for trygghet

function renderFeed() {
  const container = document.getElementById("feedList");
  if (!container) return;
  container.innerHTML = "";

  const posts = getPosts();
  const now = Date.now();

  posts
    .slice()
    .reverse()
    .forEach((post) => {
      const created = new Date(post.createdAt).getTime();
      const diff = Math.floor((now - created) / 1000);
      const time =
        diff < 60
          ? `${diff}s`
          : diff < 3600
          ? `${Math.floor(diff / 60)}m`
          : diff < 86400
          ? `${Math.floor(diff / 3600)}h`
          : `${Math.floor(diff / 86400)}d`;

      const isDummy = typeof post.id === "string" && post.id.startsWith("d-");

      const article = document.createElement("article");
      article.className = "card";

      // header
      const head = document.createElement("div");
      head.className = "card-head";

      const img = document.createElement("img");
      img.className = "avatar-img";
      img.src = post.avatar || "img/avatars/avatar1.png";
      img.alt = (post.author || "user") + " avatar";
      head.appendChild(img);

      const metaWrap = document.createElement("div");
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = post.author || "You";
      const timeEl = document.createElement("div");
      timeEl.className = "time";
      timeEl.textContent = `posted ${time}`;
      metaWrap.appendChild(meta);

      head.appendChild(metaWrap);

      // friend toggle for dummy posts (placed under the author name now)
      if (isDummy) {
        const friendBtn = document.createElement("button");
        // place under the author name using meta-friend class and append to metaWrap
        friendBtn.className = "button toggle-friend meta-friend";
        friendBtn.dataset.postId = post.id;
        const friended = isFriendWithPost(post.id);
        friendBtn.setAttribute("aria-pressed", friended ? "true" : "false");
        friendBtn.textContent = friended ? "Unfriend" : "Add friend";
        metaWrap.appendChild(friendBtn);
      }
      // delete button for non-dummy
      if (!isDummy) {
        const headerDel = document.createElement("button");
        headerDel.className = "tiny delete-post meta-delete";
        headerDel.dataset.postId = post.id;
        headerDel.title = "Delete post";

        const icon = document.createElement("img");
        icon.src = "img/icons/delete-icon.svg";
        icon.alt = "Delete";
        icon.className = "delete-icon";
        headerDel.appendChild(icon);
        metaWrap.appendChild(headerDel);
      }

      // body text
      const p = document.createElement("p");
      p.className = "card-text";
      p.textContent = post.text || "";

      // if post contains an image, render it
      if (post.image) {
        // mark this card so we can style controls for media posts
        article.classList.add("has-media");
        const imgWrap = document.createElement("div");
        imgWrap.className = "card-media";
        const im = document.createElement("img");
        im.src = post.image;
        im.alt = post.text || "drawing";
        im.className = "post-image";
        imgWrap.appendChild(im);
        article.appendChild(imgWrap);
      }

      // actions
      const actions = document.createElement("div");
      actions.className = "card-actions";

      const likeBtn = document.createElement("button");
      likeBtn.className = "tiny like-btn";
      likeBtn.dataset.postId = post.id;
      likeBtn.setAttribute("aria-pressed", "false");
      likeBtn.innerHTML = '🏆 <span class="like-label"> Award</span>';
      actions.appendChild(likeBtn);

      // assemble
      actions.appendChild(timeEl);
      article.appendChild(head);
      article.appendChild(p);
      article.appendChild(actions);

      container.appendChild(article);
    });

  // at the end of renderFeed, update profile posts as well
  renderProfilePosts();
}

function handleAddPostFromUI() {
  const input = document.getElementById("postInput");
  if (!input) {
    console.error("postInput element not found");
    return;
  }
  const text = input.value.trim();
  if (!text) {
    console.warn("Attempted to post empty text");
    return;
  }

  // prefer profile name/avatar if present
  const nameEl = document.getElementById("editName");
  const author = nameEl ? (nameEl.textContent || "You").trim() : "You";

  let avatar = "img/avatars/avatar1.png";
  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar) {
    const img =
      profileAvatar.tagName === "IMG"
        ? profileAvatar
        : profileAvatar.querySelector && profileAvatar.querySelector("img");
    if (img && img.src) avatar = img.src;
    else {
      const bg = getComputedStyle(profileAvatar).backgroundImage;
      const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1]) avatar = m[1];
    }
  }

  // Store data for the modal to use
  pendingPostData = {
    author,
    authorId: typeof MY_USER_ID !== "undefined" ? MY_USER_ID : null,
    avatar,
    text,
  };

  // Check if user has already passed the safety check
  const hasPassedSafety = localStorage.getItem(SAFETY_CHECK_KEY) === "true";
  const safetyModal = document.getElementById("safetyModal");

  if (safetyModal && !hasPassedSafety) {
    // Show the safety modal ONLY if not previously checked
    safetyModal.classList.remove("hidden");
  } else {
    // Otherwise post immediately
    executeCreatePost(pendingPostData);
  }
}

// New helper to actually write to storage
function executeCreatePost(data) {
  if (typeof createPost !== "function") return;

  const created = createPost(data);
  if (created) {
    // Clear input only after successful post
    const input = document.getElementById("postInput");
    if (input) input.value = "";

    if (typeof renderFeed === "function") renderFeed();
    if (typeof showToast === "function")
      showToast("Posted safely! 🌟", { type: "info" });
  }
}

function handleClearFeedUI() {
  if (
    !confirm(
      "This will clear all post on the local storage and refresh the page, to bring the dummy data back"
    )
  )
    return;
  clearAllFeedData();
  renderFeed();
  location.reload();
}

// ensure all dummy posts are friended (merge any missing dummy ids into stored list)
function ensureAllDummyFriended() {
  // read stored ids (do not rely on getFriendPostIds side-effects here)
  var raw = localStorage.getItem(FRIENDS_POSTS_KEY);
  var stored = raw ? JSON.parse(raw) : [];

  var posts = typeof getPosts === "function" ? getPosts() : [];
  var dummyIds = (posts || [])
    .filter(function (p) {
      return p && typeof p.id === "string" && p.id.startsWith("d-");
    })
    .map(function (p) {
      return p.id;
    });

  // add any dummy ids that are not already stored
  var changed = false;
  dummyIds.forEach(function (id) {
    if (stored.indexOf(id) === -1) {
      stored.push(id);
      changed = true;
    }
  });

  if (changed) {
    saveFriendPostIds(stored);
  }
}

// Ensure dummy posts are "friended" by default on first run
function initializeFriendDefaults() {
  // if user already has a stored list, don't overwrite it
  if (localStorage.getItem(FRIENDS_POSTS_KEY)) return;

  // collect all dummy post ids (those starting with "d-") and persist them
  const posts = getPosts() || [];
  const dummyIds = posts
    .filter(function (p) {
      return typeof p.id === "string" && p.id.startsWith("d-");
    })
    .map(function (p) {
      return p.id;
    });

  if (dummyIds.length) {
    saveFriendPostIds(dummyIds);
  }
}

// wire UI when DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // ensure all dummy posts are friended before first render
  ensureAllDummyFriended();

  // render existing posts
  renderFeed();

  // 2. Add this block to wire up the Safety Modal buttons
  const safetyModal = document.getElementById("safetyModal");
  const safetyConfirmBtn = document.getElementById("safetyConfirmBtn");
  const safetyCancelBtn = document.getElementById("safetyCancelBtn");
  const safetyChecks = document.querySelectorAll(
    ".safety-item input[type='checkbox']"
  );

  function updateSafetyButton() {
    if (!safetyConfirmBtn) return;
    const allChecked = Array.from(safetyChecks).every((cb) => cb.checked);
    safetyConfirmBtn.disabled = !allChecked;
  }

  if (safetyChecks.length) {
    safetyChecks.forEach((cb) =>
      cb.addEventListener("change", updateSafetyButton)
    );
  }

  if (safetyCancelBtn) {
    safetyCancelBtn.addEventListener("click", () => {
      if (safetyModal) safetyModal.classList.add("hidden");
      pendingPostData = null;
      // Reset checkboxes
      safetyChecks.forEach((cb) => (cb.checked = false));
      updateSafetyButton();
    });
  }

  if (safetyConfirmBtn) {
    safetyConfirmBtn.addEventListener("click", () => {
      if (pendingPostData) {
        executeCreatePost(pendingPostData);

        // Mark safety check as completed so it doesn't show again
        localStorage.setItem(SAFETY_CHECK_KEY, "true");

        if (safetyModal) safetyModal.classList.add("hidden");
        pendingPostData = null;

        // Reset checkboxes
        safetyChecks.forEach((cb) => (cb.checked = false));
        updateSafetyButton();
      }
    });
  }

  const postBtn = document.getElementById("postBtn");
  if (postBtn) postBtn.addEventListener("click", handleAddPostFromUI);

  const postInput = document.getElementById("postInput");
  if (postInput) {
    postInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddPostFromUI();
    });
  }

  // Prototyping tool: clear feed
  const clearBtn = document.getElementById("clearFeedBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (
        confirm(
          "This is a prototyping tool for testing. Reset feed to defaults? This clears all user posts and refreshes the page. Help if you have removed all dummy posts."
        )
      ) {
        // Clear the actual storage
        if (typeof clearAllFeedData === "function") {
          clearAllFeedData();
        } else {
          // Fallback if function missing
          localStorage.removeItem("pixiworld:feed");
          localStorage.removeItem("feedData");
        }

        // Clear safety check flag so modal appears again
        localStorage.removeItem("pixiworld:safetyChecked");

        // Reload to reset state
        window.location.reload();
      }
    });
  }

  const submitReportBtn = document.getElementById("submitReportBtn");
  const issueDescription = document.getElementById("issueDescription");
  const issueType = document.getElementById("issueType");

  if (submitReportBtn && issueDescription) {
    submitReportBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const desc = (issueDescription.value || "").trim();
      const type = issueType ? issueType.value : "";

      if (!desc) {
        // basic validation
        alert("Please enter a description of the issue.");
        return;
      }

      try {
        const reportsKey = "pixiworld:reports";
        const cur = JSON.parse(localStorage.getItem(reportsKey) || "[]");
        cur.push({
          id: "r-" + Date.now(),
          type: type,
          description: desc,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(reportsKey, JSON.stringify(cur));
      } catch (err) {
        console.error("Failed to save report:", err);
      }

      // clear the textarea
      issueDescription.value = "";

      alert("Thank you for the report");
      if (typeof showToast === "function") {
        showToast("Report submitted — thank you!", {
          type: "info",
          timeout: 4000,
        });
      }
    });
  }
});

// small helper to persist which posts friended
const FRIENDS_POSTS_KEY = "pixiworld:postFriends";

function getFriendPostIds() {
  const raw = localStorage.getItem(FRIENDS_POSTS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }

  // build default list from current posts (dummy posts start with "d-")
  const posts = typeof getPosts === "function" ? getPosts() : [];
  const dummyIds = (posts || [])
    .filter(function (p) {
      return p && typeof p.id === "string" && p.id.startsWith("d-");
    })
    .map(function (p) {
      return p.id;
    });

  //  default
  localStorage.setItem(FRIENDS_POSTS_KEY, JSON.stringify(dummyIds));
  return dummyIds;
}

function saveFriendPostIds(ids) {
  localStorage.setItem(FRIENDS_POSTS_KEY, JSON.stringify(ids || []));
}
function isFriendWithPost(id) {
  return getFriendPostIds().indexOf(id) !== -1;
}
function toggleFriendForPost(id) {
  const ids = getFriendPostIds();
  const idx = ids.indexOf(id);

  // helper
  function adjustGlobalFriends(delta) {
    if (
      typeof getFriendsCount === "function" &&
      typeof saveFriendsCount === "function"
    ) {
      const current = Number(getFriendsCount()) || 0;
      saveFriendsCount(Math.max(0, current + delta));
    }
  }

  if (idx === -1) {
    ids.push(id);
    saveFriendPostIds(ids);
    //  friends count
    adjustGlobalFriends(+1);
    return true; // now friend
  } else {
    ids.splice(idx, 1);
    saveFriendPostIds(ids);
    //  friends count
    adjustGlobalFriends(-1);
    return false; // now not friend
  }
}

// small accessible toast/live announcement system
function announceSR(message) {
  const el = document.getElementById("sr-status");
  if (!el) return;
  el.textContent = "";
  setTimeout(() => (el.textContent = message), 20);
}

function showToast(message, { type = "info", timeout = 5000, undo } = {}) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `<div class="toast-msg">${message}</div>`;

  if (typeof undo === "function") {
    const btn = document.createElement("button");
    btn.className = "undo focus-ring";
    btn.type = "button";
    btn.textContent = "Undo";
    btn.addEventListener("click", () => {
      try {
        undo();
      } catch (e) {
        console.error(e);
      }
      if (container.contains(toast)) container.removeChild(toast);
    });
    toast.appendChild(btn);
  }

  container.appendChild(toast);
  announceSR(message);

  const timer = setTimeout(() => {
    if (container.contains(toast)) container.removeChild(toast);
  }, timeout);

  toast.addEventListener("mouseenter", () => clearTimeout(timer));
}

// persistable theme helper
function applyTheme(themeClass) {
  document.body.classList.remove("settings-theme", "report-theme");
  if (themeClass) document.body.classList.add(themeClass);

  try {
    // store empty string to clear
    localStorage.setItem("pixiworld:theme", themeClass || "");
  } catch (e) {
    /* ignore storage errors */
  }
}

// restore theme on load
document.addEventListener("DOMContentLoaded", function () {
  try {
    const saved = localStorage.getItem("pixiworld:theme");
    if (saved === "settings-theme" || saved === "report-theme") {
      document.body.classList.add(saved);
    }
  } catch (e) {
    /* ignore */
  }

  //  data-view nav buttons
  document.querySelectorAll(".nav-btn[data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const view = btn.getAttribute("data-view");
      if (view === "settings") applyTheme("settings-theme");
      else if (view === "report") applyTheme("report-theme");
      else applyTheme(null);
      // navigateTo && navigateTo(view);
    });
  });

  const settingsBtn = document.getElementById("Settings");
  const reportBtn = document.getElementById("Report");
  if (settingsBtn)
    settingsBtn.addEventListener("click", () => applyTheme("settings-theme"));
  if (reportBtn)
    reportBtn.addEventListener("click", () => applyTheme("report-theme"));
});

document.addEventListener("DOMContentLoaded", () => {
  // try to attach to the feedList container
  const feedContainer = document.getElementById("feedList") || document;
  // debuggggggggbbb
  if (!feedContainer) {
    console.error("Feed container not found and document fallback failed.");
  }

  feedContainer.addEventListener("click", (e) => {
    // debuggggggggggg: uncomment to trace clicks
    // Toggle friend button
    const friendBtn = e.target.closest(".toggle-friend");
    if (friendBtn) {
      const postId = friendBtn.dataset.postId;
      if (!postId) {
        console.warn(
          "toggle-friend clicked but no data-post-id found",
          friendBtn
        );
        return;
      }
      if (
        typeof isFriendWithPost !== "function" ||
        typeof toggleFriendForPost !== "function"
      ) {
        console.error(
          "Friend helper functions missing: isFriendWithPost / toggleFriendForPost"
        );
        return;
      }

      // akuratt naa logic: add or remove friend
      const currentlyFriend = isFriendWithPost(postId);
      if (!currentlyFriend) {
        toggleFriendForPost(postId);
        if (typeof updateFriendsCount === "function") updateFriendsCount();
        if (typeof renderFriendsUI === "function") renderFriendsUI();
        if (typeof renderFeed === "function") renderFeed();
        if (typeof showToast === "function")
          showToast("Friend added", { type: "info", timeout: 2000 });
      } else {
        // require confirmation before removing
        if (
          !confirm("Remove this friend? This will remove them from your feed.")
        )
          return;
        const posts = typeof getPosts === "function" ? getPosts() : [];
        const idx = posts.findIndex((p) => p && p.id === postId);
        const deleted = idx !== -1 ? posts[idx] : null;

        toggleFriendForPost(postId);
        if (postId.startsWith("d-") && typeof deletePost === "function")
          deletePost(postId);
        if (typeof updateFriendsCount === "function") updateFriendsCount();
        if (typeof renderFriendsUI === "function") renderFriendsUI();
        if (typeof renderFeed === "function") renderFeed();

        if (typeof showToast === "function") {
          showToast("Removed friend — undo?", {
            type: "warn",
            timeout: 8000,
            undo: function () {
              try {
                toggleFriendForPost(postId);
                if (deleted && typeof FEED_STORAGE_KEY !== "undefined") {
                  const key = FEED_STORAGE_KEY || "feedData";
                  const cur = JSON.parse(localStorage.getItem(key) || "[]");
                  if (!cur.find((p) => p.id === deleted.id)) {
                    cur.push(deleted);
                    localStorage.setItem(key, JSON.stringify(cur));
                  }
                }
                if (typeof updateFriendsCount === "function")
                  updateFriendsCount();
                if (typeof renderFriendsUI === "function") renderFriendsUI();
                if (typeof renderFeed === "function") renderFeed();
              } catch (err) {
                console.error("Undo failed", err);
              }
            },
          });
        }
      }
      return;
    }

    // Delete post button
    const delBtn = e.target.closest(".delete-post");
    if (delBtn) {
      const postId = delBtn.dataset.postId;
      if (!postId) {
        console.warn("delete-post clicked but no data-post-id found", delBtn);
        return;
      }
      if (typeof deletePost !== "function") {
        console.error("deletePost function missing");
        return;
      }
      if (!confirm("Delete this post?")) return;
      // capture for undo
      const posts = typeof getPosts === "function" ? getPosts() : [];
      const idx = posts.findIndex((p) => p && p.id === postId);
      const deleted = idx !== -1 ? posts[idx] : null;

      deletePost(postId);
      if (typeof renderFeed === "function") renderFeed();
      if (typeof updateFriendsCount === "function") updateFriendsCount();
      if (typeof renderFriendsUI === "function") renderFriendsUI();

      if (typeof showToast === "function") {
        showToast("Post removed", {
          type: "warn",
          timeout: 7000,
          undo: function () {
            if (!deleted) return;
            try {
              const key =
                typeof FEED_STORAGE_KEY !== "undefined"
                  ? FEED_STORAGE_KEY
                  : "feedData";
              const cur = JSON.parse(localStorage.getItem(key) || "[]");
              cur.push(deleted);
              localStorage.setItem(key, JSON.stringify(cur));
            } catch (err) {
              console.error("restore failed", err);
            }
            if (typeof renderFeed === "function") renderFeed();
            if (typeof updateFriendsCount === "function") updateFriendsCount();
            if (typeof renderFriendsUI === "function") renderFriendsUI();
          },
        });
      }
      return;
    }

    // award button
    const likeBtn = e.target.closest(".like-btn");
    if (likeBtn) {
      const label = likeBtn.querySelector(".like-label");
      const isLiked = likeBtn.classList.toggle("liked");
      likeBtn.setAttribute("aria-pressed", isLiked ? "true" : "false");
      if (label) label.textContent = isLiked ? "Awarded" : "Award";
      return;
    }
  });
});

// allow clicking the whole setting-item to toggle the checkbox inside
document.addEventListener("click", (e) => {
  const item = e.target.closest(".setting-item");
  if (!item) return;

  // if the user clicked an interactive control itself, let native behavior run
  const tag = e.target.tagName;
  if (["INPUT", "BUTTON", "A", "SELECT", "TEXTAREA", "LABEL"].includes(tag))
    return;

  const checkbox = item.querySelector('input[type="checkbox"]');
  if (!checkbox) return;

  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
});

document.addEventListener("DOMContentLoaded", () => {
  // In-memory guardian unlocked flag
  let guardianUnlocked = false;

  const guardianToggle = document.getElementById("guardianToggle");
  const guardianModal = document.getElementById("guardianModal");
  const guardInput = document.getElementById("guardianCodeInput");
  const guardSubmit = document.getElementById("guardianSubmitBtn");
  const guardCancel = document.getElementById("guardianCancelBtn");
  const guardError = document.getElementById("guardianError");
  const guardianExtra = document.getElementById("guardianExtra");

  function showModal() {
    if (!guardianModal) return;
    guardianModal.classList.remove("hidden");
    const modalBox = guardianModal.querySelector(".modal");
    if (modalBox) modalBox.focus();
    if (guardInput) guardInput.value = "";
    if (guardError) guardError.textContent = "";
  }
  function hideModal() {
    if (!guardianModal) return;
    guardianModal.classList.add("hidden");
    if (guardError) guardError.textContent = "";
  }

  function renderGuardianExtra() {
    if (!guardianExtra) return;
    guardianExtra.innerHTML = `
      <label class="setting-item toggle">
        <span class="setting-label">Can approve new members</span>
        <input type="checkbox" id="approveMembers" />
      </label>
      <label class="setting-item toggle">
        <span class="setting-label">Website access closes at 21:00</span>
        <input type="checkbox" id="requirePin" />
      </label>
      <label class="setting-item toggle">
        <span class="setting-label">Auto-approve posts from family</span>
        <input type="checkbox" id="autoApprove" />
      </label>
    `;
    guardianExtra.classList.remove("hidden");
    guardianExtra.setAttribute("aria-hidden", "false");
  }

  function unlockGuardian() {
    guardianUnlocked = true;
    renderGuardianExtra();
    hideModal();
    if (typeof showToast === "function")
      showToast("Guardian unlocked", { type: "info", timeout: 2500 });
  }

  // open modal when guardian row clicked
  if (guardianToggle) {
    guardianToggle.addEventListener("click", (e) => {
      e.preventDefault();
      // if already unlocked, toggle visibility
      if (guardianUnlocked) {
        if (guardianExtra) {
          const hidden = guardianExtra.classList.toggle("hidden");
          guardianExtra.setAttribute("aria-hidden", hidden ? "true" : "false");
        }
        return;
      }
      showModal();
    });
  }

  if (guardCancel)
    guardCancel.addEventListener("click", (e) => {
      e.preventDefault();
      hideModal();
    });
  if (guardSubmit) {
    guardSubmit.addEventListener("click", (e) => {
      e.preventDefault();
      const code = ((guardInput && guardInput.value) || "").trim();
      if (code === "1234") {
        unlockGuardian();
      } else {
        if (guardError) guardError.textContent = "Incorrect code.";
        if (guardInput) guardInput.focus();
      }
    });
  }

  if (guardInput) {
    guardInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        guardSubmit && guardSubmit.click();
      } else if (ev.key === "Escape") {
        hideModal();
      }
    });
  }

  if (guardianModal) {
    guardianModal.addEventListener("click", (ev) => {
      if (ev.target === guardianModal) hideModal();
    });
  }
});

function renderProfilePosts() {
  const container = document.getElementById("profilePosts");
  if (!container) return;

  container.innerHTML = "";

  const posts = getPosts() || [];
  const nameEl = document.getElementById("editName");
  const authorName = nameEl ? (nameEl.textContent || "You").trim() : "You";

  const profileAvatar = document.getElementById("profileAvatar");
  let avatarSrc = "";
  if (profileAvatar) {
    const img =
      profileAvatar.tagName === "IMG"
        ? profileAvatar
        : profileAvatar.querySelector && profileAvatar.querySelector("img");
    if (img && img.src) avatarSrc = img.src;
    else {
      const bg = getComputedStyle(profileAvatar).backgroundImage;
      const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1]) avatarSrc = m[1];
    }
  }

  // match by authorId OR author name or avatar (prev against naar reload/name changes)
  const myPosts = posts
    .slice()
    .reverse()
    .filter((p) => {
      if (!p) return false;
      if (p.authorId && p.authorId === MY_USER_ID) return true;
      if ((p.author || "").trim() === authorName) return true;
      if (p.avatar && avatarSrc && p.avatar === avatarSrc) return true;
      // fallback: posts explicitly marked as mine
      if (p.isMine) return true;
      return false;
    });

  if (!myPosts.length) {
    const empty = document.createElement("div");
    empty.className = "card empty";
    empty.textContent = "You haven't posted anything yet.";
    container.appendChild(empty);
    return;
  }

  myPosts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "card";

    const head = document.createElement("div");
    head.className = "card-head";

    const img = document.createElement("img");
    img.className = "avatar-img";
    img.src = post.avatar || "img/avatars/avatar1.png";
    img.alt = (post.author || "user") + " avatar";
    head.appendChild(img);

    const metaWrap = document.createElement("div");
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = post.author || "You";
    const timeEl = document.createElement("div");
    timeEl.className = "time";
    const created = new Date(post.createdAt).getTime();
    const diff = Math.floor((Date.now() - created) / 1000);
    const time =
      diff < 60
        ? `${diff}s`
        : diff < 3600
        ? `${Math.floor(diff / 60)}m`
        : diff < 86400
        ? `${Math.floor(diff / 3600)}h`
        : `${Math.floor(diff / 86400)}d`;
    timeEl.textContent = `posted ${time}`;

    metaWrap.appendChild(meta);
    head.appendChild(metaWrap);

    const headerDel = document.createElement("button");
    headerDel.className = "tiny delete-post meta-delete";
    headerDel.dataset.postId = post.id;
    headerDel.title = "Delete post";
    const icon = document.createElement("img");
    icon.src = "img/icons/delete-icon.svg";
    icon.alt = "Delete";
    icon.className = "delete-icon";
    headerDel.appendChild(icon);
    metaWrap.appendChild(headerDel);

    const p = document.createElement("p");
    p.className = "card-text";
    p.textContent = post.text || "";

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.appendChild(timeEl);

    article.appendChild(head);
    article.appendChild(p);
    article.appendChild(actions);

    container.appendChild(article);
  });
}

// ensure have a stable user id stored locally
const USER_ID_KEY = "pixiworld:userId";
function getMyUserId() {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = "u-" + Date.now();
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch (e) {
    if (!window.__pixi_tmp_user) window.__pixi_tmp_user = "u-" + Date.now();
    return window.__pixi_tmp_user;
  }
}
const MY_USER_ID = getMyUserId();

// simple clock updater for the feed header with toggle for flicker
(function initHeaderClock() {
  function formatTime(d) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function startClock() {
    const el = document.getElementById("clock");
    if (!el) return;

    // read toggle control in settings default true when not present
    const flickToggle = document.getElementById("clockflickerToggle");
    let flickEnabled = flickToggle ? !!flickToggle.checked : true;

    // keep toggle in sync if the user changes it
    if (flickToggle) {
      flickToggle.addEventListener("change", (ev) => {
        flickEnabled = !!ev.target.checked;
        if (!flickEnabled) el.classList.remove("clock-flick");
      });
    }

    function tick() {
      el.textContent = formatTime(new Date());
      if (flickEnabled) {
        el.classList.add("clock-flick");
        // match CSS animation length
        window.setTimeout(() => el.classList.remove("clock-flick"), 220);
      } else {
        // ensure no flicker class remains when disabled
        el.classList.remove("clock-flick");
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    el.dataset._clockInterval = id;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startClock);
  } else {
    startClock();
  }
})();

// responsive UI scaling: reduce overall UI size on narrower viewports
(function initUIScaling() {
  const BASE_WIDTH = 1440;
  const MIN_SCALE = 0.82; // don't scale smaller than this
  const MAX_SCALE = 1; // don't scale larger than this :))))))
  const body = document.body;

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function updateScale() {
    if (prefersReducedMotion()) {
      document.documentElement.style.setProperty("--ui-scale", "1");
      body.classList.remove("ui-scaled");
      return;
    }

    const vw = Math.max(
      320,
      window.innerWidth || document.documentElement.clientWidth
    );
    let s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vw / BASE_WIDTH));
    s = Math.round(s * 1000) / 1000;
    document.documentElement.style.setProperty("--ui-scale", String(s));
    if (s < 0.999) body.classList.add("ui-scaled");
    else body.classList.remove("ui-scaled");
  }

  // debounce helper
  let t;
  function onResize() {
    clearTimeout(t);
    t = setTimeout(updateScale, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      updateScale();
      window.addEventListener("resize", onResize);
    });
  } else {
    updateScale();
    window.addEventListener("resize", onResize);
  }
})();

// Challenge Logic
const CHALLENGES_KEY = "pixiworld:activeChallenges";

function getActiveChallenges() {
  try {
    return JSON.parse(localStorage.getItem(CHALLENGES_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveActiveChallenges(list) {
  localStorage.setItem(CHALLENGES_KEY, JSON.stringify(list));
}

function renderProfileChallenges() {
  const container = document.getElementById("profileChallenges");
  if (!container) return;

  container.innerHTML = "";
  const active = getActiveChallenges();

  if (active.length === 0) {
    container.innerHTML =
      '<div class="card empty">No active challenges yet. Go join one!</div>';
    return;
  }

  active.forEach((challenge) => {
    const card = document.createElement("div");
    card.className = "active-challenge-card";

    const title = document.createElement("h4");
    title.textContent = challenge.title;

    const reward = document.createElement("p");
    reward.className = "reward-text";
    reward.textContent = challenge.reward;

    const leaveBtn = document.createElement("button");
    leaveBtn.className = "leave-btn";
    leaveBtn.textContent = "Give Up / Remove";
    leaveBtn.addEventListener("click", () => {
      if (confirm(`Remove "${challenge.title}" from your challenges?`)) {
        removeChallenge(challenge.title);
      }
    });

    card.appendChild(title);
    card.appendChild(reward);
    card.appendChild(leaveBtn);
    container.appendChild(card);
  });
}

function joinChallenge(title, reward) {
  const active = getActiveChallenges();
  // Avoid duplikates
  if (active.find((c) => c.title === title)) {
    if (typeof showToast === "function")
      showToast("You are already doing this challenge!", { type: "info" });
    return;
  }

  active.push({ title, reward });
  saveActiveChallenges(active);

  renderProfileChallenges();
  updateChallengeButtonsUI(); // Update buttons on the challenge screen

  if (typeof showToast === "function")
    showToast(`Joined: ${title}`, { type: "info" });
}

function removeChallenge(title) {
  let active = getActiveChallenges();
  active = active.filter((c) => c.title !== title);
  saveActiveChallenges(active);

  renderProfileChallenges();
  updateChallengeButtonsUI(); // Revert buttons on the challenge screen
}

// Update the "Join" buttons to say "Joined" if already active
function updateChallengeButtonsUI() {
  const active = getActiveChallenges();
  const activeTitles = active.map((c) => c.title);

  const challengeCards = document.querySelectorAll(
    "#challenges .challenge-card"
  );
  challengeCards.forEach((card) => {
    const titleEl = card.querySelector("h4");
    const btn = card.querySelector("button");
    if (!titleEl || !btn) return;

    const title = titleEl.textContent.trim();

    if (activeTitles.includes(title)) {
      btn.textContent = "Joined ✓";
      btn.classList.add("joined-state");
      btn.disabled = true;
    } else {
      btn.textContent = "Join Challenge";
      btn.classList.remove("joined-state");
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderProfileChallenges();
  updateChallengeButtonsUI();

  //  "Join Challenge" buttons
  const challengeButtons = document.querySelectorAll(
    "#challenges .challenge-card button"
  );
  challengeButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".challenge-card");
      const title = card.querySelector("h4").textContent.trim();
      // Extract reward text
      const pTags = card.querySelectorAll("p");
      let reward = "Reward: Badge";
      pTags.forEach((p) => {
        if (p.textContent.includes("Reward:")) reward = p.textContent.trim();
      });

      joinChallenge(title, reward);
    });
  });
});
