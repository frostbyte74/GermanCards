import { CATEGORIES, loadVocabulary, filterWords, rateWord, shuffled } from "./lib.js";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "germancards-progress-v1";
let words = [], progress = {}, queue = [], flipped = false, sessionRecalls = 0;
let page = 1, libraryResults = [];
const PAGE_SIZE = 50;

function warnStorage() {
  $("storage-warning").hidden = false;
  $("storage-warning").textContent = "Browser storage is unavailable or invalid. You can study, but progress may not survive a reload.";
}
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Invalid saved progress");
  for (const [rank, record] of Object.entries(saved)) {
    if (!/^[1-9]\d*$/.test(rank) || Number(rank) > 5000 ||
      !record || !Number.isInteger(record.streak) || record.streak < 0 || record.streak > 4 ||
      !Number.isFinite(record.due) || !Number.isInteger(record.reviews) || record.reviews < 1) {
      throw new Error("Invalid saved progress");
    }
  }
  progress = saved;
} catch { warnStorage(); }

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch { warnStorage(); }
}
function showPage() {
  const current = ["study", "library", "guide", "sources"].includes(location.hash.slice(1))
    ? location.hash.slice(1) : "study";
  for (const section of document.querySelectorAll(".page")) section.hidden = section.id !== current;
  for (const link of document.querySelectorAll("[data-page]")) {
    const active = link.dataset.page === current;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("hashchange", showPage);
showPage();
for (const form of document.querySelectorAll("form.filters")) form.addEventListener("submit", event => event.preventDefault());

function stats() {
  const entries = Object.values(progress);
  const mastered = entries.filter(record => record.streak >= 3).length;
  $("mastered-count").replaceChildren(document.createTextNode(mastered.toLocaleString() + " "));
  const small = document.createElement("small");
  small.textContent = "/ 5,000 secure";
  $("mastered-count").append(small);
  $("mastery-progress").value = mastered;
  $("reviewed-count").textContent = entries.length.toLocaleString();
  $("due-count").textContent = entries.filter(record => record.due <= Date.now()).length.toLocaleString();
  $("session-count").textContent = sessionRecalls;
}

function studyFilters() {
  return { category: $("study-category").value, gender: $("study-gender").value,
    limit: Number($("study-limit").value), mode: $("study-mode").value };
}
function stopSpeech() { window.speechSynthesis?.cancel(); }
function buildDeck(randomize = false) {
  stopSpeech();
  queue = filterWords(words, studyFilters(), progress);
  if (randomize) queue = shuffled(queue);
  $("review-feedback").textContent = "";
  renderCard();
}
function renderCard() {
  flipped = false;
  $("again").disabled = true;
  $("known").disabled = true;
  $("speech-status").textContent = "";
  $("card-notes").textContent = "";
  $("flashcard").classList.remove("revealed");
  $("card-area").hidden = !queue.length;
  $("empty-deck").hidden = Boolean(queue.length);
  $("deck-count").textContent = `${queue.length.toLocaleString()} card${queue.length === 1 ? "" : "s"} remaining`;
  if (!queue.length) {
    const candidates = filterWords(words, studyFilters(), progress);
    $("empty-title").textContent = candidates.length ? "Deck complete. Gut gemacht!" : "No cards in this selection.";
    $("empty-description").textContent = candidates.length
      ? "Take a break, practice a sentence, or run this selection again."
      : "Try more words, another word family, or All selected words. Due reviews appear when their scheduled time arrives.";
    $("restart").hidden = !candidates.length;
    return;
  }
  const current = queue[0], reverse = $("direction").value === "en-de";
  $("flashcard").disabled = false;
  $("flashcard").setAttribute("aria-label", "Reveal translation");
  $("card-language").textContent = reverse ? "ENGLISH" : "GERMAN";
  $("card-rank").textContent = `#${String(current.rank).padStart(3, "0")}`;
  $("card-article").textContent = reverse ? "" : current.article;
  $("card-word").textContent = reverse ? current.english : current.german;
  $("card-word").lang = reverse ? "en" : "de";
  $("card-pos").textContent = current.part_of_speech;
  $("card-hint").textContent = "Think of the meaning, then tap to reveal";
  $("dictionary-link").href = current.dictionary_url;
  // Don't leak the German answer via speech or a headword link in reverse practice.
  $("speak").disabled = reverse || !("speechSynthesis" in window);
  $("dictionary-link").hidden = reverse;
}
function flip() {
  if (!queue.length) return;
  flipped = !flipped;
  const word = queue[0], reverse = $("direction").value === "en-de";
  const germanSide = reverse ? flipped : !flipped;
  $("card-language").textContent = germanSide ? "GERMAN" : "ENGLISH";
  $("card-article").textContent = germanSide ? word.article : "";
  $("card-word").textContent = germanSide ? word.german : word.english;
  $("card-word").lang = germanSide ? "de" : "en";
  $("card-hint").textContent = flipped ? "How did you do? Be honest with your recall." : "Think of the meaning, then tap to reveal";
  $("card-notes").textContent = flipped ? word.notes : "";
  $("flashcard").classList.toggle("revealed", flipped);
  $("flashcard").setAttribute("aria-label", flipped ? "Show prompt again" : "Reveal translation");
  $("again").disabled = !flipped;
  $("known").disabled = !flipped;
  $("speak").disabled = (reverse && !flipped) || !("speechSynthesis" in window);
  $("dictionary-link").hidden = reverse && !flipped;
}
function rate(known) {
  if (!queue.length || !flipped) return;
  stopSpeech();
  const word = queue.shift();
  progress[word.rank] = rateWord(progress[word.rank], known);
  if (!known) queue.splice(Math.min(4, queue.length), 0, word);
  sessionRecalls++;
  save(); stats(); renderCard();
  $("review-feedback").textContent = known
    ? `${word.german}: saved. Next review in ${[0, 1, 3, 7, 14][progress[word.rank].streak]} day(s).`
    : `${word.german}: you'll see this card again shortly.`;
}
$("flashcard").addEventListener("click", flip);
$("again").addEventListener("click", () => rate(false));
$("known").addEventListener("click", () => rate(true));
$("skip").addEventListener("click", () => {
  if (queue.length) { stopSpeech(); queue.shift(); renderCard(); }
});
$("study-filters").addEventListener("change", () => {
  if ($("study-gender").value !== "all") $("study-category").value = "noun";
  buildDeck();
});
$("study-category").addEventListener("change", () => {
  if ($("study-category").value !== "noun") $("study-gender").value = "all";
});
$("direction").addEventListener("change", () => { stopSpeech(); renderCard(); });
$("shuffle").addEventListener("click", () => buildDeck(true));
$("restart").addEventListener("click", () => buildDeck());
document.addEventListener("keydown", event => {
  if ($("study").hidden || event.altKey || event.ctrlKey || event.metaKey ||
    event.target.closest("input,select,textarea,a") || event.repeat) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault(); rate(event.key === "ArrowRight");
  } else if (event.code === "Space" && !event.target.closest("button")) {
    event.preventDefault(); flip();
  }
});
$("speak").addEventListener("click", () => {
  if (!queue.length || !("speechSynthesis" in window)) return;
  const word = queue[0];
  const utterance = new SpeechSynthesisUtterance(`${word.article} ${word.german}`.trim());
  const voice = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith("de"));
  if (!voice) {
    $("speech-status").textContent = "No German voice available. Install a German system voice to listen.";
    return;
  }
  stopSpeech();
  utterance.voice = voice; utterance.lang = "de-DE"; utterance.rate = 0.85;
  utterance.onerror = () => { $("speech-status").textContent = "Pronunciation unavailable in this browser."; };
  speechSynthesis.speak(utterance);
});

function articleBadge(word) {
  const badge = document.createElement("span");
  badge.className = `noun-article ${word.article}`;
  badge.textContent = word.article;
  badge.title = word.gender;
  return badge;
}
function renderLibrary(reset = false) {
  if (reset) page = 1;
  libraryResults = filterWords(words, {
    category: $("library-category").value, gender: $("library-gender").value,
    query: $("search").value
  });
  const sorting = $("library-sort").value;
  libraryResults.sort((a, b) => sorting === "alpha" ? a.german.localeCompare(b.german, "de") :
    sorting === "family" ? CATEGORIES.indexOf(a.part_of_speech) - CATEGORIES.indexOf(b.part_of_speech) || a.rank - b.rank :
      a.rank - b.rank);
  const pages = Math.max(1, Math.ceil(libraryResults.length / PAGE_SIZE));
  page = Math.min(page, pages);
  $("result-count").textContent = `${libraryResults.length.toLocaleString()} words found`;
  $("page-label").textContent = `Page ${page} of ${pages}`;
  $("prev-page").disabled = page === 1;
  $("next-page").disabled = page === pages;
  const fragment = document.createDocumentFragment();
  for (const word of libraryResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)) {
    const tr = document.createElement("tr");
    const rank = document.createElement("td"); rank.textContent = word.rank;
    const german = document.createElement("td"); german.lang = "de";
    if (word.article) german.append(articleBadge(word), document.createTextNode(" "));
    const link = document.createElement("a");
    link.href = word.dictionary_url; link.textContent = word.german;
    link.target = "_blank"; link.rel = "noopener noreferrer";
    german.append(link);
    const english = document.createElement("td"); english.textContent = word.english;
    const category = document.createElement("td"), badge = document.createElement("span");
    badge.className = "family-badge"; badge.textContent = word.part_of_speech; category.append(badge);
    tr.append(rank, german, english, category); fragment.append(tr);
  }
  if (!libraryResults.length) {
    const row = document.createElement("tr"), cell = document.createElement("td");
    cell.colSpan = 4; cell.textContent = "No matches. Try another spelling or clear the filters.";
    row.append(cell); fragment.append(row);
  }
  $("word-rows").replaceChildren(fragment);
}
$("library-filters").addEventListener("input", () => renderLibrary(true));
$("prev-page").addEventListener("click", () => { page--; renderLibrary(); });
$("next-page").addEventListener("click", () => { page++; renderLibrary(); });
$("reset-progress").addEventListener("click", () => $("reset-dialog").showModal());
$("reset-dialog").addEventListener("close", () => {
  if ($("reset-dialog").returnValue !== "reset") return;
  progress = {}; sessionRecalls = 0; save(); stats(); buildDeck();
  $("reset-status").textContent = "Progress reset in this browser.";
});
window.addEventListener("pagehide", stopSpeech);
setInterval(stats, 60000);

try {
  const response = await fetch(new URL("data/german-5000.csv", import.meta.url));
  if (!response.ok) throw new Error(`CSV request failed (${response.status})`);
  words = loadVocabulary(await response.text());
  if (words.length !== 5000) throw new Error("Expected 5,000 vocabulary entries.");
  for (const id of ["study-category", "library-category"]) {
    for (const category of CATEGORIES) {
      const count = words.filter(word => word.part_of_speech === category).length;
      if (!count) continue;
      const option = document.createElement("option");
      option.value = category; option.textContent = `${category[0].toUpperCase() + category.slice(1)} (${count.toLocaleString()})`;
      $(id).append(option);
    }
  }
  $("load-status").hidden = true;
  stats(); buildDeck(); renderLibrary();
} catch (error) {
  $("load-status").classList.add("error");
  $("load-status").textContent = `Vocabulary could not load: ${error.message}. Serve this folder over HTTP (npm start), or use GitHub Pages; opening index.html directly cannot fetch the CSV.`;
  $("card-area").hidden = true;
}
