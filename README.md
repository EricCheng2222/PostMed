# PostMed Notebook

A study notebook for the **Kaohsiung Medical University post-baccalaureate medicine entrance exam
(informatics track)**. Live at <https://postmed-notebook.fly.dev/>.

The premise: every topic gets the representation that actually explains it, rather than another bullet
list. Energy questions become an interactive ruler, classification questions become a spectrum, motion
becomes a graph whose slope and area you can read off. Every section opens with its **definition and
formula**, and every note ends with **10 self-marking questions** with full explanations.

## Contents

Subjects are split onto their own shelves. The home page is a subject directory.

| Subject | Shelf | Notes | Questions |
|---------|-------|-------|-----------|
| Physics | [pages/physics.html](pages/physics.html) | 15 · complete | 150 |
| Biochemistry | [pages/biochemistry.html](pages/biochemistry.html) | 1 · in progress | 10 |

### Physics — a full freshman course in fifteen notes

| # | Note | Primary representation |
|---|------|------------------------|
| 01 | [Kinematics: motion in one and two dimensions](pages/physics-01-kinematics.html) | Motion graphs & vector decomposition |
| 02 | [Newton's laws, forces and friction](pages/physics-02-newton-dynamics.html) | Free-body diagrams |
| 03 | [Work, energy and power](pages/physics-03-work-energy.html) | Energy bar charts |
| 04 | [Momentum, impulse and collisions](pages/physics-04-momentum.html) | Before / after ledgers |
| 05 | [Rotational motion and static equilibrium](pages/physics-05-rotation.html) | Linear ↔ rotational dictionary |
| 06 | [Gravitation and orbital motion](pages/physics-06-gravitation.html) | Orbit energy diagram |
| 07 | [Oscillations and simple harmonic motion](pages/physics-07-oscillations.html) | Phase & energy exchange |
| 08 | [Waves and sound](pages/physics-08-waves-sound.html) | Harmonic series & interference |
| 09 | [Fluid statics and dynamics](pages/physics-09-fluids.html) | Flow & pressure profiles |
| 10 | [Thermal physics and thermodynamics](pages/physics-10-thermal.html) | PV diagrams & energy ledgers |
| 11 | [Electric charge, field and potential](pages/physics-11-electrostatics.html) | Field lines & equipotentials |
| 12 | [Direct-current circuits](pages/physics-12-circuits.html) | Circuit reduction & loop tracing |
| 13 | [Magnetism and electromagnetic induction](pages/physics-13-magnetism.html) | Right-hand rules, drawn out |
| 14 | [Geometric and wave optics](pages/physics-14-optics.html) | Ray diagrams & sign tables |
| 15 | [Modern physics: quanta, atoms and nuclei](pages/physics-15-modern.html) | Energy-level diagrams & exponential laws |

Physics is written with the medical candidate in mind: Poiseuille's law and vascular resistance,
Laplace's law and pulmonary surfactant, the corrective-lens calculation for myopia and hyperopia,
half-life and technetium-99m.

### Biochemistry

| # | Note | Primary representation |
|---|------|------------------------|
| 01 | [Bonds, functional groups & the hydrophobic effect](pages/biochem-01-bonds-lipids.html) | Interactive energy ruler · polarity spectrum · thermodynamic decomposition bars |

Planned: amino acids & protein structure (decision tree), enzyme kinetics (parameter simulator),
glycolysis/TCA (pathway map), plus chemistry, physiology and the informatics-track subjects.

## Running it locally

The site is fully static — no build step, no dependencies, no network calls. Open `index.html`
directly, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Structure

```
index.html                          subject directory (home)
pages/physics.html                  physics shelf — 15 notes, grouped into five parts
pages/biochemistry.html             biochemistry shelf
pages/physics-NN-*.html             the 15 physics notes
pages/biochem-01-bonds-lipids.html  biochem note 01 (page-specific CSS + JS inline)
assets/css/site.css                 shared design tokens, components, light/dark theme
assets/js/site.js                   theme toggle + reusable quiz engine
deploy/nginx.conf                   server config used by the container
Dockerfile, fly.toml                fly.io deployment
```

### Writing a new note

Write one HTML file in `pages/`, link `../assets/css/site.css` and `../assets/js/site.js`, and drop the
question bank into a `<script type="application/json" id="quiz-data">` block as an array of
`{stem, options, answer, explain}` (`answer` is a 0-based index). The quiz engine picks it up from any
element carrying `data-quiz`; a page may carry more than one bank by pointing `data-quiz-src` at
another script's id.

Shared components live in `site.css` — use them rather than reinventing:

- `.defbox` + `.defbox__label` — the definition & formula panel that opens every section
- `.fx` / `.fx--hero` / `.fx-grid` / `.fi` — block and inline formulas
- `.symtab` — symbol key with SI units
- `.wex` + `.wex__ans` — worked example with a boxed answer
- `.fsheet` — the page-top formula sheet
- `.figure` — inline SVG with a caption
- `.callout`, `.callout--warn`, `.callout--exam`, `.mnemo` — notes, traps, exam points
- `.table-scroll` > `table.data` — tables that scroll rather than overflow on mobile
- `.entry`, `.stack`, `.subject`, `.pager` — shelf and navigation components

Set `data-subject` on `<body>` to re-tint a page for its subject (`physics` → indigo; omit for the
default teal). SVG fills and strokes must use the CSS custom properties (`--v-force`, `--v-vel`,
`--v-accel`, `--v-energy`, `--v-field`, `--v-heat`, `--ink`, `--line`) — hard-coded colours break dark
mode.

## Deploying to fly.io

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

- `primary_region = "nrt"` — Tokyo, the closest **active** Fly region to Taiwan. Hong Kong (`hkg`) was
  the original choice but Fly has deprecated it and will not provision new resources there.
- `app = "postmed-notebook"` — app names are globally unique on Fly, so if that one is taken, change it
  here or pass `--name` to `fly launch`.
- `auto_stop_machines` with `min_machines_running = 0` — the machines scale to zero when idle and
  cold-start on request, which keeps a static site effectively free. Fly still creates two machines for
  high availability; both stop when idle.
- nginx listens on **8080** (not 80) so the container can run unprivileged; `/healthz` backs the Fly
  health check.
