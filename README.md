# GK Fitness

A home-workout app: animated 3D exercise guidance, a voice coach that talks you
through every rep, and a calendar that tracks what you actually burned.

Runs in the browser on `localhost` for development, and ships to Android as a
native app via Capacitor. Everything is stored on the device — no account, no
server, works offline.

---

## Run it on your laptop

You need [Node.js](https://nodejs.org) 18 or newer. From this folder:

```bash
npm install
npm run dev
```

Then open the URL it prints — normally <http://localhost:5173>.

Open your browser's device toolbar (F12, then Ctrl+Shift+M) and pick a phone
size: the layout is built for a phone and is framed like one on a wide screen.

> **Turn your volume on.** The voice coach is the main feature and browsers only
> allow speech after you tap something, so it starts talking when you press
> **Start workout**.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

---

## What's in it

**Three levels, each with its own emphasis**

| Level | Emphasis | How the week is built |
| --- | --- | --- |
| Beginner | Belly | Calorie-burning circuits plus long core-endurance blocks |
| Intermediate | Chest | Pressing volume leads; core kept as a shorter supporting block |
| Advanced | Abs & chest | High-volume pressing supersetted with high-tension ab work |

**Two ways to run the week** (Settings → Weekly programme)

- **Focus** — the level emphasis above.
- **Body split** — one body part per day, arranged so each major muscle group is
  trained about twice a week.

**Plus**

- 63 exercises, each with its own animation, form cues, common mistakes and
  progression suggestions
- A rigged 3D anatomical model that poses with the exercise and lights the
  worked muscles in red — drag it to rotate. 22 muscle groups, front and back,
  on a skeleton built to standard anthropometric proportions
- Voice coach: announces each exercise, counts the last three seconds out loud,
  gives a form cue mid-set and an improvement tip during rest
- Target a single body part (chest, abs, back, shoulders, arms, legs, glutes…)
- Quick sessions of 7, 15 or 20 minutes
- Custom workout builder
- Calendar shaded by calories burned, streaks, personal records, achievements
- Adaptive difficulty: rate three sessions the same way and it suggests moving
  up or down a level
- Light and dark themes, screen wake-lock, JSON export/import of all your data

---

## How calories are estimated

Each exercise carries a MET value (metabolic equivalent). The estimate is the
standard formula:

```
kcal/min = MET × 3.5 × bodyweight(kg) / 200
```

Rest intervals are counted at 1.5 MET. This is why the app asks for your weight
in onboarding and why keeping it current matters. These are **estimates, not
measurements** — useful for tracking trends, not for medical or dietary
decisions.

### A note on "belly focus"

Targeted belly-fat loss is largely a myth, with one caveat. A 2023 randomised
trial found that abdominal endurance work produced a modest *localised* trunk-fat
advantage over matched cardio — but the between-group difference was about 3%,
from a study of 16 men with uncontrolled diet. The reliable drivers of waistline
fat are total energy expenditure and diet.

So the beginner week is built as **calorie-burning circuits plus long core
blocks**, not crunches alone. Core work builds the muscle; the fat over it comes
off through total burn and what you eat.

---

## Ship it to Android

`GK-Fitness.apk` in this folder is the installable app. It's built without
Android Studio; see `android/README.md`.

```bash
npm run build:apk     # rebuilds GK-Fitness.apk (needs Python 3 + pillow + cryptography)
```

In VS Code the same command is available from **Terminal → Run Task → GK: Build APK**.

## Download site (GitHub Pages)

Every push to `main` runs `.github/workflows/deploy-pages.yml`, which publishes:

| URL | What |
| --- | --- |
| `https://<user>.github.io/<repo>/` | download page (`site/`) with the **Download APK** button |
| `https://<user>.github.io/<repo>/app/` | the web app |
| `https://<user>.github.io/<repo>/GK-Fitness.apk` | the APK itself |

To release a new version: bump `VERSION_CODE`/`VERSION_NAME` in
`android/build_apk.py`, run **GK: Build APK**, then commit and push.
The site updates in about a minute.

`android/signing/` (the release key) is git-ignored on purpose. Keep it
backed up, because every update must be signed with it.

### Or just install it from the browser

The app is a PWA. Open the dev or production URL on your phone and choose **Add
to Home Screen** — it installs with an icon, runs full-screen and works offline.
No Android Studio needed.

---

## Project layout

```
site/             download page published to GitHub Pages
android/          APK builder (no Android SDK needed)
src/
  anim/
    types.ts      pose + segment definitions
    poses.ts      keyframes for all 63 exercise animations
    sampler.ts    keyframe interpolation and forward kinematics
    AnatomyModel.tsx  rigged GLB model, bones driven from the pose data
    Model3D.tsx   procedural fallback model (used if the GLB fails to load)
    face.ts       head palette and proportions
    Body.tsx      the 3D model (procedural fallback if WebGL model fails)
  data/
    exercises.ts  the exercise library (MET, cues, mistakes, tips)
    plans.ts      weekly programmes: focus + body split
    achievements.ts
  lib/
    calories.ts   MET-based calorie maths
    parts.ts      muscle-region mapping (drives the red highlighting)
    session.ts    turns a plan into runnable steps; quick + focus generators
    stats.ts      aggregation, streaks, adaptive difficulty
    voice.ts      speech, beeps, haptics, wake lock
  screens/        onboarding, home, preview, player, summary, calendar,
                  stats, library, builder, settings
  state/store.tsx persistence (localStorage)
```

### The animation system

Exercises aren't videos or GIFs — every one is a set of joint angles. A pose is
14 numbers (torso, head, two arms, two legs), animations are keyframes over
those numbers, and both renderers read the same data: the 2D figure draws line
segments, and the 3D model places sculpted limb and muscle meshes along the same
skeleton. Adding an exercise means adding keyframes to `poses.ts` and an entry
to `exercises.ts` — no art assets.

The 3D model is generated in Blender by the scripts in `tools/model/` — muscle
masses are fused into a sculpt, retopologised to ~6.5k quads, normal-mapped, and
rigged to a 22-bone humanoid skeleton. Nothing is downloaded and no third-party
asset is used, so it carries no licence obligations. See `tools/model/README.md`
to regenerate it or to swap in a different rigged GLB.

---

## Health note

This app gives general fitness guidance, not medical advice. If you have an
injury, a heart condition, are pregnant, or have been inactive for a long time,
talk to a doctor before starting. Stop if something hurts in a way that
isn't ordinary muscular effort.
