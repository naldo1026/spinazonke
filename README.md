# Spinazonke

A Premier League–flavoured wheel of consequences for three flatmates who play FPL. Every game week the loser spins the wheel. Every fifth loss, an embarrassing photo comes out.

It's a single-page React + TypeScript app (Vite) with no backend. Everything is stored in the browser's `localStorage`.

## Run it locally

Needs Node 20.19+ (or 22.12+).

```bash
npm install
npm run dev
```

Then open http://localhost:5173/spinazonke/. The dev server also listens on your network, so you can open the "Network" URL it prints on your phone, as long as it's on the same wifi.

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | Unit tests (wheel maths, randomness, store, import validation) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run photos` | Rebuild the photo manifest (runs automatically before dev/build/test) |

## How a game week works

1. **Who lost?** Pick the loser. The loss is saved straight away and a heart breaks.
2. **Pay to play.** The wheel stays locked until at least one new consequence is added to the bank. Unlocking starts the dramatic music.
3. **Do you want to play a game?** This is optional. The loser calls heads or tails. If they win, they strike 3 consequences off this week's wheel. If they lose, the other two strike 3 off. Struck consequences go back to the bank, off the wheel. They're never deleted.
4. **Spin.** Clown music plays while it spins. The result is decided the moment you press SPIN, so refreshing can't re-roll it.
5. **Elimination** (every 5th loss only). The VAR check plays, then the red card, then the photo.
6. **Summary**, then back home.

If you refresh mid-ritual it picks up where you left off. Cancelling after step 1 asks whether to keep or undo the loss.

GW1–7 are seeded as Ronaldo 1, Kyle 2, Keanan 4. The real order wasn't known, so check them in **History** and fix any that are wrong.

## Adding photos

Put images in `public/photos/<player>/`:

```
public/photos/ronaldo/
public/photos/kyle/
public/photos/keanan/
```

`.jpg`, `.png`, `.webp`, `.gif` and `.avif` all work, and file names don't matter. `scripts/gen-photos.mjs` scans the folders and writes `src/data/photos.ts`. That runs automatically when you start `npm run dev`, so restart it (or run `npm run photos`) after adding files.

Each player gets their own shuffled pool. A reveal always uses a photo that hasn't been shown yet, and only starts repeating once every photo has been used. If someone is eliminated before they have any photos, the reveal shows "Photo owed" and a **Reveal** button waits on the home screen until photos are added.

## Adding music

See [`public/audio/README.md`](public/audio/README.md). You need `dramatic.mp3` and `clown.mp3`, plus optional SFX. Missing files are skipped silently. Mute and volume are in the header and in Settings.

## Lottie animations

Every animation has a built-in CSS/SVG version. To use a Lottie animation instead, drop a JSON file into `src/assets/lottie/` with the slot's name (`padlock.json`, `coin.json`, `var.json`, and so on). See [`src/assets/lottie/README.md`](src/assets/lottie/README.md).

## Backup and restore

Data lives in this browser only (key `spinazonke:v1`). Clearing site data, or using a different phone or browser, means starting from scratch.

- **Settings → Export JSON** downloads `spinazonke-backup-YYYY-MM-DD.json`. Do this every few weeks.
- **Settings → Import JSON** checks the file and asks before overwriting anything.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. In the repo settings, Pages has to be set to **Source: GitHub Actions**.

The site is served from `/<repo-name>/`. The workflow sets that automatically. Locally, `vite.config.ts` defaults to `/spinazonke/`. If you rename the repo, set `BASE_PATH=/new-name/` for local builds.

## ⚠️ Privacy

This is a public repo on a public GitHub Pages site. Photos are only "hidden" in the app's UI. Anyone who finds the repo, or guesses a URL like `/spinazonke/photos/keanan/01.jpg`, can see every photo, including ones that haven't been revealed yet. Only add photos that everyone in them is fine with being public.

If that's a problem, the options are:
- make the repo private and deploy somewhere that supports private sites
- give the files random names, which makes guessing harder but doesn't hide them from anyone browsing the repo

## ⚠️ Branding

The Premier League name, lion logo and club crests are trademarks. This app only borrows the colour palette and the broadcast look (score bugs, lower thirds, VAR screens). The crest and every other graphic are original. Keep it that way.
