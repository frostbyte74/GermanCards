# NOTICE — licensing & attribution

wordhoard is **dual-licensed**:

| Part | Covers | License |
|---|---|---|
| **Code** | everything under `src/`, `scripts/`, `tests/`, build config | **MIT** — see [`LICENSE-CODE`](LICENSE-CODE) |
| **Dataset** | the built dictionary and any exported artifacts (SQLite / CSV / Parquet, `samples/`) | **CC-BY-SA-4.0** — see [`LICENSE`](LICENSE) |

The dataset is share-alike because its noun gender + inflection layer is derived
from **Wiktionary**, which is CC-BY-SA-4.0. That license is viral, so the
combined dataset must carry it. The code contains no Wiktionary data and is
therefore offered under the permissive MIT license — you may reuse the pipeline
to build your own dataset under whatever terms your sources allow.

## Attribution required when redistributing the dataset

Under CC-BY-SA-4.0 you must credit:

- **Wiktionary** contributors (the gender/inflection source):
  - German: via [`gambolputty/german-nouns`](https://github.com/gambolputty/german-nouns) (CC-BY-SA-4.0)
  - French/Spanish/Italian/English: via [kaikki.org](https://kaikki.org) /
    [wiktextract](https://github.com/tatuylonen/wiktextract) by Tatu Ylönen (CC-BY-SA-4.0)
- **OpenSubtitles** frequency lists, via
  [`hermitdave/FrequencyWords`](https://github.com/hermitdave/FrequencyWords) (MIT)
- **spaCy** (https://spacy.io) — lemmatisation & POS models (MIT)

and preserve this notice and the CC-BY-SA-4.0 license on any derivative dataset.

## Not included in the output

The **Goethe-Institut** A1–B1 wordlists (© Goethe-Institut) are used **only** to
calibrate the German frequency→CEFR mapping. No Goethe content is stored in or
redistributed with the dataset; the raw lists live under `data/raw/` which is
gitignored and never shipped.
