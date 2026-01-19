// Logic

// localStorage keys
const STORAGE_KEY = "pixiworld:currentView"; // for last used view
const PROFILE_NAME_KEY = "pixiworld:profileName"; // for saved profile name
const PROFILE_BIO_KEY = "pixiworld:profileBio"; // for saved profile bio
const PROFILE_AVATAR_KEY = "pixiworld:profileAvatar"; // for saved profile avatar

// Gitte avaterer (paths)
const AVATAR_OPTIONS = [
  "img/avatars/avatar1.png",
  "img/avatars/avatar2.png",
  "img/avatars/avatar3.png",
  "img/avatars/avatar4.png",
  "img/avatars/avatar5.png",
  "img/avatars/avatar6.png",
  "img/avatars/avatar7.png",
  "img/avatars/avatar8.png",
];

// hide all screens and deactivate all buttons NOTE SELF: only thing I found to work this was messy
const views = document.querySelectorAll(".nav-btn");
function showView(viewId) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.add("hidden"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  const screen = document.getElementById(viewId);
  const button = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
  if (screen) screen.classList.remove("hidden");
  if (button) button.classList.add("active");
}
views.forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    localStorage.setItem(STORAGE_KEY, view);
    showView(view);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const saved = (function () {
    return localStorage.getItem(STORAGE_KEY);
  })();
  const defaultView = "feed";
  const initialView =
    saved && document.getElementById(saved) ? saved : defaultView;
  showView(initialView);
});

// Edit profile logic
const max_name_length = 20;
const max_bio_length = 160;

document.addEventListener("DOMContentLoaded", function () {
  const editProfileBtn = document.getElementById("editProfileBtn");
  const editNameEditable = document.getElementById("editName");
  const editBioEditable = document.getElementById("editBio");
  const editAvatarBtn = document.getElementById("editAvatarBtn");
  const profileAvatar = document.getElementById("profileAvatar");

  const savedName = localStorage.getItem(PROFILE_NAME_KEY);
  if (savedName) editNameEditable.textContent = savedName;
  const savedBio = localStorage.getItem(PROFILE_BIO_KEY);
  if (savedBio && editBioEditable) editBioEditable.textContent = savedBio;
  const savedAvatar = localStorage.getItem(PROFILE_AVATAR_KEY);
  if (savedAvatar && profileAvatar) {
    profileAvatar.style.backgroundImage = `url('${savedAvatar}')`;
    profileAvatar.style.backgroundSize = "cover";
    profileAvatar.style.backgroundPosition = "center";
  }

  // Avatar picker logic
  if (editAvatarBtn && profileAvatar) {
    const openAvatarPicker = () => {
      if (document.getElementById("avatarPicker")) return;

      const picker = document.createElement("div");
      picker.id = "avatarPicker";
      picker.style.position = "fixed";
      picker.style.inset = "0";
      picker.style.display = "flex";
      picker.style.alignItems = "center";
      picker.style.justifyContent = "center";
      picker.style.background = "rgba(0,0,0,0.4)";
      picker.style.zIndex = 1000;

      const box = document.createElement("div");
      box.style.background = "#fff";
      box.style.padding = "16px";
      box.style.borderRadius = "12px";
      box.style.boxShadow = "0 8px 30px rgba(0,0,0,0.25)";
      box.style.maxWidth = "90%";
      box.style.width = "420px";
      box.style.textAlign = "center";

      const title = document.createElement("div");
      title.textContent = "Choose an avatar";
      title.style.fontWeight = "700";
      title.style.marginBottom = "12px";
      box.appendChild(title);

      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(4, 1fr)";
      grid.style.gap = "10px";

      AVATAR_OPTIONS.forEach((path) => {
        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.style.border = "none";
        thumb.style.padding = "0";
        thumb.style.cursor = "pointer";
        thumb.style.background = "transparent";
        thumb.style.borderRadius = "8px";
        thumb.title = path;
        const img = document.createElement("div");
        img.style.width = "64px";
        img.style.height = "64px";
        img.style.borderRadius = "10px";
        img.style.backgroundImage = `url('${path}')`;
        img.style.backgroundSize = "cover";
        img.style.backgroundPosition = "center";
        img.style.boxShadow = "0 4px 10px rgba(0,0,0,0.12)";
        thumb.appendChild(img);

        thumb.addEventListener("click", () => {
          profileAvatar.style.backgroundImage = `url('${path}')`;
          profileAvatar.style.backgroundSize = "cover";
          profileAvatar.style.backgroundPosition = "center";
          localStorage.setItem(PROFILE_AVATAR_KEY, path);
          console.log("set avatar to", path);
          document.body.removeChild(picker);
        });
        grid.appendChild(thumb);
      });
      box.appendChild(grid);

      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.className = "button";
      cancel.style.marginTop = "12px";
      cancel.addEventListener("click", () => {
        if (picker.parentNode) document.body.removeChild(picker);
      });
      box.appendChild(cancel);

      picker.appendChild(box);
      document.body.appendChild(picker);

      // For aa lukke med ESC
      const onKey = (e) => {
        if (e.key === "Escape" && picker.parentNode) {
          document.body.removeChild(picker);
          window.removeEventListener("keydown", onKey);
        }
      };
      window.addEventListener("keydown", onKey);
    };

    // Attach the picker to both the button and the avatar image
    editAvatarBtn.addEventListener("click", openAvatarPicker);
    profileAvatar.addEventListener("click", openAvatarPicker);
  }

  //  editable fields
  editNameEditable.contentEditable = "false";
  if (editBioEditable) editBioEditable.contentEditable = "false";

  editProfileBtn.addEventListener("click", function () {
    const isEditing = editNameEditable.contentEditable === "true";

    if (isEditing) {
      const newName = (editNameEditable.textContent || "").trim();
      if (newName.length > max_name_length) {
        alert(`Name must be ${max_name_length} characters or less.`);
        editNameEditable.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(editNameEditable);
        sel.addRange(range);
        return; // do not disable editing
      }

      // Lengde sjekk for bio
      if (editBioEditable) {
        const newBio = (editBioEditable.textContent || "").trim();
        if (newBio.length > max_bio_length) {
          alert(`Bio must be ${max_bio_length} characters or less.`);
          editBioEditable.focus();
          const sel = window.getSelection();
          sel.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(editBioEditable);
          sel.addRange(range);
          return; // do not disable editing
        }
      }
      // Save changes to localStorage
      localStorage.setItem(PROFILE_NAME_KEY, newName);
      if (editBioEditable) {
        localStorage.setItem(
          PROFILE_BIO_KEY,
          (editBioEditable.textContent || "").trim()
        );
      }
      editNameEditable.contentEditable = "false";
      if (editBioEditable) editBioEditable.contentEditable = "false";
      editProfileBtn.textContent = "Edit Content";
    } else {
      // Enable editing for both name and bio
      editNameEditable.contentEditable = "true";
      if (editBioEditable) editBioEditable.contentEditable = "true";
      editProfileBtn.textContent = "Save Content";

      editNameEditable.focus();
      const range = document.createRange();
      range.selectNodeContents(editNameEditable);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });
});

//  / community members feature
const FRIENDS_COUNT_KEY = "pixiworld:friendsCount";
const IS_FRIEND_KEY = "pixiworld:isFriendWithProfile";

// derive friends count from feed data + stored friend-ids
function getFriendsCount() {
  // stored friend post ids (may be empty)
  var rawIds = localStorage.getItem("pixiworld:postFriends");
  var friendIds = [];
  try {
    friendIds = rawIds ? JSON.parse(rawIds) : [];
  } catch (e) {
    friendIds = [];
  }

  // read feed posts
  var posts = [];
  try {
    posts = JSON.parse(
      localStorage.getItem(
        typeof FEED_STORAGE_KEY !== "undefined" ? FEED_STORAGE_KEY : "feedData"
      ) || "[]"
    );
  } catch (e) {
    posts = [];
  }

  // collect unique users among dummy posts that are friended
  var seen = new Set();
  posts.forEach(function (p) {
    if (!p || typeof p.id !== "string") return;
    // only consider seeded/demo posts
    if (!p.id.startsWith("d-")) return;

    // only count if post marked as friend OR saved in friend-posts list
    if (!(p.friend === true || friendIds.indexOf(p.id) !== -1)) return;

    // normalize author for dedupe; fallback to id if no author
    var authorKey = (p.author && String(p.author).trim().toLowerCase()) || p.id;
    seen.add(authorKey);
  });

  var count = seen.size;
  //  count
  localStorage.setItem(
    FRIENDS_COUNT_KEY,
    String(Math.max(0, Math.floor(count)))
  );
  return count;
}

// render the friends UI update count always profile
function renderFriendsUI() {
  var countEl = document.getElementById("friendsCount");
  var btn = document.getElementById("toggleFriendBtn");

  if (countEl) {
    countEl.textContent = String(getFriendsCount());
  }

  // toggle profile button if it vis den finnes tho
  if (btn) {
    var friend = isFriend();
    btn.classList.toggle("added", !!friend);
    btn.textContent = friend ? "Unfriend" : "Add friend";
    btn.setAttribute("aria-pressed", friend ? "true" : "false");
  }
}

// toggle handler hy/dn and forbli
function handleToggleFriend() {
  const friend = isFriend();
  const current = getFriendsCount();
  if (friend) {
    setFriendState(false);
    saveFriendsCount(Math.max(0, current - 1));
  } else {
    setFriendState(true);
    saveFriendsCount(current + 1);
  }
  renderFriendsUI();
}

document.addEventListener("DOMContentLoaded", () => {
  //  friends button
  const btn = document.getElementById("toggleFriendBtn");
  if (btn) btn.addEventListener("click", handleToggleFriend);

  // initial render
  renderFriendsUI();
});

document.addEventListener("DOMContentLoaded", function () {
  // update friends UI when profile nav/button is clicked
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(
      '[data-target="profile"], a[href="#profile"], .nav-btn#profileBtn, #navProfileBtn, .nav-item[data-target="profile"]'
    );
    if (btn) {
      // small delay to allow any view-switch logic to run
      setTimeout(function () {
        if (typeof renderFriendsUI === "function") renderFriendsUI();
      }, 50);
    }
  });

  // also observe the profile section for visibility changes
  var profileSection = document.getElementById("profile");
  if (profileSection && typeof MutationObserver === "function") {
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === "class") {
          if (!profileSection.classList.contains("hidden")) {
            if (typeof renderFriendsUI === "function") renderFriendsUI();
          }
        }
      });
    });
    mo.observe(profileSection, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
});
