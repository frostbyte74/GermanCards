# Vocabulary attribution

`data/german-5000.csv` is an adapted dataset released under **Creative Commons
Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**.
The application code is separately MIT-licensed. No code or study content from
the reference AB-731 site is copied.

## Sources

| Contribution | Source and contributors | License |
| --- | --- | --- |
| Surface-word frequencies | OpenSubtitles 2018, via Hermit Dave's [FrequencyWords](https://github.com/hermitdave/FrequencyWords), `content/2018/de/de_50k.txt`, commit `072bbed282316a23651aa7068c7173aa7898cf80` | MIT |
| Primary POS hints and noun articles | [natema/wordhoard](https://github.com/natema/wordhoard), v0.1.0 German CSV | CC BY-SA 4.0 |
| English dictionary senses | Wiktionary contributors, extracted via [kaikki.org](https://kaikki.org) and [wiktextract](https://github.com/tatuylonen/wiktextract) by Tatu Ylönen; packaged by [heuwels/lector](https://github.com/heuwels/lector/releases/tag/dict-de-2026-06-25) as `dictionary-de.db` | CC BY-SA 4.0 (Wiktionary dictionary data, not Lector's application code) |

wordhoard's annotations derive from spaCy (MIT), Wiktionary contributors,
[gambolputty/german-nouns](https://github.com/gambolputty/german-nouns) (CC BY-SA 4.0),
kaikki.org and wiktextract. Its original attribution notice is preserved in
`licenses/wordhoard-NOTICE.md`. FrequencyWords' MIT notice and the full CC BY-SA
license are also included in `licenses/`.

Each CSV row links to its Wiktionary headword and contributor history is
available from that page's History tab. Source checksums are recorded in
`data/manifest.json` and enforced by the generator.

## Changes and selection

GermanCards matches the original descending OpenSubtitles surface-frequency
list to English Wiktionary dictionary senses. It excludes nonword tokens,
proper-name-only entries, unresolved grammatical parses, and nouns without a
wordhoard lexicon/anchor article. It retains the first **5,000 distinct usable
spellings**. Some common inflected function words are explicitly explained for
learning. Counts are for surface forms, **not aggregated lemma frequencies**.

Selected common function-word glosses and categories are edited to give useful
translations instead of bare inflection descriptions. Nouns are capitalized,
one primary POS and up to two dictionary senses are chosen, dictionary URLs are
added, and source rank/count are retained. The CSV's study rank is consecutive;
its original source rank can contain gaps.

Otherwise grammar-only adjective and verb forms are matched to base words
using the dictionary's inflection table when that mapping has exactly one
usable base-word/POS candidate. Their English field gives the base meaning,
not a tense-specific translation; `notes` identifies the base and morphology.
Unresolvable or ambiguous mappings are excluded rather than guessed.

This is a frequency-ranked study selection, **not a universal top-5,000 list or
a teacher-verified lexicon**. Movie dialogue has register and topic biases.
Lowercased corpus forms and dictionary homographs may be ambiguous. A primary
POS or article does not cover every meaning. Noun articles are nominative
singular; learn other cases and plurals separately.

## Redistributing adaptations

Credit GermanCards and the upstream contributors, link the CC BY-SA 4.0 license,
indicate your changes, and license adapted data under CC BY-SA 4.0. No upstream
contributor endorses this site.

## Implementation inspiration

The single-page study-space concept was requested with reference to
[Kardel Rüveyda Çetin's AB-731 study notes](https://github.com/KardelRuveyda/ab-731-study-notes).
All GermanCards layout code and German study content were written independently.
