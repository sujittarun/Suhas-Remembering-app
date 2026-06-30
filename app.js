const STORAGE_KEY = "suhas-memory-pad-memories-v2";

const iconMap = {
  tooth: "🪥",
  cricket: "🏏",
  bottle: "💧",
  book: "📘",
  star: "⭐",
  cap: "🧢",
  bag: "🎒",
  ball: "⚽",
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
};

const accentMap = {
  tooth: "#29b9ff",
  cricket: "#58d982",
  bottle: "#ffd942",
  book: "#7d7cff",
  star: "#ff9d43",
  cap: "#32b7ff",
  bag: "#ff9d43",
  ball: "#5de7ac",
  notebook: "#2c96ff",
  pencil: "#ffd942",
  shoes: "#7d7cff",
  lunch: "#5de7ac",
  apple: "#ff4f5e",
  umbrella: "#2c96ff",
  toy: "#ffb3d1",
  glasses: "#38d6d0",
  key: "#ffd942",
  medicine: "#ff7c8c",
  music: "#7d7cff",
  clock: "#ffb72f",
};

const pictureRules = [
  { icon: "tooth", words: ["brush", "teeth", "tooth", "toothbrush", "dentist"] },
  { icon: "cricket", words: ["cricket", "bat", "ball", "sports"] },
  { icon: "bottle", words: ["water", "bottle", "drink", "juice"] },
  { icon: "cap", words: ["cap", "hat", "helmet"] },
  { icon: "bag", words: ["bag", "school", "backpack", "class", "uniform"] },
  { icon: "ball", words: ["football", "soccer", "play ball"] },
  { icon: "book", words: ["book", "read", "library", "notebook"] },
  { icon: "notebook", words: ["notebook", "notes", "diary"] },
  { icon: "pencil", words: ["homework", "pencil", "pen", "write", "drawing"] },
  { icon: "shoes", words: ["shoe", "shoes", "socks", "sandals"] },
  { icon: "lunch", words: ["lunch", "tiffin", "food", "meal", "box"] },
  { icon: "apple", words: ["fruit", "apple", "snack"] },
  { icon: "umbrella", words: ["umbrella", "rain", "raincoat"] },
  { icon: "toy", words: ["toy", "lego", "game", "doll"] },
  { icon: "glasses", words: ["glasses", "spectacles"] },
  { icon: "key", words: ["key", "keys", "lock"] },
  { icon: "medicine", words: ["medicine", "tablet", "pill", "doctor"] },
  { icon: "music", words: ["music", "song", "piano", "guitar"] },
  { icon: "clock", words: ["time", "clock", "alarm"] },
];

const seedMemories = [
  makeMemory("Blue school cap", "cap", "today", false),
  makeMemory("Brush teeth", "tooth", "bedtime", false),
  makeMemory("Pack cricket bat", "cricket", "tomorrow", false),
  makeMemory("Water bottle", "bottle", "today", false),
];

let selectedIcon = "cap";
let selectedReminder = "today";
let soundOn = true;
let activeDueMemory = null;
let memories = loadMemories();
memories = memories.map(normalizeMemory);
saveMemories();

const input = document.querySelector("#memoryInput");
const addButton = document.querySelector("#addButton");
const memoryList = document.querySelector("#memoryList");
const memoryCount = document.querySelector("#memoryCount");
const iconButtons = [...document.querySelectorAll(".icon-chip")];
const timeButtons = [...document.querySelectorAll(".time-tile")];
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

renderMemories();
checkDueMemories();
setInterval(checkDueMemories, 30000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

iconButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedIcon = button.dataset.icon;
    iconButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
    chirp(520, 0.05);
  });
});

timeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedReminder = button.dataset.reminder;
    timeButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
    chirp(620, 0.05);
  });
});

addButton.addEventListener("click", addMemory);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addMemory();
  }
});

soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.setAttribute("aria-pressed", String(soundOn));
  showToast(soundOn ? "Voice is on" : "Voice is off");
});

bellButton.addEventListener("click", requestNotifications);
hearDueButton.addEventListener("click", () => {
  if (activeDueMemory) {
    speak(`Remember ${activeDueMemory.text}`);
  }
});

askButton.addEventListener("click", openRecall);
recallInput.addEventListener("input", () => renderRecall(recallInput.value));
document.querySelectorAll("[data-close-recall]").forEach((element) => {
  element.addEventListener("click", closeRecall);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeRecall();
  }
});

appShell.addEventListener("pointermove", (event) => {
  const rect = appShell.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  appShell.style.setProperty("--tilt-x", `${y * -3}deg`);
  appShell.style.setProperty("--tilt-y", `${x * 3}deg`);
});

micButton.addEventListener("click", () => {
  startVoiceInput(input, micButton);
});

recallMicButton.addEventListener("click", () => {
  startVoiceInput(recallInput, recallMicButton, () => renderRecall(recallInput.value));
});

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

  recognition.addEventListener("result", (event) => {
    targetInput.value = event.results[0][0].transcript;
    targetInput.focus();
    if (onResult) onResult();
    showToast("Got it");
  });

  recognition.addEventListener("end", () => {
    targetButton.classList.remove("is-listening");
  });

  recognition.start();
}

function makeMemory(text, icon, reminder, done) {
  const autoIcon = inferIconFromText(text);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text,
    icon: autoIcon || icon,
    reminder,
    done,
    createdAt: new Date().toISOString(),
    dueAt: getDueDate(reminder),
  };
}

function normalizeMemory(memory) {
  const autoIcon = inferIconFromText(memory.text);
  if (!autoIcon || autoIcon === memory.icon) return memory;
  return { ...memory, icon: autoIcon };
}

function inferIconFromText(text) {
  const clean = text.toLowerCase();
  const match = pictureRules.find((rule) => rule.words.some((word) => clean.includes(word)));
  return match?.icon || null;
}

function loadMemories() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : seedMemories;
  } catch {
    return seedMemories;
  }
}

function saveMemories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
}

function addMemory() {
  const text = input.value.trim();

  if (!text) {
    const wrap = document.querySelector(".memory-input-wrap");
    wrap.classList.remove("is-shaking");
    requestAnimationFrame(() => wrap.classList.add("is-shaking"));
    showToast("Add a thing to remember");
    return;
  }

  const memory = makeMemory(text, selectedIcon, selectedReminder, false);
  memories.unshift(memory);
  saveMemories();
  renderMemories();
  launchComet(iconMap[memory.icon]);
  burstConfetti(addButton);
  speak(`Saved ${memory.text}`);
  showToast("Saved to Buddy memory");
  input.value = "";
  input.focus();
  checkDueMemories();
}

function renderMemories() {
  const sorted = [...memories].sort((a, b) => {
    if (isDue(a) !== isDue(b)) return isDue(a) ? -1 : 1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  memoryList.innerHTML = sorted.map(memoryTemplate).join("");
  memoryCount.textContent = `${memories.length} ${memories.length === 1 ? "thing" : "things"} saved`;

  memoryList.querySelectorAll("[data-say]").forEach((button) => {
    button.addEventListener("click", () => {
      const memory = memories.find((item) => item.id === button.dataset.say);
      if (memory) speak(`Remember ${memory.text}`);
    });
  });

  memoryList.querySelectorAll("[data-done]").forEach((button) => {
    button.addEventListener("click", () => {
      const memory = memories.find((item) => item.id === button.dataset.done);
      if (!memory) return;
      memory.done = !memory.done;
      saveMemories();
      renderMemories();
      checkDueMemories();
      burstConfetti(button);
      showToast(memory.done ? "Nice. Marked done" : "Back in memories");
    });
  });

  memoryList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      memories = memories.filter((item) => item.id !== button.dataset.delete);
      saveMemories();
      renderMemories();
      checkDueMemories();
      showToast("Memory removed");
    });
  });
}

function memoryTemplate(memory) {
  const due = isDue(memory);
  const classes = ["memory-card", due ? "is-due" : "", memory.done ? "is-done" : ""].join(" ");
  const accent = accentMap[memory.icon] || accentMap.star;
  return `
    <article class="${classes}" style="--card-accent: ${accent}">
      <div class="memory-icon" aria-hidden="true">${iconMap[memory.icon] || iconMap.star}</div>
      <div class="memory-main">
        <h3 class="memory-title">${escapeHtml(memory.text)}</h3>
        <span class="memory-time">${timeIcon(memory.reminder)} ${describeReminder(memory)}</span>
      </div>
      <div class="memory-actions">
        <button class="card-action say-action" type="button" data-say="${memory.id}" aria-label="Say ${escapeHtml(memory.text)}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z"></path>
            <path d="M16 9a4 4 0 0 1 0 6"></path>
          </svg>
        </button>
        <button class="card-action done-action" type="button" data-done="${memory.id}" aria-label="Mark done">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
        </button>
        <button class="card-action delete-action" type="button" data-delete="${memory.id}" aria-label="Remove memory">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <path d="M6 6l1 15h10l1-15"></path>
          </svg>
        </button>
      </div>
    </article>
  `;
}

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
    if (!cleanQuery) return memory.reminder === "ask" || isDue(memory) || !memory.done;
    return memory.text.toLowerCase().includes(cleanQuery) || memory.reminder.includes(cleanQuery);
  });

  recallResults.innerHTML = results.length
    ? results.map((memory) => `
      <button class="recall-result" type="button" data-recall="${memory.id}">
        <span aria-hidden="true">${iconMap[memory.icon] || iconMap.star}</span>
        <div>
          <strong>${escapeHtml(memory.text)}</strong>
          <small>${describeReminder(memory)}</small>
        </div>
      </button>
    `).join("")
    : `<div class="recall-result"><span aria-hidden="true">⭐</span><div><strong>No memory yet</strong><small>Try another word</small></div></div>`;

  recallResults.querySelectorAll("[data-recall]").forEach((button) => {
    button.addEventListener("click", () => {
      const memory = memories.find((item) => item.id === button.dataset.recall);
      if (!memory) return;
      speak(`Remember ${memory.text}`);
      burstConfetti(button);
    });
  });
}

function getDueDate(reminder) {
  const date = new Date();
  if (reminder === "ask") return null;

  if (reminder === "today") {
    date.setMinutes(date.getMinutes() + 15);
    return date.toISOString();
  }

  if (reminder === "tomorrow") {
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0);
    return date.toISOString();
  }

  if (reminder === "bedtime") {
    date.setHours(20, 30, 0, 0);
    if (date < new Date()) date.setDate(date.getDate() + 1);
    return date.toISOString();
  }

  return null;
}

function describeReminder(memory) {
  if (memory.reminder === "ask") return "When I Ask";
  if (memory.reminder === "today") return "Today";
  if (memory.reminder === "tomorrow") return "Tomorrow";
  if (memory.reminder === "bedtime") return "Bedtime";
  return "Saved";
}

function timeIcon(reminder) {
  if (reminder === "today") return "☀️";
  if (reminder === "tomorrow") return "🌅";
  if (reminder === "bedtime") return "🌙";
  return "💬";
}

function checkDueMemories() {
  activeDueMemory = memories.find((memory) => isDue(memory));
  if (!activeDueMemory) {
    dueBanner.hidden = true;
    return;
  }

  dueText.textContent = `Time for ${activeDueMemory.text}`;
  dueBanner.hidden = false;

  if ("Notification" in window && Notification.permission === "granted" && !activeDueMemory.notifiedAt) {
    new Notification("Suhas Memory Pad", {
      body: activeDueMemory.text,
      icon: "./assets/memory-pad-icon.svg",
    });
    activeDueMemory.notifiedAt = new Date().toISOString();
    saveMemories();
  }
}

function isDue(memory) {
  return Boolean(memory.dueAt && !memory.done && new Date(memory.dueAt) <= new Date());
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("Bell is not supported here");
    bellButton.classList.add("is-muted");
    return;
  }

  if (Notification.permission === "granted") {
    showToast("Bell is already on");
    return;
  }

  const permission = await Notification.requestPermission();
  bellButton.classList.toggle("is-muted", permission !== "granted");
  showToast(permission === "granted" ? "Reminder bell is on" : "Bell was not turned on");
}

function speak(text) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1.18;
  speechSynthesis.speak(utterance);
}

function chirp(frequency, duration) {
  if (!soundOn) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const audio = new AudioContext();
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function burstConfetti(target) {
  const rect = target.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const colors = ["#ff4f5e", "#ffd942", "#5de7ac", "#1f8fff", "#7d7cff", "#ffffff"];

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
  comet.style.setProperty("--sx", "20vw");
  comet.style.setProperty("--sy", "72vh");
  comet.style.setProperty("--tx", "76vw");
  comet.style.setProperty("--ty", "28vh");
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
