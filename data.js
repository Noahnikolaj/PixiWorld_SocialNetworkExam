// Data layer for feed posts — only stores/retrieves data from localStorage, basicly bare dummy layer
const FEED_STORAGE_KEY = "feedData";

function getAllPosts() {
  try {
    const raw = localStorage.getItem(FEED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Corrupt feedData in storage, resetting.", e);
    localStorage.removeItem(FEED_STORAGE_KEY);
    return [];
  }
}

function addPostToStorage(post) {
  const posts = getAllPosts();
  posts.push(post);
  localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(posts));
}

// Delete a post by id from storage
function deletePostFromStorage(postId) {
  const posts = getAllPosts();
  const remaining = posts.filter(function (p) {
    return p.id !== postId;
  });
  localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(remaining));
}

function clearAllFeedData() {
  localStorage.removeItem(FEED_STORAGE_KEY);
}

/**
 * Seed demo posts into localStorage if none exist.
 * Pass true to force overwrite.
 */
function seedDummyPosts(force = false) {
  try {
    const existing = getAllPosts();
    if (existing.length && !force) return; // don't overwrite real data
    const now = Date.now();
    const demo = [
      {
        id: `d-${now}-1`,
        author: "BunnyDraws",
        avatar: "img/avatars/avatar3.png",
        text: "I Love! My space bunny. ✨ Especially the stars on its fur! SPAAAAAAAAAACCEEEEEEE 🌟🐰",
        createdAt: new Date(now - 50 * 60 * 60 * 1000).toISOString(), // 50h ago
        friend: true,
      },
      {
        id: `d-${now}-2`,
        author: "SophieArt",
        avatar: "img/avatars/avatar8.png",
        text: "I built a tiny pixel house today! 🏠",
        createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        friend: true,
      },
      {
        id: `d-${now}-3`,
        author: "LeoGames",
        avatar: "img/avatars/avatar4.png",
        text: "New game idea — who wants to test? 🎮",
        createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
        friend: true,
      },
      {
        id: `d-${now}-4`,
        author: "KevinCoder",
        avatar: "img/avatars/avatar5.png",
        text: "Rainbow dragon finished! 🌈🐉",
        createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
        friend: true,
      },
      {
        id: `d-${now}-5`,
        author: "SuperTrix",
        avatar: "img/avatars/avatar1.png",
        text: "I dont know what to post lol",
        createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
        friend: true,
      },
      {
        id: `d-3`,
        author: "LeoGames",
        avatar: "img/avatars/avatar4.png",
        text: "Thanks for testing my game! More levels coming soon.",
        createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1h ago
      },
      {
        id: `d-${now}-6`,
        author: "DragonChamp",
        avatar: "img/avatars/avatar7.png",
        text: "Bro I love dragons ong 🐉🔥, I just watched the latest How to train your dragons movie and it was the best! cant wait for a sequel!",
        createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1h ago
        friend: true,
      },
    ];

    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(demo));

    // update global friends count based on demo entries with friend === true
    const FRIENDS_COUNT_KEY = "pixiworld:friendsCount";
    const friendCount = demo.filter((p) => p.friend === true).length;
    localStorage.setItem(FRIENDS_COUNT_KEY, String(friendCount));
  } catch (e) {
    console.warn("Could not seed demo posts", e);
  }
}

// run seeder on load if feed is empty
seedDummyPosts();
