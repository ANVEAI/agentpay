// Generates the launch-video audio via ElevenLabs (voiceover + sound effects + music),
// measures each clip's duration, and writes src/audio-manifest.json so Remotion can place
// every cue frame-accurately.
//
//   1. put your key in video/.env:  ELEVENLABS_API_KEY=...   (optional ELEVENLABS_VOICE_ID=...)
//   2. node --env-file=.env scripts/generate-audio.mjs        (or: pnpm audio)
//
// Music uses /v1/music (paid plan). If it fails, the script logs loudly and falls back to a
// committed public/audio/fallback-music.mp3 if present, else no music — the render still works.
import { writeFile, mkdir, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "audio");
const FPS = 30;

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("\n✕ ELEVENLABS_API_KEY is not set.");
  console.error("  Add it to video/.env, then run:  node --env-file=.env scripts/generate-audio.mjs\n");
  process.exit(1);
}
const VOICE = process.env.ELEVENLABS_VOICE_ID || "nPczCjzI2devNBz1zQrb"; // Brian — confident male narrator
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";

async function el(pathname, body, query = "") {
  const res = await fetch(`https://api.elevenlabs.io${pathname}${query}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`${pathname} → ${res.status} ${res.statusText}`), { status: res.status, text });
  }
  return Buffer.from(await res.arrayBuffer());
}
async function save(name, buf) {
  await writeFile(path.join(OUT, name), buf);
  const secs = durationOf(name);
  console.log(`  ✓ ${name}  ${(buf.length / 1024) | 0}KB  ${secs.toFixed(2)}s`);
  return secs;
}
function durationOf(name) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${path.join(OUT, name)}"`,
    ).toString();
    return parseFloat(out.trim()) || 0;
  } catch {
    return 0;
  }
}
const frames = (secs) => Math.round(secs * FPS);

// --- voiceover script, per beat (placement frames mirror src/timeline.ts) ---
const VO = [
  { file: "vo-01-problem.mp3", fromF: 90, text: "Your AI agents are ready to buy — APIs, data, compute. But every payment hits a wall: manual reviews, shared cards, and you're on the hook for the bill." },
  { file: "vo-02-solution.mp3", fromF: 300, text: "Meet AgentPay — the drop-in payment rail for AI agents." },
  { file: "vo-03-howA.mp3", fromF: 450, text: "Gate any route in one line of code. An unpaid request gets a 402; the agent pays in USDC and retries." },
  { file: "vo-04-howB.mp3", fromF: 750, text: "You stay in control. Set allowed vendors, per-intent caps, and a daily budget — your policy, enforced on every call." },
  { file: "vo-05-flow.mp3", fromF: 1050, text: "402, pay, 200 — non-custodial, over the open x402 standard, gasless on Base. The money lands straight in your wallet." },
  { file: "vo-06-cta.mp3", fromF: 1650, text: "AgentPay. Stripe for AI agents — open source. Star it on GitHub, and start charging your agents today." },
];
const SFX = [
  { key: "stab", file: "sfx-synth-stab.mp3", text: "punchy futuristic synth stab impact, deep sub bass, bright transient, single hit", duration_seconds: 1.0, prompt_influence: 0.6 },
  { key: "whoosh", file: "sfx-whoosh.mp3", text: "fast clean UI transition whoosh, airy, short", duration_seconds: 0.8, prompt_influence: 0.4 },
  { key: "click", file: "sfx-click.mp3", text: "crisp mechanical keyboard key click, single, dry", duration_seconds: 0.5, prompt_influence: 0.5 },
  { key: "chime", file: "sfx-chime.mp3", text: "positive success confirmation chime, bright uplifting bell, short", duration_seconds: 1.2, prompt_influence: 0.4 },
];

async function exists(p) {
  return access(p).then(() => true).catch(() => false);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest = { music: null, vo: [], sfx: {} };

  console.log("\n[1/3] Voiceover (TTS)…");
  for (const v of VO) {
    const buf = await el(`/v1/text-to-speech/${VOICE}`, {
      text: v.text,
      model_id: TTS_MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }, "?output_format=mp3_44100_128");
    const secs = await save(v.file, buf);
    manifest.vo.push({ file: v.file, fromF: v.fromF, durF: frames(secs) });
  }

  console.log("\n[2/3] Sound effects…");
  for (const s of SFX) {
    const buf = await el("/v1/sound-generation", {
      text: s.text,
      duration_seconds: s.duration_seconds,
      prompt_influence: s.prompt_influence,
    }, "?output_format=mp3_44100_128");
    await save(s.file, buf);
    manifest.sfx[s.key] = s.file;
  }

  console.log("\n[3/3] Music (/v1/music)…");
  try {
    const buf = await el("/v1/music", {
      prompt:
        "120 to 128 BPM cinematic tech launch track, driving synth arpeggio, confident and forward-moving, building to a triumphant final hit, clean modern mix, instrumental, no vocals",
      music_length_ms: 60000,
      model_id: "music_v1",
      force_instrumental: true,
    }, "?output_format=mp3_44100_128");
    await save("music.mp3", buf);
    manifest.music = "music.mp3";
  } catch (e) {
    console.warn(`\n  ⚠ /v1/music failed: ${e.status ?? ""} ${e.message}`);
    if (e.text) console.warn(`    ${e.text.slice(0, 300)}`);
    console.warn("    This endpoint needs an ElevenLabs plan with Music enabled. Fix the plan/key and re-run,");
    if (await exists(path.join(OUT, "fallback-music.mp3"))) {
      console.warn("    Using committed fallback-music.mp3 for now.\n");
      manifest.music = "fallback-music.mp3";
    } else {
      console.warn("    or drop a ~60s track at public/audio/fallback-music.mp3. Rendering without music for now.\n");
      manifest.music = null;
    }
  }

  await writeFile(path.join(ROOT, "src", "audio-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("\n✓ Wrote src/audio-manifest.json — re-render to bake the audio in.\n");
}

main().catch((e) => {
  console.error(`\n✕ ${e.message}`);
  if (e.text) console.error(e.text.slice(0, 400));
  process.exit(1);
});
