import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSV, encodeCSV } from "../lib.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const csvPath = process.argv[2] ?? resolve(root, ".sources", "wordhoard-de.csv");
const dbPath = process.argv[3] ?? resolve(root, ".sources", "dictionary-de.db");
const frequencyPath = process.argv[4] ?? resolve(root, ".sources", "de_50k.txt");
const hashes = {
  csv: "8e692f741f4d34815dca22377e9b57f5a64a288da0017c92371cb81bc7b75046",
  db: "5eec9eb09eb9bbf55893e614be92003f402b2a1a1cb71345305083a22ded6a4b",
  frequency: "d9e50546fd7e8b6fe6542a2b33c51d1331092b2a3916ec09f80d97856068705b"
};
function checkedRead(path, expected) {
  const bytes = readFileSync(path);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`Source checksum mismatch: ${path}`);
  return bytes;
}
const annotations = parseCSV(checkedRead(csvPath, hashes.csv).toString("utf8"))
  .sort((a, b) => Number(a.frequency_rank) - Number(b.frequency_rank));
const annotationMap = new Map();
for (const row of annotations) {
  const key = row.lemma.toLocaleLowerCase("de");
  if (!annotationMap.has(key)) annotationMap.set(key, row);
}
const source = checkedRead(frequencyPath, hashes.frequency).toString("utf8").trim()
  .split(/\r?\n/).map((line, i) => {
    const [lemma, count] = line.split(" ");
    return { lemma, frequency_rank: i + 1, frequency_count: Number(count) };
  });
checkedRead(dbPath, hashes.db);
const db = new DatabaseSync(dbPath, { readOnly: true });
const lookup = db.prepare("SELECT pos, gloss FROM senses WHERE word = ? ORDER BY sort_order, id");
const inflections = db.prepare("SELECT lemma, type FROM inflections WHERE inflected_form = ? ORDER BY lemma");
const posMap = {
  NOUN: ["noun"], VERB: ["verb"], AUX: ["verb"], ADJ: ["adj"], ADV: ["adv"],
  PRON: ["pron"], ADP: ["prep", "postp"], CCONJ: ["conj"], SCONJ: ["conj"],
  DET: ["article", "det"], NUM: ["num"], PART: ["particle", "adv"], INTJ: ["intj"]
};
// These core glosses need context that a first-dictionary-sense rule cannot supply.
const core = {
  sein: ["verb", "to be"],
  haben: ["auxiliary verb", "to have; used to form the perfect tense"],
  werden: ["auxiliary verb", "to become; will (future auxiliary)"],
  der: ["article", "the (masculine nominative; also other case forms)"],
  die: ["article", "the (feminine singular or plural; nominative/accusative)"],
  das: ["article", "the (neuter singular; nominative/accusative); that (pronoun)"],
  ein: ["article", "a; an (masculine/neuter nominative)"],
  eine: ["article", "a; an (feminine nominative/accusative)"],
  sie: ["pronoun", "she; they; her; them; Sie = formal you"],
  ich: ["pronoun", "I"], du: ["pronoun", "you (informal singular)"],
  mir: ["pronoun", "to me; for me (dative of ich)"],
  mich: ["pronoun", "me (accusative); myself (reflexive)"],
  dir: ["pronoun", "to you; for you (informal singular dative)"],
  dich: ["pronoun", "you (accusative); yourself (informal singular)"],
  ihn: ["pronoun", "him; it (masculine accusative)"],
  ihnen: ["pronoun", "to them; Ihnen = to you (formal)"],
  uns: ["pronoun", "us; to us; ourselves"],
  euch: ["pronoun", "you; to you; yourselves (informal plural)"],
  ihr: ["pronoun", "you (informal plural); to her; her/their (possessive)"],
  nicht: ["particle", "not"], ja: ["adverb", "yes; indeed"],
  im: ["preposition", "in the (in + dem)"],
  am: ["preposition", "at the; on the (an + dem)"],
  zum: ["preposition", "to the (zu + dem)"],
  zur: ["preposition", "to the (zu + der)"],
  vom: ["preposition", "from the; of the (von + dem)"],
  ins: ["preposition", "into the (in + das)"],
  danke: ["interjection", "thank you; thanks"],
  ist: ["verb", "is (from sein)"], bin: ["verb", "am (from sein)"],
  bist: ["verb", "are (you, informal singular; from sein)"],
  sind: ["verb", "are (we/they/formal you; from sein)"],
  seid: ["verb", "are (you, informal plural; from sein)"],
  war: ["verb", "was (from sein)"], waren: ["verb", "were (from sein)"],
  wäre: ["verb", "would be; were (hypothetical; from sein)"],
  hat: ["verb", "has (from haben)"], habe: ["verb", "have (I have; from haben)"],
  hab: ["verb", "have (informal short form of habe)"],
  hast: ["verb", "have (you have; informal singular; from haben)"],
  hatte: ["verb", "had (from haben)"], hatten: ["verb", "had (we/they/formal you; from haben)"],
  kann: ["verb", "can; am/is able to (from können)"],
  kannst: ["verb", "can; are able to (you, informal singular; from können)"],
  könnte: ["verb", "could; might be able to (from können)"],
  muss: ["verb", "must; have/has to (from müssen)"],
  musst: ["verb", "must; have to (you, informal singular; from müssen)"],
  will: ["verb", "want/wants to (from wollen; not English future 'will')"],
  willst: ["verb", "want to (you, informal singular; from wollen)"],
  wollte: ["verb", "wanted to (from wollen)"],
  soll: ["verb", "should; am/is supposed to (from sollen)"],
  sollte: ["verb", "should; ought to; was supposed to (from sollen)"],
  möchte: ["verb", "would like (from mögen)"],
  weiß: ["verb", "know/knows (from wissen); white (adjective)"],
  weißt: ["verb", "know (you know; informal singular; from wissen)"],
  wird: ["verb", "becomes; will (he/she/it; from werden)"],
  werde: ["verb", "become; will (I; from werden)"],
  geht: ["verb", "goes; is going; works (from gehen)"],
  gibt: ["verb", "gives; es gibt = there is/are (from geben)"],
  komm: ["verb", "come! (informal singular command; from kommen)"],
  den: ["article", "the (masculine accusative or plural dative)"],
  dem: ["article", "the (masculine/neuter dative)"],
  des: ["article", "the (masculine/neuter genitive)"],
  einen: ["article", "a; an (masculine accusative)"],
  einem: ["article", "a; an (masculine/neuter dative)"],
  eines: ["article", "a; an (masculine/neuter genitive)"],
  einer: ["pronoun", "one; someone; a/an (feminine dative/genitive)"],
  keine: ["determiner", "no; not a; not any (feminine singular or plural)"],
  keinen: ["determiner", "no; not a; not any (masculine accusative or plural dative)"],
  meine: ["determiner", "my (feminine singular or plural)"],
  deine: ["determiner", "your (informal singular possessor; feminine/plural possessed noun)"],
  seine: ["determiner", "his; its (feminine singular or plural possessed noun)"],
  alle: ["determiner", "all; everyone; everybody"],
  sich: ["pronoun", "himself; herself; itself; themselves; each other"],
  es: ["pronoun", "it"],
  er: ["pronoun", "he; it (referring to a masculine noun)"],
  und: ["conjunction", "and"], was: ["pronoun", "what; that which"],
  gut: ["adjective", "good; well (adverb)"],
  hier: ["adverb", "here"], zwei: ["numeral", "two"],
  drei: ["numeral", "three"], eins: ["numeral", "one"]
};
const dictionaryLabels = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb",
  pron: "pronoun", prep: "preposition", conj: "conjunction", article: "article",
  det: "determiner", num: "numeral", intj: "interjection", particle: "particle" };
const badSense = /^(?:\((?:obsolete|archaic|rare)[^)]*\)|(?:first|second|third)(?:[-/](?:first|second|third))?[- ]person|(?:(?:strong|weak|mixed)(?:\/(?:strong|weak|mixed))* )?(?:all-case|feminine|masculine|neuter|plural|singular|nominative|accusative|dative|genitive)\b|imperative (?:singular|plural)|inflection of|alternative (?:letter-case |form |spelling )|obsolete spelling of|misspelling of|misconstruction of|comparative of|superlative of|conjugation of|gerund of|past participle of|present participle of|reflexive pronoun of|forms the |as a copulative|[a-z-]+ form of)/i;
const isUseful = sense => !badSense.test(sense.gloss) &&
  !/^(?:nominali[sz]ation|substantivi[sz]ation) of /i.test(sense.gloss) && !sense.gloss.endsWith(":");
const seen = new Set(), rows = [];
let skipped = 0;
for (const item of source) {
  const word = item.lemma.normalize("NFC").toLocaleLowerCase("de");
  if (seen.has(word) || !/^[a-zäöüß]+(?:-[a-zäöüß]+)*$/i.test(word)) { skipped++; continue; }
  const annotation = annotationMap.get(word);
  const senses = lookup.all(word).filter(s => dictionaryLabels[s.pos]);
  let useful = senses.filter(isUseful), formNote = "";
  const override = core[word];
  if (!override && !useful.length) {
    const candidates = new Map();
    for (const form of inflections.all(word)) {
      if (form.lemma === word) continue;
      const base = lookup.all(form.lemma).filter(s => ["adj", "verb"].includes(s.pos) && isUseful(s));
      for (const pos of new Set(base.map(s => s.pos))) {
        candidates.set(`${form.lemma}|${pos}`, {
          form, senses: base.filter(s => s.pos === pos)
        });
      }
    }
    if (candidates.size === 1) {
      const candidate = [...candidates.values()][0];
      useful = candidate.senses;
      formNote = `Form of ${candidate.form.lemma} (${candidate.form.type.replaceAll(",", ", ")}). English gives the base meaning; tense/person may differ.`;
    }
  }
  if (!override && !useful.length) { skipped++; continue; }
  const preferred = useful.find(s => s.pos === "num") ??
    useful.find(s => posMap[annotation?.pos]?.includes(s.pos)) ?? useful[0];
  const selected = useful.filter(s => s.pos === preferred?.pos).slice(0, 2);
  const english = override?.[1] ?? [...new Set(selected.map(s => s.gloss))].join("; ");
  const category = override?.[0] ?? dictionaryLabels[preferred.pos];
  const article = category === "noun" && /gen:(lex|cefr)/.test(annotation?.notes ?? "")
    ? (["der", "die", "das"].includes(annotation.gender) ? annotation.gender : "") : "";
  if (category === "noun" && !article) { skipped++; continue; }
  const german = category === "noun" ? word[0].toLocaleUpperCase("de") + word.slice(1) : word;
  rows.push({
    rank: rows.length + 1, german, english, part_of_speech: category, article,
    gender: category === "noun" ? ({ der: "masculine", die: "feminine", das: "neuter" }[article]) : "",
    source_rank: Number(item.frequency_rank), frequency_count: Number(item.frequency_count),
    notes: formNote || (category === "noun" ? "Article is the nominative singular; other genders or senses may exist." :
      category === "article" ? "Learn inflected article forms in the Fast track guide." : ""),
    dictionary_url: `https://en.wiktionary.org/wiki/${encodeURIComponent(german)}#German`
  });
  seen.add(word);
  if (rows.length === 5000) break;
}
db.close();
if (rows.length !== 5000) throw new Error(`Only ${rows.length} usable entries; refusing to write incomplete data.`);
mkdirSync(resolve(root, "data"), { recursive: true });
writeFileSync(resolve(root, "data", "german-5000.csv"), encodeCSV(rows, [
  "rank", "german", "english", "part_of_speech", "article", "gender",
  "source_rank", "frequency_count", "notes", "dictionary_url"
]));
const categories = Object.fromEntries([...new Set(rows.map(r => r.part_of_speech))]
  .map(category => [category, rows.filter(r => r.part_of_speech === category).length]));
const manifest = {
  entries: rows.length, method: "First 5000 distinct OpenSubtitles surface words with usable English Wiktionary senses; proper-name-only entries, nonwords, unresolved inflections and nouns without attested articles excluded. Selected common function-word glosses edited. Nouns capitalized. Counts are surface-form counts, not summed lemma counts.",
  frequency_source: "hermitdave/FrequencyWords OpenSubtitles 2018 German de_50k.txt at 072bbed282316a23651aa7068c7173aa7898cf80; wordhoard v0.1.0 grammar annotations",
  translation_source: "Wiktionary via kaikki.org and Lector dict-de-2026-06-25",
  license: "CC-BY-SA-4.0", hashes, categories, skipped_source_rows: skipped,
  last_source_rank: rows.at(-1).source_rank
};
writeFileSync(resolve(root, "data", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
