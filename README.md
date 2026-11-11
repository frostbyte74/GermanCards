# GermanCards

A static, CSV-driven German/English flashcard site for
`frostbyte74/GermanCards` on GitHub Pages. No backend, account, API key, or build
step is required for the website.

## Included

- 5,000 distinct frequency-ranked vocabulary entries with English meanings,
  parts of speech, and sourced noun articles.
- Flip cards, German/English directions, frequency bands, grammar-family and
  noun-article filters, shuffle, and browser speech when a German voice exists.
- Local review scheduling (1, 3, 7, 14 days after successful recalls), repeat
  missed cards, new/due filters, and saved progress.
- A searchable, paginated word library, CSV download, and a four-week study
  routine covering articles, cases, word order, sounds, and essential phrases.
- Desktop/mobile browser tests and GitHub Pages deployment workflow.

## Run locally

Install **Node.js 24 or newer**, then:

```powershell
Set-Location C:\Users\elucht\GermanCards
npm start
```

Open `http://127.0.0.1:4173/GermanCards/`.
No package installation is necessary merely to serve the site.
Do not double-click `index.html`: browsers normally block CSV fetches from
`file:` URLs. Keep `index.html`, `app.js`, `lib.js`, `styles.css`, and `data/`
together. All site assets use relative paths, including on project Pages URLs.

## Publish to GitHub Pages

The local clone's remote is `https://github.com/frostbyte74/GermanCards.git`.
At creation, the authenticated `elucht_microsoft` account had **READ** access;
the user chose to arrange publishing access later. No remote push or live
deployment has been performed.

After authenticating as a user with write access (and repository administration
access to enable Pages):

```powershell
Set-Location C:\Users\elucht\GermanCards
git add .
git commit -m "Create German vocabulary study site"
git branch -M main
git push -u origin main
```

In the repository's **Settings > Pages > Build and deployment**, choose
**GitHub Actions** as the source. If the first deployment failed before Pages
was enabled, rerun **Validate and deploy GermanCards** from the Actions tab.
The workflow runs syntax, data/unit, and desktop/mobile Chromium tests before
deploying only the static website files. Repository Pages availability depends
on the repository visibility and account plan.

The expected address after a successful deployment is
`https://frostbyte74.github.io/GermanCards/`; it is not claimed to be live.

## CSV format and ordering

`data/german-5000.csv` is UTF-8, RFC-4180-style quoted CSV:

| Column | Meaning |
| --- | --- |
| `rank` | 1–5000 within this selected study deck |
| `german` | German spelling; noun capitalization restored |
| `english` | Useful English meaning(s), not necessarily a one-word equivalent |
| `part_of_speech` | One primary grammar family |
| `article`, `gender` | Nominative singular noun article and gender; blank for other POS |
| `source_rank`, `frequency_count` | Original OpenSubtitles surface-word rank and count |
| `notes` | Learning caveats, where relevant |
| `dictionary_url` | Wiktionary headword for further senses and examples |

The default word library groups articles, nouns, verbs, and the remaining parts
of speech, sorting each group by frequency. Flashcards start with the first 100
words. Switch to all 5,000 for the complete selection.

This is the first 5,000 **usable dictionary-matched spellings** from a subtitle
corpus, not a universal ranking or the first 5,000 unfiltered corpus tokens.
Unresolved forms and unsourced noun genders are excluded. Many translations
and POS decisions are automated, so homographs and register require context.
There is no human-teacher review of every entry. See [ATTRIBUTION.md](ATTRIBUTION.md)
and the site's About the words page for methodology and licensing.

## Edit or regenerate vocabulary

To edit, change the CSV while preserving its headers, unique ranks, 5,000 rows,
and supported POS labels (`lib.js`). The browser fetches this file at load time;
there is no duplicated embedded deck. Preserve attribution when adapting it.

To reproduce the supplied CSV, download the **pinned** source artifacts
(approximately 155 MB total) to the ignored `.sources` directory:

```powershell
New-Item -ItemType Directory -Force .sources
Invoke-WebRequest "https://github.com/natema/wordhoard/releases/download/v0.1.0/wordhoard-csv-v0.1.0.zip" -OutFile .sources\wordhoard.zip
Expand-Archive .sources\wordhoard.zip -DestinationPath .sources -Force
Invoke-WebRequest "https://github.com/heuwels/lector/releases/download/dict-de-2026-06-25/dictionary-de.db" -OutFile .sources\dictionary-de.db
Invoke-WebRequest "https://raw.githubusercontent.com/hermitdave/FrequencyWords/072bbed282316a23651aa7068c7173aa7898cf80/content/2018/de/de_50k.txt" -OutFile .sources\de_50k.txt
npm run build:data
```

The generator uses Node's built-in SQLite reader, verifies SHA-256 checksums,
and writes the CSV plus `data/manifest.json`. Explicit source paths can also
be supplied as `node scripts\build-vocabulary.mjs <wordhoard-csv> <dictionary-db> <frequency-txt>`.
Source downloads are not needed to run the site or tests.

## Validate

```powershell
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:e2e
```

Progress stays in this browser, does not sync across devices, and disappears
if site storage is cleared. German speech depends on installed browser/system
voices and may use that platform's speech service.

## Licenses

Application code: MIT (`LICENSE`). Adapted vocabulary: CC BY-SA 4.0
(`ATTRIBUTION.md`, `licenses/`). The reference site's code/content is not copied.
