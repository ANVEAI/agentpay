# AgentPay launch video

Frame-accurate Product Hunt launch reel — **Remotion** (React → real MP4) + **ElevenLabs** audio.
A 60s 16:9 master, plus 9:16 social and 15s teaser cuts. Standalone subproject (its own
`pnpm-workspace.yaml` isolates it from the monorepo).

## One-time
```bash
pnpm install        # pulls Remotion + a cached Chromium build
```

## Audio (needs your ElevenLabs key)
```bash
cp .env.example .env        # add ELEVENLABS_API_KEY (+ optional ELEVENLABS_VOICE_ID)
pnpm audio                  # VO + SFX + music → public/audio/, writes src/audio-manifest.json
```
The key is read only here; it's never committed (`.env` is gitignored). If `/v1/music` isn't on
your plan, the script falls back to `public/audio/fallback-music.mp3`.

## Render
```bash
pnpm render          # out/agentpay-launch.mp4      (1920x1080 master)
pnpm render:social   # out/agentpay-launch-9x16.mp4 (1080x1920)
pnpm render:teaser   # out/agentpay-teaser-15s.mp4  (15s)
pnpm studio          # interactive: scrub the timeline + audio tracks
```

## How it works
- **`src/timeline.ts`** — single source of truth: FPS, per-scene start/duration frames, and every
  audio cue frame. Visuals and audio key off the same numbers, so they can't drift.
- **`src/scenes/`** — the 9 beats, ported frame-accurately from the brand reel
  (`apps/dashboard/public/launch-video.html`): hook (live USDC) → problem → solution → one line →
  spend policy → 402/pay/200 → value props → statement → CTA.
- **`src/audio/AudioLayer.tsx`** — music (ducked under the voiceover) + per-beat VO + SFX, each
  placed at its `timeline.ts` frame (the success chime lands on the lit `200 OK`).
- **`scripts/generate-audio.mjs`** — ElevenLabs TTS + sound effects + music; measures each clip and
  writes the manifest.

`node_modules/`, `out/`, `.env`, and generated `public/audio/*.mp3` are gitignored.
