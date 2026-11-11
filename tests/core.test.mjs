import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATEGORIES, parseCSV, encodeCSV, loadVocabulary, filterWords, rateWord, shuffled } from "../lib.js";

const words = loadVocabulary(readFileSync(new URL("../data/german-5000.csv", import.meta.url), "utf8"));
test("CSV preserves Unicode, quoted commas, quotes, line breaks and BOM", () => {
  const rows = [{ german: "schön", english: 'beautiful, "lovely"\nand nice' }];
  assert.deepEqual(parseCSV("\uFEFF" + encodeCSV(rows, ["german", "english"])), rows);
  assert.throws(() => parseCSV('german,english\n"unclosed,test'), /Unclosed/);
  assert.throws(() => parseCSV("a,b\n1,2,3"), /columns/);
});
test("dataset has exactly 5000 unique, frequency-ordered entries and every requested grammar family", () => {
  assert.equal(words.length, 5000);
  assert.equal(new Set(words.map(w => w.german.toLocaleLowerCase("de"))).size, 5000);
  assert.deepEqual(words.map(w => w.rank), Array.from({ length: 5000 }, (_, i) => i + 1));
  assert.deepEqual(new Set(words.map(w => w.part_of_speech)), new Set(CATEGORIES));
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    assert.ok(word.english.trim(), word.german);
    assert.match(word.dictionary_url, /^https:\/\/en\.wiktionary\.org\/wiki\//);
    if (i) {
      assert.ok(word.source_rank > words[i - 1].source_rank);
      assert.ok(word.frequency_count <= words[i - 1].frequency_count);
    }
    if (word.part_of_speech === "noun") {
      assert.ok(["der", "die", "das"].includes(word.article), word.german);
      assert.equal(word.german[0], word.german[0].toLocaleUpperCase("de"));
      assert.equal(word.gender, { der: "masculine", die: "feminine", das: "neuter" }[word.article]);
    } else assert.equal(word.article, "");
    assert.doesNotMatch(word.english, /^(first|second|third)[-/ ]person|^inflection of|^alternative letter-case/i);
    assert.doesNotMatch(word.english, /^(?:(?:strong|weak|mixed)(?:\/(?:strong|weak|mixed))* (?:all-case|nominative|accusative|dative|genitive)|imperative (?:singular|plural))/i);
  }
});
test("core learning entries use meanings, not grammatical parse placeholders", () => {
  for (const [german, meaning, category] of [
    ["ist", /\bis\b/, "verb"], ["bin", /\bam\b/, "verb"],
    ["die", /\bthe\b/, "article"], ["das", /\bthe\b/, "article"],
    ["zwei", /\btwo\b/, "numeral"], ["drei", /\bthree\b/, "numeral"],
    ["Mann", /\bman\b/, "noun"], ["soll", /\bshould\b/, "verb"],
    ["danke", /\bthank you\b/, "interjection"]
  ]) {
    const word = words.find(w => w.german === german);
    assert.ok(word, german); assert.match(word.english, meaning); assert.equal(word.part_of_speech, category);
  }
  for (const [noun, article] of [["Mann", "der"], ["Frau", "die"], ["Kind", "das"], ["Haus", "das"]]) {
    assert.equal(words.find(w => w.german === noun)?.article, article);
  }
  for (const [form, base, meaning] of [["gute", "gut", /good/], ["kommt", "kommen", /come/]]) {
    const word = words.find(w => w.german === form);
    assert.ok(word, form);
    assert.match(word.english, meaning);
    assert.ok(word.notes.startsWith(`Form of ${base} (`));
  }
});
test("filters combine category, article, frequency and accent-insensitive search", () => {
  const nouns = filterWords(words, { category: "noun", gender: "die", limit: 500 });
  assert.ok(nouns.length);
  assert.ok(nouns.every(w => w.article === "die" && w.rank <= 500));
  const synthetic = [{ rank: 1, german: "schön", english: "beautiful", part_of_speech: "adjective" },
    { rank: 2, german: "Straße", english: "street", part_of_speech: "noun", article: "die" }];
  assert.equal(filterWords(synthetic, { query: "schon" })[0].german, "schön");
  assert.equal(filterWords(synthetic, { query: "strasse" })[0].german, "Straße");
  assert.equal(filterWords(synthetic, { query: "not-in-the-deck" }).length, 0);
});
test("review scheduling persists streaks and resets a failed recall", () => {
  const now = 1000000000;
  const first = rateWord(undefined, true, now);
  assert.equal(first.due, now + 86400000);
  const second = rateWord(first, true, now);
  assert.equal(second.streak, 2); assert.equal(second.due, now + 3 * 86400000);
  const third = rateWord(second, true, now);
  assert.equal(third.streak, 3); assert.equal(third.due, now + 7 * 86400000);
  const missed = rateWord(third, false, now);
  assert.equal(missed.streak, 0); assert.equal(missed.due, now + 600000); assert.equal(missed.reviews, 4);
  const progress = { 1: { due: now - 1 }, 2: { due: now + 1 } };
  assert.deepEqual(filterWords(words.slice(0, 3), { mode: "due" }, progress, now).map(w => w.rank), [1]);
  assert.deepEqual(filterWords(words.slice(0, 3), { mode: "new" }, progress, now).map(w => w.rank), [3]);
});
test("shuffle changes order without losing cards or mutating the source", () => {
  const original = [1, 2, 3, 4], result = shuffled(original, () => 0);
  assert.deepEqual(original, [1, 2, 3, 4]); assert.notDeepEqual(result, original);
  assert.deepEqual([...result].sort(), original);
});
