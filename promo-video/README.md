# Verkefnastjórnun — promo film

A ~24 s product film of this repo's CRM, built with [Remotion](https://www.remotion.dev/) using the
[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) shot library. See `DESIGN.md` for the brief,
visual tokens, shot mapping and storyboard.

- `final/promo.mp4` — with music · `final/promo-nobgm.mp4` — sound effects only
- `src/shots/*` — one component per shot (adapted from the skill's tuned demos), `src/timeline.ts` — shot timing,
  `src/sfx.ts` — sound-effect cue table, `src/brand.ts` — colours/fonts taken from the app
- `capture/` — re-captures the app's real pages with **fictional** data (no Supabase access needed)
- `public/audio/sfx/FREESOUND-CREDITS.md` — SFX sources (all CC0). BGM: "House Vibez" by Lily J (Mixkit free license) — not committed; copy `assets/audio/bgm/house-vibez.mp3` from the video-shotcraft repo to `public/audio/bgm/` before rendering

```bash
npm install
npx remotion studio src/index.ts          # preview / tweak
./scripts/build-final.sh                  # picture + sample-exact audio mix (-16 LUFS) → final/promo.mp4, final/promo-nobgm.mp4
```

Re-capturing (app dev server must run against the fake backend):

```bash
VITE_SUPABASE_URL=http://mock-supabase.invalid VITE_SUPABASE_PUBLISHABLE_KEY=demo npx vite --host 127.0.0.1 --port 8080   # from the repo root
cd promo-video/capture && node capture.mjs
```
