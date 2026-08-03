# PostMed Notebook

A study notebook for the **Kaohsiung Medical University post-baccalaureate medicine entrance exam
(informatics track)**.

The premise: every topic gets the representation that actually explains it, rather than another bullet
list. Energy questions become an interactive ruler, classification questions become a spectrum, kinetics
becomes a curve you can drag. Each page ends with 5–10 self-marking questions with full explanations.

## Contents

| # | Note | Primary representation | Questions |
|---|------|------------------------|-----------|
| 01 | [Bonds, functional groups & the hydrophobic effect](pages/biochem-01-bonds-lipids.html) | Interactive energy ruler · polarity spectrum · thermodynamic decomposition bars · data-viz | 10 |

Planned: amino acids & protein structure (decision tree), enzyme kinetics (parameter simulator),
glycolysis/TCA (pathway map), plus physiology, organic chemistry and the informatics-track subjects.

## Running it locally

The site is fully static — no build step, no dependencies, no network calls. Open `index.html`
directly, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Structure

```
index.html                          notebook home / contents
pages/biochem-01-bonds-lipids.html  note 01 (page-specific CSS + JS inline)
assets/css/site.css                 shared design tokens, layout, light/dark theme
assets/js/site.js                   theme toggle + reusable quiz engine
deploy/nginx.conf                   server config used by the container
Dockerfile, fly.toml                fly.io deployment
```

Adding a page means writing one HTML file, linking `assets/css/site.css` and `assets/js/site.js`, and
dropping the question bank into a `<script type="application/json" id="quiz-data">` block as an array of
`{stem, options, answer, explain}` (`answer` is a 0-based index). The quiz engine picks it up
automatically from any element carrying `data-quiz`.

## Deploying to fly.io

The repository is ready to deploy; it just needs to be run from a machine that can reach `fly.io`.

```bash
# once
curl -L https://fly.io/install.sh | sh
fly auth login

# first deploy — reuses the fly.toml in this repo
fly launch --copy-config --now

# every deploy after that
fly deploy
```

Notes on the configuration in `fly.toml`:

- `primary_region = "hkg"` — Hong Kong is the closest Fly region to Taiwan. Change it if you prefer
  `nrt` (Tokyo).
- `app = "postmed-notebook"` — app names are globally unique on Fly, so if that one is taken, change it
  here or pass `--name` to `fly launch`.
- `auto_stop_machines` with `min_machines_running = 0` — the machine scales to zero when idle and
  cold-starts on request, which keeps a static site effectively free.
- nginx listens on **8080** (not 80) so the container can run unprivileged; `/healthz` backs the Fly
  health check.
