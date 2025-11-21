// Bible Books Data
const BIBLE_BOOKS = {
  "Old Testament": [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  ],
  "New Testament": [
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
  ],
};

// Data stores
let BIBLE_DATA = {};
let SONG_DATA = {};

// State
let currentContent = {
  type: null, // 'song' or 'verse'
  title: "",
  text: "",
  citation: "",
};

// DOM Elements
const elements = {
  tabs: document.querySelectorAll(".tab-btn"),
  tabContents: document.querySelectorAll(".tab-content"),
  bookSelect: document.getElementById("bookName"),
  loadSongBtn: document.getElementById("loadSong"),
  loadVerseBtn: document.getElementById("loadVerse"),
  previewSection: document.getElementById("previewSection"),
  previewMeta: document.getElementById("previewMeta"),
  previewText: document.getElementById("previewText"),
  startProjectionBtn: document.getElementById("startProjection"),
  projectionWindow: document.getElementById("projectionWindow"),
  closeProjectionBtn: document.getElementById("closeProjection"),
  projTitle: document.getElementById("projectionTitle"),
  projText: document.getElementById("projectionText"),
  projInfo: document.getElementById("projectionVerseInfo"),
  statusBadge: document.getElementById("connectionStatus"),
  inputs: {
    song: document.getElementById("songNumber"),
    version: document.getElementById("bibleVersion"),
    book: document.getElementById("bookName"),
    chapter: document.getElementById("chapter"),
    start: document.getElementById("startVerse"),
    end: document.getElementById("endVerse"),
  },
};

// --- Data Loading and Parsing ---

async function loadLocalData() {
  try {
    elements.statusBadge.textContent = "Loading data...";
    const [bibleRes, songRes] = await Promise.all([
      fetch("verses-1769.json"),
      fetch("SDAH.sps"),
    ]);

    if (!bibleRes.ok) throw new Error("Failed to load Bible data.");
    BIBLE_DATA = await bibleRes.json();

    if (!songRes.ok) throw new Error("Failed to load Song data.");
    const spsText = await songRes.text();
    SONG_DATA = parseSps(spsText);

    elements.statusBadge.textContent = "Ready";
    elements.statusBadge.style.color = "#4ade80"; // Green color for ready
  } catch (error) {
    console.error("Data loading error:", error);
    elements.statusBadge.textContent = "Error";
    elements.statusBadge.style.color = "#f87171"; // Red color for error
    alert("Failed to load local data files. Please ensure verses-1769.json and SDAH.sps are in the same directory.");
  }
}

function parseSps(text) {
  const songs = {};
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.startsWith("##") && line.includes("#$#")) {
      const parts = line.split("#$#");
      const number = parseInt(parts[0], 10);
      if (isNaN(number)) continue;

      const title = parts[1] || "Unknown Title";
      let lyrics = parts[6] || "";

      // Clean up lyrics
      lyrics = lyrics.replace(/@\$/g, "\n\n").replace(/@%/g, "\n").trim();
      // Remove verse markers like 'Verse 1' or 'Refrain'
      lyrics = lyrics.replace(/^(Verse \d+|Refrain)\n/gm, '');

      songs[number] = { title, lyrics };
    }
  }
  return songs;
}


// --- Initialization ---

function init() {
  populateBooks();
  setupEventListeners();
  loadLocalData();
}

// --- UI Setup ---

function populateBooks() {
  for (const [testament, books] of Object.entries(BIBLE_BOOKS)) {
    const group = document.createElement("optgroup");
    group.label = testament;
    books.forEach((book) => {
      const option = document.createElement("option");
      option.value = book;
      option.textContent = book;
      group.appendChild(option);
    });
    elements.bookSelect.appendChild(group);
  }
}

function setupEventListeners() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  elements.loadSongBtn.addEventListener("click", loadSong);
  elements.loadVerseBtn.addEventListener("click", loadVerse);

  elements.startProjectionBtn.addEventListener("click", openProjection);
  elements.closeProjectionBtn.addEventListener("click", closeProjection);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !elements.projectionWindow.classList.contains("hidden")) {
      closeProjection();
    }
  });
}

function switchTab(tabId) {
  elements.tabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  elements.tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === `${tabId}Section`);
  });
  elements.previewSection.classList.add("hidden");
}

// --- Content Loading Logic ---

function loadSong() {
  const number = elements.inputs.song.value;
  if (!number) return alert("Please enter a song number.");

  const song = SONG_DATA[number];

  if (song) {
    currentContent = {
      type: "song",
      title: `Hymn #${number}`,
      text: song.lyrics,
      citation: song.title,
    };
    updatePreview();
  } else {
    alert(`Song #${number} not found.`);
  }
}

async function loadVerse() {
  const book = elements.inputs.book.value;
  const chapter = elements.inputs.chapter.value;
  const startVerse = parseInt(elements.inputs.start.value, 10);
  const endVerse = parseInt(elements.inputs.end.value, 10) || startVerse;

  if (!book || !chapter || !startVerse) {
    return alert("Please fill in Book, Chapter, and Start Verse.");
  }
  
  elements.loadVerseBtn.textContent = "Loading...";
  elements.loadVerseBtn.disabled = true;

  const verses = [];
  let citation = `${book} ${chapter}:${startVerse}`;
  if (startVerse !== endVerse) {
    citation += `-${endVerse}`;
  }

  for (let i = startVerse; i <= endVerse; i++) {
    const key = `${book} ${chapter}:${i}`;
    const verseText = BIBLE_DATA[key];
    if (verseText) {
      // Remove any leading '#' characters from the verse text
      verses.push(verseText.replace(/^#\s*/, ''));
    } else {
      verses.push(`[${book} ${chapter}:${i} not found]`);
    }
  }

  currentContent = {
    type: "verse",
    title: "Scripture Reading",
    text: verses.join("\n"),
    citation: `${citation} (KJV)`, // Assuming KJV from the filename
  };
  
  updatePreview();

  elements.loadVerseBtn.textContent = "Load Passage";
  elements.loadVerseBtn.disabled = false;
}


// --- UI Update & Projection ---

function updatePreview() {
  elements.previewMeta.textContent = currentContent.citation;
  elements.previewText.textContent = currentContent.text;
  elements.previewSection.classList.remove("hidden");
}

function openProjection() {
  elements.projTitle.textContent = currentContent.title;
  elements.projText.textContent = currentContent.text;
  elements.projInfo.textContent = currentContent.citation;
  elements.projectionWindow.classList.remove("hidden");
}

function closeProjection() {
  elements.projectionWindow.classList.add("hidden");
}

// Run Init
init();
