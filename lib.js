export const CATEGORIES = [
  "article", "noun", "verb", "auxiliary verb", "adjective", "adverb",
  "pronoun", "preposition", "conjunction", "determiner", "numeral",
  "particle", "interjection"
];

export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = []; field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Unclosed quotation mark in CSV.");
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  if (!headers) throw new Error("The CSV is empty.");
  return rows.map((cells, i) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${i + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((h, j) => [h, cells[j]]));
  });
}

export function encodeCSV(rows, headers) {
  const quote = value => {
    const s = String(value ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [headers, ...rows.map(row => headers.map(h => row[h]))]
    .map(row => row.map(quote).join(",")).join("\r\n") + "\r\n";
}

export function loadVocabulary(text) {
  const words = parseCSV(text).map(row => ({
    ...row, rank: Number(row.rank), source_rank: Number(row.source_rank),
    frequency_count: Number(row.frequency_count)
  }));
  const seen = new Set();
  for (const word of words) {
    if (!Number.isInteger(word.rank) || word.rank < 1 || seen.has(word.rank) ||
        !word.german || !word.english || !CATEGORIES.includes(word.part_of_speech)) {
      throw new Error("Invalid or duplicate vocabulary row.");
    }
    seen.add(word.rank);
  }
  return words.sort((a, b) => a.rank - b.rank);
}

export function searchText(value) {
  return value.toLocaleLowerCase("de").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ß", "ss");
}

export function filterWords(words, { category = "all", gender = "all", limit = 5000,
  query = "", mode = "all" } = {}, progress = {}, now = Date.now()) {
  const needle = searchText(query.trim());
  return words.filter(word => {
    const saved = progress[word.rank];
    return word.rank <= Number(limit) &&
      (category === "all" || word.part_of_speech === category) &&
      (gender === "all" || (word.part_of_speech === "noun" && word.article === gender)) &&
      (!needle || searchText(`${word.german} ${word.english} ${word.article}`).includes(needle)) &&
      (mode !== "new" || !saved) &&
      (mode !== "due" || (saved && saved.due <= now));
  });
}

export function rateWord(previous, known, now = Date.now()) {
  const streak = known ? Math.min((previous?.streak ?? 0) + 1, 4) : 0;
  const days = [0, 1, 3, 7, 14][streak];
  return { streak, due: now + (known ? days * 86400000 : 600000),
    reviews: (previous?.reviews ?? 0) + 1, updated: now };
}

export function shuffled(words, random = Math.random) {
  const result = [...words];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
