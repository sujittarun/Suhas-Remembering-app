const STORAGE_KEY = "suhas-memory-pad-memories-v3";
const remindersWithDateInput = new Set(["daily", "yearly", "custom"]);
const SPEECH_DELAY_MS = 120;

const SUPABASE_URL = "https://ugsklcipzyiogxynshnh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Lrxh3RceGcj7g5JEefze_g_R-bMtAn3";
const VAPID_PUBLIC_KEY = "BKwA35fDJRKOeCVQ2sXjPRDkwlhBXAYXSxsKfxpIYJMl9C-J41fEgly9Z6mgwEVssG7j_plItQEGUIcYsv2L2LI";
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const iconMap = {
  ball: "⚽",
  trophy: "🏆",
  book: "📘",
  bottle: "💧",
  cake: "🎂",
  tooth: "🪥",
  cricket: "🏏",
  cap: "🧢",
  bag: "🎒",
  star: "⭐",
  notebook: "📒",
  pencil: "✏️",
  shoes: "👟",
  lunch: "🍱",
  apple: "🍎",
  umbrella: "☂️",
  toy: "🧸",
  glasses: "👓",
  key: "🔑",
  medicine: "💊",
  music: "🎵",
  clock: "⏰",
  paint: "🎨",
  bike: "🚲",
  dog: "🐶",
};

const accentMap = {
  ball: "#f7a919",
  trophy: "#f7a919",
  book: "#8b6bff",
  bottle: "#29a9f2",
  cake: "#ff5a8a",
  tooth: "#29b9ff",
  cricket: "#35bd6c",
  cap: "#32b7ff",
  bag: "#f7a919",
  star: "#ffb72f",
  notebook: "#2c96ff",
  pencil: "#ffd23c",
  shoes: "#8b6bff",
  lunch: "#4fd07a",
  apple: "#ff4f5e",
  umbrella: "#2c96ff",
  toy: "#ff8ac0",
  glasses: "#38d6d0",
  key: "#ffd23c",
  medicine: "#ff7c8c",
  music: "#8b6bff",
  clock: "#ffb72f",
  paint: "#ff7ac0",
  bike: "#4fd07a",
  dog: "#c99a6a",
};

const pictureRules = [
  { icon: "cake", words: ["birthday", "cake", "party", "anniversary"] },
  { icon: "ball", words: ["football", "soccer", "play ball", "kick"] },
  { icon: "trophy", words: ["practice", "win", "match", "trophy", "medal", "game"] },
  { icon: "tooth", words: ["brush", "teeth", "tooth", "toothbrush", "dentist"] },
  { icon: "cricket", words: ["cricket", "bat"] },
  { icon: "bottle", words: ["water", "bottle", "drink", "juice"] },
  { icon: "cap", words: ["cap", "hat", "helmet"] },
  { icon: "bag", words: ["bag", "school", "backpack", "class", "uniform"] },
  { icon: "book", words: ["book", "read", "story", "library"] },
  { icon: "notebook", words: ["notebook", "notes", "diary"] },
  { icon: "pencil", words: ["homework", "pencil", "pen", "write", "spelling"] },
  { icon: "shoes", words: ["shoe", "shoes", "socks", "sandals"] },
  { icon: "lunch", words: ["lunch", "tiffin", "food", "meal", "snack", "eat"] },
  { icon: "apple", words: ["fruit", "apple"] },
  { icon: "paint", words: ["paint", "draw", "colour", "color", "art", "rainbow"] },
  { icon: "umbrella", words: ["umbrella", "raincoat", "rainy", "raining"] },
  { icon: "toy", words: ["toy", "lego", "doll", "teddy"] },
  { icon: "glasses", words: ["glasses", "spectacles"] },
  { icon: "key", words: ["key", "keys", "lock"] },
  { icon: "medicine", words: ["medicine", "tablet", "pill", "doctor", "vitamin"] },
  { icon: "music", words: ["music", "song", "piano", "guitar", "dance", "sing"] },
  { icon: "bike", words: ["bike", "cycle", "ride"] },
  { icon: "dog", words: ["dog", "puppy", "pet", "feed"] },
  { icon: "clock", words: ["time", "clock", "alarm"] },
];

const seedMemories = [
  makeMemory("Practice Football", "ball", "today", false),
  makeMemory("Read Story Book", "book", "tomorrow", false),
  makeMemory("Drink Water Every Day", "bottle", "daily", false, nextDefaultScheduleDate("daily")),
  makeMemory("Aarav's Birthday", "cake", "yearly", false, nextDefaultScheduleDate("yearly")),
].map((memory, index, list) => ({
  // Keep the showcase order (Practice → Read → Drink → Birthday) since the
  // list is sorted newest-first and same-tick timestamps sort unpredictably.
  ...memory,
  createdAt: new Date(Date.now() - index * 1000).toISOString(),
}));

let selectedIcon = "star";
let userPickedIcon = false;
let selectedReminder = "none";
let soundOn = true;
let audioContext = null;
let speechTimer = 0;
let activeDueMemory = null;
let editingMemoryId = null;
const spokenDueKeys = new Set();
let memories = loadLocalCache().map(normalizeMemory);

const input = document.querySelector("#memoryInput");
const addButton = document.querySelector("#addButton");
const memoryList = document.querySelector("#memoryList");
const memoryCount = document.querySelector("#memoryCount");
const catTiles = [...document.querySelectorAll(".cat-tile")];
const memorySearch = document.querySelector("#memorySearch");
const pictureBadge = document.querySelector("#pictureBadge");
const pictureGlyph = document.querySelector("#pictureGlyph");
const pictureGrid = document.querySelector("#pictureGrid");
const pickerSheet = document.querySelector("#pickerSheet");
const schedulePanel = document.querySelector("#schedulePanel");
const scheduleLabel = document.querySelector("#scheduleLabel");
const customDateTime = document.querySelector("#customDateTime");
const toast = document.querySelector("#toast");
const micButton = document.querySelector("#micButton");
const soundButton = document.querySelector("#soundButton");
const bellButton = document.querySelector("#bellButton");
const dueBanner = document.querySelector("#dueBanner");
const dueText = document.querySelector("#dueText");
const hearDueButton = document.querySelector("#hearDueButton");
const askButton = document.querySelector("#askButton");
const recallDrawer = document.querySelector("#recallDrawer");
const recallInput = document.querySelector("#recallInput");
const recallMicButton = document.querySelector("#recallMicButton");
const recallResults = document.querySelector("#recallResults");
const appShell = document.querySelector("#appShell");
const deviceCard = document.querySelector("#deviceCard");
const rocket = document.querySelector("#rocket");
const headerArtFrame = document.querySelector(".header-art-frame");
const railPrev = document.querySelector("#railPrev");
const railNext = document.querySelector("#railNext");
const editingBanner = document.querySelector("#editingBanner");
const editingBannerText = document.querySelector("#editingBannerText");
const cancelEditButton = document.querySelector("#cancelEditButton");
const buttonLabel = document.querySelector(".button-label");
const skyFar = document.querySelector(".sky-far");
const skyNear = document.querySelector(".sky-near");

buildPictureGrid();
renderMemories();
updateSchedulePanel();
updatePictureBadge();
checkDueMemories();
setInterval(checkDueMemories, 30000);
initMemories();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((registration) => {
      if (Notification.permission === "granted") ensurePushSubscription(registration);
    }).catch(() => {});
  });
}

/* ---------- Category tiles ---------- */
catTiles.forEach((tile) => {
  tile.addEventListener("click", () => {
    selectedReminder = tile.dataset.reminder;
    catTiles.forEach((item) => item.classList.toggle("is-selected", item === tile));
    updateSchedulePanel();
    chirp(620, 0.05);
    buzz(8);
  });
});

customDateTime.addEventListener("change", () => chirp(700, 0.04));

/* ---------- Picture badge + picker ---------- */
pictureBadge.addEventListener("click", openPicker);
document.querySelectorAll("[data-close-picker]").forEach((el) => el.addEventListener("click", closePicker));

input.addEventListener("input", () => {
  if (userPickedIcon) return;
  const auto = inferIconFromText(input.value);
  if (auto && auto !== selectedIcon) {
    selectedIcon = auto;
    updatePictureBadge(true);
  } else if (!input.value.trim()) {
    selectedIcon = "star";
    updatePictureBadge();
  }
});

/* ---------- Add ---------- */
addButton.addEventListener("click", addMemory);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addMemory();
});
cancelEditButton.addEventListener("click", cancelEditingMemory);

/* ---------- Header actions ---------- */
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.setAttribute("aria-pressed", String(soundOn));
  if (!soundOn) {
    clearTimeout(speechTimer);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  showToast(soundOn ? "Voice is on" : "Voice is off");
});
bellButton.addEventListener("click", requestNotifications);
hearDueButton.addEventListener("click", () => {
  if (activeDueMemory) speak(`Remember ${activeDueMemory.text}`);
});

/* ---------- Recall ---------- */
askButton.addEventListener("click", openRecall);
recallInput.addEventListener("input", () => renderRecall(recallInput.value));
document.querySelectorAll("[data-close-recall]").forEach((el) => el.addEventListener("click", closeRecall));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeRecall(); closePicker(); }
});

/* ---------- Rail navigation ---------- */
railPrev.addEventListener("click", () => scrollRail(-1));
railNext.addEventListener("click", () => scrollRail(1));
memoryList.addEventListener("scroll", updateRailNav, { passive: true });
window.addEventListener("resize", updateRailNav);
enableMouseDragScroll(memoryList);

/* ---------- Voice ---------- */
micButton.addEventListener("click", () => startVoiceInput(input, micButton, () => input.dispatchEvent(new Event("input"))));
recallMicButton.addEventListener("click", () => startVoiceInput(recallInput, recallMicButton, () => renderRecall(recallInput.value)));

/* ---------- Parallax + 3D tilt ---------- */
let tiltRaf = 0;
window.addEventListener("pointermove", (event) => {
  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;
  if (tiltRaf) return;
  tiltRaf = requestAnimationFrame(() => {
    tiltRaf = 0;
    deviceCard.style.setProperty("--tilt-x", `${ny * -2.4}deg`);
    deviceCard.style.setProperty("--tilt-y", `${nx * 2.8}deg`);
    if (skyFar) skyFar.style.transform = `translate3d(${nx * -18}px, ${ny * -12}px, 0)`;
    if (skyNear) skyNear.style.transform = `translate3d(${nx * 30}px, ${ny * 18}px, 0)`;
    if (rocket) rocket.style.rotate = `${nx * 10}deg`;
  });
}, { passive: true });

if (window.DeviceOrientationEvent && "ontouchstart" in window) {
  window.addEventListener("deviceorientation", (event) => {
    const nx = Math.max(-1, Math.min(1, (event.gamma || 0) / 30));
    const ny = Math.max(-1, Math.min(1, ((event.beta || 0) - 45) / 30));
    if (skyFar) skyFar.style.transform = `translate3d(${nx * -20}px, ${ny * -14}px, 0)`;
    if (skyNear) skyNear.style.transform = `translate3d(${nx * 34}px, ${ny * 20}px, 0)`;
  }, { passive: true });
}

/* ---------- Voice input ---------- */
function startVoiceInput(targetInput, targetButton, onResult) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Voice typing needs Safari or Chrome");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  targetButton.classList.add("is-listening");
  showToast("I am listening");
  buzz(12);

  recognition.addEventListener("result", (event) => {
    targetInput.value = event.results[0][0].transcript;
    targetInput.focus();
    if (onResult) onResult();
    showToast("Got it");
  });
  recognition.addEventListener("end", () => targetButton.classList.remove("is-listening"));
  recognition.start();
}

/* ---------- Memory model ---------- */
function makeMemory(text, icon, reminder, done, pickedDate = null) {
  const autoIcon = inferIconFromText(text);
  const normalizedReminder = normalizeReminder(reminder);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text,
    icon: icon || autoIcon || "star",
    reminder: normalizedReminder,
    repeat: getRepeatRule(normalizedReminder),
    done,
    createdAt: new Date().toISOString(),
    dueAt: getDueDate(normalizedReminder, pickedDate),
    customAt: pickedDate ? pickedDate.toISOString() : null,
    notifiedForDueAt: null,
  };
}

function normalizeMemory(memory) {
  const reminder = normalizeReminder(memory.reminder);
  const repeat = memory.repeat || getRepeatRule(reminder);
  const customAt = memory.customAt || null;
  const dueAt = reminder === "none"
    ? null
    : memory.dueAt || getDueDate(reminder, customAt ? new Date(customAt) : null);
  return {
    ...memory,
    icon: memory.icon || inferIconFromText(memory.text) || "star",
    reminder,
    repeat,
    dueAt,
    customAt,
    notifiedForDueAt: memory.notifiedForDueAt || memory.notifiedAt || null,
  };
}

function inferIconFromText(text) {
  const clean = text.toLowerCase();
  const match = pictureRules.find((rule) => rule.words.some((word) => clean.includes(word)));
  return match?.icon || null;
}

function loadLocalCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveLocalCache() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
}

/* ---------- Supabase sync ---------- */
function toDbRow(memory) {
  return {
    id: memory.id,
    text: memory.text,
    icon: memory.icon,
    reminder: memory.reminder,
    repeat: memory.repeat,
    done: memory.done,
    created_at: memory.createdAt,
    due_at: memory.dueAt,
    custom_at: memory.customAt,
    notified_for_due_at: memory.notifiedForDueAt,
  };
}

function fromDbRow(row) {
  return normalizeMemory({
    id: row.id,
    text: row.text,
    icon: row.icon,
    reminder: row.reminder,
    repeat: row.repeat,
    done: row.done,
    createdAt: row.created_at,
    dueAt: row.due_at,
    customAt: row.custom_at,
    notifiedForDueAt: row.notified_for_due_at,
  });
}

async function initMemories() {
  if (!supabaseClient) {
    if (!memories.length) {
      memories = seedMemories.map(normalizeMemory);
      saveLocalCache();
      renderMemories();
    }
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    if (data.length === 0) {
      const inserted = await supabaseClient.from("memories").insert(seedMemories.map(toDbRow)).select();
      memories = (inserted.data || seedMemories).map((row) => (row.id ? fromDbRow(row) : normalizeMemory(row)));
    } else {
      memories = data.map(fromDbRow);
    }
    saveLocalCache();
    renderMemories();
    updateSchedulePanel();
    checkDueMemories();
  } catch (err) {
    console.warn("Could not reach Suhas Memory Pad online storage", err);
    if (!memories.length) {
      memories = seedMemories.map(normalizeMemory);
      renderMemories();
    }
    showToast("Offline — showing saved memories");
  }
}

function syncInsert(memory) {
  if (!supabaseClient) return;
  supabaseClient.from("memories").insert(toDbRow(memory)).then(({ error }) => {
    if (error) {
      console.warn("Could not save memory online", error);
      showToast("Saved on this device only");
    }
  });
}

function syncUpdate(memory) {
  if (!supabaseClient) return;
  supabaseClient.from("memories").update(toDbRow(memory)).eq("id", memory.id).then(({ error }) => {
    if (error) console.warn("Could not sync memory update", error);
  });
}

function syncDelete(id) {
  if (!supabaseClient) return;
  supabaseClient.from("memories").delete().eq("id", id).then(({ error }) => {
    if (error) console.warn("Could not sync memory delete", error);
  });
}

function addMemory() {
  const text = input.value.trim();
  if (!text) {
    memorySearch.classList.remove("is-shaking");
    requestAnimationFrame(() => memorySearch.classList.add("is-shaking"));
    showToast("Tell me what to remember");
    buzz([12, 40, 12]);
    return;
  }

  const pickedDate = getPickedScheduleDate();
  if (remindersWithDateInput.has(selectedReminder) && !pickedDate) {
    showToast("Pick a date and time");
    customDateTime.focus();
    return;
  }
  if (selectedReminder === "custom" && pickedDate <= new Date()) {
    showToast("Pick a future time");
    customDateTime.focus();
    return;
  }

  const memoryIcon = userPickedIcon ? selectedIcon : inferIconFromText(text) || selectedIcon;

  if (editingMemoryId) {
    saveEditedMemory(text, memoryIcon, pickedDate);
    return;
  }

  const memory = makeMemory(text, memoryIcon, selectedReminder, false, pickedDate);
  memories.unshift(memory);
  saveLocalCache();
  renderMemories();
  memoryList.scrollTo({ left: 0, behavior: "smooth" });
  launchComet(iconMap[memory.icon]);
  burstConfetti(addButton);
  cheerRocket();
  speak(`Saved ${memory.text}`);
  showToast("Saved to Buddy memory");
  buzz([10, 30, 20]);
  input.value = "";
  selectedIcon = "star";
  userPickedIcon = false;
  updatePictureBadge();
  input.focus();
  checkDueMemories();
  syncInsert(memory);
}

/* ---------- Edit an existing memory ---------- */
function toggleEditMemory(id) {
  if (editingMemoryId === id) {
    cancelEditingMemory();
  } else {
    startEditingMemory(id);
  }
}

function startEditingMemory(id) {
  const memory = memories.find((item) => item.id === id);
  if (!memory) return;

  editingMemoryId = id;
  input.value = memory.text;
  selectedIcon = memory.icon;
  userPickedIcon = true;
  updatePictureBadge();

  selectedReminder = memory.reminder;
  catTiles.forEach((tile) => tile.classList.toggle("is-selected", tile.dataset.reminder === memory.reminder));
  customDateTime.value = "";
  updateSchedulePanel();
  if (remindersWithDateInput.has(memory.reminder)) {
    const source = memory.customAt || memory.dueAt;
    if (source) customDateTime.value = toDateTimeLocalValue(new Date(source));
  }

  memorySearch.classList.add("is-editing");
  addButton.classList.add("is-editing");
  buttonLabel.textContent = "Save changes";
  editingBanner.hidden = false;
  editingBannerText.textContent = `Editing "${memory.text}"`;

  memoryList.querySelectorAll(".memory-card").forEach((card) => {
    card.classList.toggle("is-editing-target", card.dataset.id === id);
  });

  input.focus();
  memorySearch.scrollIntoView({ behavior: "smooth", block: "center" });
  chirp(680, 0.05);
  buzz(10);
}

function cancelEditingMemory() {
  if (!editingMemoryId) return;
  editingMemoryId = null;
  input.value = "";
  selectedIcon = "star";
  userPickedIcon = false;
  updatePictureBadge();
  selectedReminder = "none";
  catTiles.forEach((tile) => tile.classList.toggle("is-selected", tile.dataset.reminder === "none"));
  customDateTime.value = "";
  updateSchedulePanel();

  memorySearch.classList.remove("is-editing");
  addButton.classList.remove("is-editing");
  buttonLabel.textContent = "Add Memory";
  editingBanner.hidden = true;

  memoryList.querySelectorAll(".memory-card.is-editing-target").forEach((card) => {
    card.classList.remove("is-editing-target");
  });
}

function saveEditedMemory(text, icon, pickedDate) {
  const memory = memories.find((item) => item.id === editingMemoryId);
  if (!memory) {
    cancelEditingMemory();
    return;
  }

  const newReminder = normalizeReminder(selectedReminder);
  memory.text = text;
  memory.icon = icon;
  memory.reminder = newReminder;
  memory.repeat = getRepeatRule(newReminder);
  memory.dueAt = getDueDate(newReminder, pickedDate);
  memory.customAt = pickedDate ? pickedDate.toISOString() : null;
  memory.notifiedForDueAt = null;

  saveLocalCache();
  cancelEditingMemory();
  renderMemories();
  checkDueMemories();
  speak(`Updated ${memory.text}`);
  showToast("Memory updated");
  buzz([10, 30, 20]);
  input.focus();
  syncUpdate(memory);
}

/* ---------- Render memories ---------- */
function renderMemories() {
  const sorted = [...memories].sort((a, b) => {
    if (isDue(a) !== isDue(b)) return isDue(a) ? -1 : 1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (!sorted.length) {
    memoryList.innerHTML = `<div class="memory-empty"><span>⭐</span>Nothing saved yet.<br>Type something and tap Add Memory!</div>`;
  } else {
    memoryList.innerHTML = sorted.map(memoryTemplate).join("");
  }
  memoryCount.textContent = `${memories.length} ${memories.length === 1 ? "thing" : "things"} saved`;

  memoryList.querySelectorAll(".memory-card").forEach((card) => {
    attachCardGestures(card);
    card.classList.toggle("is-editing-target", card.dataset.id === editingMemoryId);
  });

  memoryList.querySelectorAll("[data-say]").forEach((button) => {
    button.addEventListener("click", () => {
      const memory = memories.find((item) => item.id === button.dataset.say);
      if (memory) { speak(`Remember ${memory.text}`); buzz(8); }
    });
  });

  memoryList.querySelectorAll("[data-done]").forEach((button) => {
    button.addEventListener("click", () => completeMemory(button.dataset.done, button));
  });

  memoryList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".memory-card");
      if (card) card.classList.add("is-removing");
      buzz(14);
      const id = button.dataset.delete;
      if (id === editingMemoryId) cancelEditingMemory();
      setTimeout(() => {
        memories = memories.filter((item) => item.id !== id);
        saveLocalCache();
        renderMemories();
        checkDueMemories();
        showToast("Memory removed");
        syncDelete(id);
      }, 360);
    });
  });

  updateRailNav();
}

function completeMemory(id, originEl, launch = false) {
  const memory = memories.find((item) => item.id === id);
  if (!memory) return;
  const card = originEl ? originEl.closest(".memory-card") : memoryList.querySelector(`[data-id="${id}"]`);
  const repeatMessage = completeRepeatingMemory(memory);
  buzz([10, 20, 30]);

  const finish = () => {
    if (!repeatMessage) memory.done = !memory.done;
    saveLocalCache();
    renderMemories();
    checkDueMemories();
    if (card) burstConfetti(card);
    showToast(repeatMessage || (memory.done ? "Yay! Marked done" : "Back in memories"));
    syncUpdate(memory);
  };

  if (launch && card && !memory.done && !repeatMessage) {
    card.classList.add("is-launching");
    if (card) burstConfetti(card);
    setTimeout(finish, 520);
  } else {
    finish();
  }
}

function memoryTemplate(memory) {
  const due = isDue(memory);
  const classes = ["memory-card", due ? "is-due" : "", memory.done ? "is-done" : ""].join(" ");
  const accent = accentMap[memory.icon] || accentMap.star;
  return `
    <article class="${classes}" data-id="${memory.id}" style="--card-accent: ${accent}">
      <span class="corner-star" aria-hidden="true">⭐</span>
      <span class="edit-hint" aria-hidden="true">✏️</span>
      <div class="memory-icon" aria-hidden="true">${iconMap[memory.icon] || iconMap.star}</div>
      <div class="memory-main">
        <h3 class="memory-title">${escapeHtml(memory.text)}</h3>
        <span class="memory-time">${timeIcon(memory.reminder)} ${describeReminder(memory)}</span>
      </div>
      <div class="memory-actions">
        <button class="card-action say-action" type="button" data-say="${memory.id}" aria-label="Say ${escapeHtml(memory.text)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M16 9a4 4 0 0 1 0 6"></path></svg>
        </button>
        <button class="card-action done-action" type="button" data-done="${memory.id}" aria-label="Mark done">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"></path></svg>
        </button>
        <button class="card-action delete-action" type="button" data-delete="${memory.id}" aria-label="Remove memory">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 15h10l1-15"></path></svg>
        </button>
      </div>
    </article>
  `;
}

/* ---------- Card gestures: tilt + swipe-up to complete ---------- */
function attachCardGestures(card) {
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let decided = false;
  let pointerId = null;

  // Hover tilt (desktop)
  card.addEventListener("pointermove", (event) => {
    if (dragging || event.pointerType !== "mouse") return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateX(${py * -10}deg) rotateY(${px * 12}deg) translateY(-4px)`;
  });
  card.addEventListener("pointerleave", () => {
    if (!dragging) card.style.transform = "";
  });

  card.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".card-action")) return;
    startX = event.clientX;
    startY = event.clientY;
    decided = false;
    dragging = false;
    pointerId = event.pointerId;
  });

  card.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    if (event.buttons === 0 && event.pointerType === "mouse") return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // Vertical upward gesture => start swipe-to-complete. Otherwise let rail scroll.
      if (Math.abs(dy) > Math.abs(dx) && dy < 0) {
        decided = true;
        dragging = true;
        card.setPointerCapture(event.pointerId);
        card.style.transition = "none";
      } else {
        decided = true;
        dragging = false;
      }
    }
    if (dragging) {
      const lift = Math.min(0, dy);
      card.style.transform = `translateY(${lift}px) scale(${1 + Math.min(0.06, -lift / 1600)})`;
      card.style.opacity = String(1 + Math.max(-0.4, lift / 300));
    }
  });

  const endDrag = (event) => {
    if (pointerId !== event.pointerId) return;
    const dy = event.clientY - startY;
    const wasTap = !decided;
    card.style.transition = "";
    if (dragging && dy < -70) {
      const id = card.dataset.id;
      const memory = memories.find((m) => m.id === id);
      card.style.transform = "";
      card.style.opacity = "";
      completeMemory(id, card, memory && !memory.done);
    } else {
      card.style.transform = "";
      card.style.opacity = "";
      if (wasTap && !event.target.closest(".card-action")) {
        toggleEditMemory(card.dataset.id);
      }
    }
    dragging = false;
    decided = false;
    pointerId = null;
  };
  card.addEventListener("pointerup", endDrag);
  card.addEventListener("pointercancel", endDrag);
}

/* ---------- Rail nav ---------- */
function scrollRail(direction) {
  const card = memoryList.querySelector(".memory-card");
  const step = card ? card.offsetWidth + 18 : 260;
  memoryList.scrollBy({ left: direction * step, behavior: "smooth" });
  buzz(6);
}

function updateRailNav() {
  const max = memoryList.scrollWidth - memoryList.clientWidth - 4;
  const overflowing = max > 4;
  railPrev.disabled = !overflowing || memoryList.scrollLeft <= 4;
  railNext.disabled = !overflowing || memoryList.scrollLeft >= max;
}

function enableMouseDragScroll(el) {
  let down = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;
  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") return;
    if (event.target.closest(".memory-card")) return; // cards handle their own gesture
    down = true;
    moved = false;
    startX = event.clientX;
    startScroll = el.scrollLeft;
    el.classList.add("is-grabbing");
  });
  window.addEventListener("pointermove", (event) => {
    if (!down) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    el.scrollLeft = startScroll - dx;
  });
  window.addEventListener("pointerup", () => {
    down = false;
    el.classList.remove("is-grabbing");
  });
}

/* ---------- Picture picker ---------- */
function buildPictureGrid() {
  pictureGrid.innerHTML = Object.keys(iconMap).map((key) => `
    <button type="button" data-pic="${key}" aria-label="${key}">${iconMap[key]}</button>
  `).join("");
  pictureGrid.querySelectorAll("[data-pic]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedIcon = button.dataset.pic;
      userPickedIcon = true;
      updatePictureBadge(true);
      chirp(560, 0.05);
      buzz(8);
      closePicker();
    });
  });
}

function updatePictureBadge(pop = false) {
  pictureGlyph.textContent = iconMap[selectedIcon] || "⭐";
  if (pop) {
    pictureBadge.classList.remove("is-pop");
    requestAnimationFrame(() => pictureBadge.classList.add("is-pop"));
  }
}

function openPicker() {
  pictureGrid.querySelectorAll("[data-pic]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.pic === selectedIcon);
  });
  pickerSheet.classList.add("is-open");
  pickerSheet.setAttribute("aria-hidden", "false");
}
function closePicker() {
  pickerSheet.classList.remove("is-open");
  pickerSheet.setAttribute("aria-hidden", "true");
}

/* ---------- Recall ---------- */
function openRecall() {
  recallDrawer.classList.add("is-open");
  recallDrawer.setAttribute("aria-hidden", "false");
  recallInput.value = "";
  renderRecall("");
  setTimeout(() => recallInput.focus(), 120);
  speak("What do you need?");
}
function closeRecall() {
  recallDrawer.classList.remove("is-open");
  recallDrawer.setAttribute("aria-hidden", "true");
}
function renderRecall(query) {
  const cleanQuery = query.trim().toLowerCase();
  const results = memories.filter((memory) => {
    if (!cleanQuery) return memory.reminder === "none" || isDue(memory) || !memory.done;
    const reminderLabel = describeReminder(memory).toLowerCase();
    return (
      memory.text.toLowerCase().includes(cleanQuery) ||
      memory.reminder.includes(cleanQuery) ||
      reminderLabel.includes(cleanQuery)
    );
  });

  recallResults.innerHTML = results.length
    ? results.map((memory) => `
      <button class="recall-result" type="button" data-recall="${memory.id}">
        <span aria-hidden="true">${iconMap[memory.icon] || iconMap.star}</span>
        <div><strong>${escapeHtml(memory.text)}</strong><small>${describeReminder(memory)}</small></div>
      </button>
    `).join("")
    : `<div class="recall-result"><span aria-hidden="true">⭐</span><div><strong>No memory yet</strong><small>Try another word</small></div></div>`;

  recallResults.querySelectorAll("[data-recall]").forEach((button) => {
    button.addEventListener("click", () => {
      const memory = memories.find((item) => item.id === button.dataset.recall);
      if (!memory) return;
      speak(`Remember ${memory.text}`);
      burstConfetti(button);
      buzz(8);
    });
  });
}

/* ---------- Schedule ---------- */
function updateSchedulePanel() {
  const needsDate = remindersWithDateInput.has(selectedReminder);
  schedulePanel.hidden = !needsDate;
  if (!needsDate) return;
  scheduleLabel.textContent = getScheduleLabel(selectedReminder);
  if (!customDateTime.value) {
    customDateTime.value = toDateTimeLocalValue(nextDefaultScheduleDate(selectedReminder));
  }
}
function getScheduleLabel(reminder) {
  if (reminder === "daily") return "Daily reminder time";
  if (reminder === "yearly") return "Yearly reminder day";
  return "Pick date and time";
}
function getPickedScheduleDate() {
  if (!customDateTime.value) return null;
  const date = new Date(customDateTime.value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function normalizeReminder(reminder) {
  if (!reminder || reminder === "ask") return "none";
  if (["none", "today", "tomorrow", "bedtime", "daily", "yearly", "custom"].includes(reminder)) return reminder;
  return "none";
}
function getRepeatRule(reminder) {
  if (reminder === "daily") return "daily";
  if (reminder === "yearly") return "yearly";
  return "none";
}
function nextDefaultScheduleDate(reminder) {
  const date = new Date();
  if (reminder === "daily") {
    date.setHours(8, 0, 0, 0);
    if (date <= new Date()) date.setDate(date.getDate() + 1);
    return date;
  }
  if (reminder === "yearly") {
    date.setHours(9, 0, 0, 0);
    date.setMonth(date.getMonth() + 1);
    return date;
  }
  date.setMinutes(date.getMinutes() + 15);
  date.setSeconds(0, 0);
  return date;
}
function completeRepeatingMemory(memory) {
  if (memory.repeat !== "daily" && memory.repeat !== "yearly") return "";
  memory.done = false;
  memory.dueAt = getNextRepeatDate(memory);
  memory.notifiedForDueAt = null;
  memory.customAt = memory.dueAt;
  return memory.repeat === "daily" ? "Great! Next daily reminder set" : "Great! Next yearly reminder set";
}
function getNextRepeatDate(memory) {
  const fromDate = memory.dueAt ? new Date(memory.dueAt) : nextDefaultScheduleDate(memory.repeat);
  if (memory.repeat === "daily") fromDate.setDate(fromDate.getDate() + 1);
  if (memory.repeat === "yearly") fromDate.setFullYear(fromDate.getFullYear() + 1);
  return rollDateForward(fromDate, memory.repeat).toISOString();
}
function rollDateForward(date, repeat) {
  const rolled = new Date(date);
  const now = new Date();
  if (Number.isNaN(rolled.getTime())) return nextDefaultScheduleDate(repeat);
  while (rolled <= now) {
    if (repeat === "daily") rolled.setDate(rolled.getDate() + 1);
    if (repeat === "yearly") rolled.setFullYear(rolled.getFullYear() + 1);
  }
  return rolled;
}
function toDateTimeLocalValue(date) {
  const value = new Date(date);
  const pad = (number) => String(number).padStart(2, "0");
  return [value.getFullYear(), pad(value.getMonth() + 1), pad(value.getDate())].join("-") +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
function getDueDate(reminder, pickedDate = null) {
  const date = pickedDate ? new Date(pickedDate) : new Date();
  const now = new Date();
  if (reminder === "none" || reminder === "ask") return null;
  if (reminder === "today") { date.setMinutes(now.getMinutes() + 15); return date.toISOString(); }
  if (reminder === "tomorrow") { date.setDate(now.getDate() + 1); date.setHours(8, 0, 0, 0); return date.toISOString(); }
  if (reminder === "bedtime") { date.setHours(20, 30, 0, 0); if (date < new Date()) date.setDate(date.getDate() + 1); return date.toISOString(); }
  if (reminder === "custom") return pickedDate ? date.toISOString() : null;
  if (reminder === "daily") return rollDateForward(date, "daily").toISOString();
  if (reminder === "yearly") return rollDateForward(date, "yearly").toISOString();
  return null;
}
function describeReminder(memory) {
  if (memory.reminder === "none" || memory.reminder === "ask") return "Just saved";
  if (memory.reminder === "today") return `Today${formatTime(memory.dueAt)}`;
  if (memory.reminder === "tomorrow") return `Tomorrow${formatTime(memory.dueAt)}`;
  if (memory.reminder === "bedtime") return "Bedtime";
  if (memory.reminder === "daily") return `Daily${formatTime(memory.dueAt)}`;
  if (memory.reminder === "yearly") return `${formatMonthDay(memory.dueAt)}`;
  if (memory.reminder === "custom") return formatDateTime(memory.dueAt);
  return "Saved";
}
function timeIcon(reminder) {
  if (reminder === "today") return "☀️";
  if (reminder === "tomorrow") return "🌄";
  if (reminder === "bedtime") return "🌙";
  if (reminder === "daily") return "🔁";
  if (reminder === "yearly") return "🎂";
  if (reminder === "custom") return "⏰";
  return "⭐";
}
function formatTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return ` ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)}`;
}
function formatMonthDay(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Yearly";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}
function formatDateTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Pick Time";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

/* ---------- Due ---------- */
function checkDueMemories() {
  activeDueMemory = memories.find((memory) => isDue(memory));
  if (!activeDueMemory) { dueBanner.hidden = true; return; }
  dueText.textContent = `Time for ${activeDueMemory.text}`;
  dueBanner.hidden = false;

  const dueKey = `${activeDueMemory.id}:${activeDueMemory.dueAt}`;
  if (!spokenDueKeys.has(dueKey)) {
    spokenDueKeys.add(dueKey);
    speak(`Remember ${activeDueMemory.text}`);
  }

  if ("Notification" in window && Notification.permission === "granted" && activeDueMemory.notifiedForDueAt !== activeDueMemory.dueAt) {
    new Notification("Suhas Remember Rocket", { body: activeDueMemory.text, icon: "./assets/memory-pad-icon.svg" });
    activeDueMemory.notifiedForDueAt = activeDueMemory.dueAt;
    saveLocalCache();
    syncUpdate(activeDueMemory);
  }
}
function isDue(memory) {
  return Boolean(memory.dueAt && !memory.done && new Date(memory.dueAt) <= new Date());
}
async function requestNotifications() {
  if (!("Notification" in window)) { showToast("Bell is not supported here"); bellButton.classList.add("is-muted"); return; }
  if (Notification.permission === "granted") {
    showToast("Bell is already on");
    ensurePushSubscription();
    return;
  }
  const permission = await Notification.requestPermission();
  bellButton.classList.toggle("is-muted", permission !== "granted");
  showToast(permission === "granted" ? "Reminder bell is on" : "Bell was not turned on");
  if (permission === "granted") ensurePushSubscription();
}

/* ---------- Push notifications (fire even when the tab is closed) ---------- */
async function ensurePushSubscription(registrationHint) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !supabaseClient) return;
  try {
    const registration = registrationHint || (await navigator.serviceWorker.ready);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = subscription.toJSON();
    await supabaseClient.from("push_subscriptions").upsert(
      { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" }
    );
  } catch (err) {
    console.warn("Could not set up push notifications", err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/* ---------- Sound + feedback ---------- */
function speak(text) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  clearTimeout(speechTimer);
  speechSynthesis.cancel();
  speechTimer = setTimeout(() => {
    if (!soundOn) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.18;
    speechSynthesis.speak(utterance);
  }, SPEECH_DELAY_MS);
}
function chirp(frequency, duration) {
  if (!soundOn) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  const audio = audioContext;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration + 0.02);
}
function buzz(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}
function cheerRocket() {
  if (rocket) {
    rocket.animate(
      [
        { transform: "translate(-50%, -50%) rotate(-4deg) scale(1)" },
        { transform: "translate(-50%, -90%) rotate(6deg) scale(1.15)" },
        { transform: "translate(-50%, -50%) rotate(-4deg) scale(1)" },
      ],
      { duration: 700, easing: "cubic-bezier(.34,1.56,.64,1)" }
    );
    return;
  }
  if (!headerArtFrame) return;
  headerArtFrame.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1) rotate(-.25deg)" },
      { transform: "translate3d(0, -10px, 0) scale(1.025) rotate(.65deg)" },
      { transform: "translate3d(0, 0, 0) scale(1) rotate(-.25deg)" },
    ],
    { duration: 700, easing: "cubic-bezier(.34,1.56,.64,1)" }
  );
}
function burstConfetti(target) {
  const rect = target.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const colors = ["#ff4f63", "#ffd23c", "#4fd07a", "#2c96ff", "#8b6bff", "#ffffff"];
  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--x", `${(Math.random() - 0.5) * 420}px`);
    piece.style.setProperty("--y", `${-80 - Math.random() * 260}px`);
    piece.style.setProperty("--r", `${Math.random() * 680 - 340}deg`);
    document.body.append(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}
function launchComet(icon) {
  const comet = document.createElement("span");
  comet.className = "memory-comet";
  comet.textContent = icon;
  comet.style.setProperty("--sx", "50vw");
  comet.style.setProperty("--sy", "80vh");
  comet.style.setProperty("--tx", "78vw");
  comet.style.setProperty("--ty", "18vh");
  document.body.append(comet);
  comet.addEventListener("animationend", () => comet.remove());
}
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
