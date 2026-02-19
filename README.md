# Political Attitudes Map (Persian, RTL)

A lightweight client-side political questionnaire that maps responses across:

- Economy axis (`-100` to `+100`)
- Freedom/Authority axis (`-100` to `+100`)
- Democratic norms score (`0` to `100`)

The app is fully static and runs in the browser. No backend is required.

## Features

- Persian (`fa`) and RTL interface
- 5-point Likert questionnaire
- Session-based question order
- Progress tracking and skip support
- Local scoring and result visualization (SVG map)
- Quality/confidence signals (attention, speed, consistency, etc.)
- Session-only local persistence via `sessionStorage`

## Project Structure

- `index.html` - Main page/UI
- `index.en.html` - English UI (Persian remains default)
- `app.js` - App logic, scoring, navigation, quality checks
- `styles.css` - External stylesheet
- `questions.fa.json` - Question bank and scoring weights
- `questions.en.json` - English question bank and scoring weights

## Requirements

You only need:

- A modern browser (Chrome, Firefox, Edge, Safari)
- A local static HTTP server

Important: do **not** open `index.html` directly with `file://...`, because `app.js` fetches `questions.fa.json` and most browsers block that in local file mode.

## Run Locally

### Option 1: Python (recommended)

If Python is installed:

```bash
python3 -m http.server 8080
```

Then open:

`http://localhost:8080`

Default page is Persian:

`http://localhost:8080/index.html`

English page:

`http://localhost:8080/index.en.html`

On some systems use:

```bash
python -m http.server 8080
```

### Option 2: Node.js serve

If Node.js is installed:

```bash
npx serve .
```

Then open the URL shown in terminal (usually `http://localhost:3000`).

## Run on Another System (Quick Steps)

1. Copy or clone the project folder.
2. Make sure these files exist together in the same directory:

- `index.html`
- `app.js`
- `styles.css`
- `questions.fa.json`

1. Start a local HTTP server (examples above).
2. Open the local URL in a browser.

## Deploy to GitHub Pages

This project is static, so GitHub Pages works out of the box.

1. Push files to a GitHub repository.
2. In GitHub repo: `Settings` -> `Pages`
3. Set:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`

1. Save and wait 1-3 minutes.
2. Site URL:

- `https://<username>.github.io/<repo-name>/`

Optional:

```bash
touch .nojekyll
```

and commit it to avoid Jekyll processing.

## Notes

- Data is processed in-browser.
- Answers are stored in `sessionStorage` for the current browser session.
- This is an indicative tool, not a diagnostic or scientific classification.
