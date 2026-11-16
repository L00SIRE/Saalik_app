"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BenchmarkSummary } from "@/lib/benchmark";

const WIDTH = 960;
const HEIGHT = 540;
const SCENE_SECONDS = 18;

const INK = "#10241c";
const PAPER = "#f3efe6";
const MUTED = "#9fb3a8";
const BRICK = "#c46d4a";
const BRASS = "#d4b67a";
const GREEN = "#5fae84";

type Ctx = CanvasRenderingContext2D;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** Smooth 0 to 1 ramp while scene time `t` moves from `from` to `to`. */
const phase = (t: number, from: number, to: number) => {
  const x = clamp01((t - from) / (to - from));
  return x * x * (3 - 2 * x);
};
/** Deterministic pseudo-random number in [0, 1) so every playback draws the same crowd. */
const noise = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function label(ctx: Ctx, value: string, x: number, y: number, size: number, color: string, weight = 400, align: CanvasTextAlign = "left") {
  ctx.font = `${weight} ${size}px Georgia, "Noto Serif Devanagari", serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function pill(ctx: Ctx, value: string, x: number, y: number, fill: string, color: string) {
  ctx.font = '600 15px Georgia, "Noto Serif Devanagari", serif';
  const width = ctx.measureText(value).width + 24;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y - 19, width, 28, 14);
  ctx.fill();
  label(ctx, value, x + 12, y, 15, color, 600);
  return width;
}

function card(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(243, 239, 230, 0.07)";
  ctx.strokeStyle = "rgba(212, 182, 122, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

function pagoda(ctx: Ctx, cx: number, baseY: number, scale: number, tiers: number, fill: string) {
  ctx.fillStyle = fill;
  for (let step = 0; step < 3; step += 1) {
    ctx.fillRect(cx - scale * (1.5 - step * 0.2), baseY - (step + 1) * scale * 0.14, scale * (3 - step * 0.4), scale * 0.14);
  }
  let y = baseY - scale * 0.42;
  for (let tier = 0; tier < tiers; tier += 1) {
    const half = scale * (1.25 - tier * (0.9 / tiers));
    const body = scale * 0.34;
    const roof = scale * 0.26;
    ctx.fillRect(cx - half * 0.5, y - body, half, body);
    ctx.beginPath();
    ctx.moveTo(cx - half, y - body);
    ctx.lineTo(cx + half, y - body);
    ctx.lineTo(cx + half * 0.45, y - body - roof);
    ctx.lineTo(cx - half * 0.45, y - body - roof);
    ctx.closePath();
    ctx.fill();
    y -= body + roof;
  }
  ctx.beginPath();
  ctx.moveTo(cx - scale * 0.07, y);
  ctx.lineTo(cx + scale * 0.07, y);
  ctx.lineTo(cx, y - scale * 0.32);
  ctx.closePath();
  ctx.fill();
}

// Schematic valley layout for scene 1: relative positions only, not a survey map.
const UNESCO_ZONES: [string, number, number, number][] = [
  ["Kathmandu Durbar", 400, 270, 1],
  ["Patan Durbar", 440, 375, 0.85],
  ["Bhaktapur Durbar", 660, 310, 0.9],
  ["Swayambhunath", 300, 235, 0.55],
  ["Boudhanath", 545, 215, 0.6],
  ["Pashupatinath", 500, 265, 0.5],
  ["Changu Narayan", 715, 205, 0.2],
];
const SATELLITE_TOWNS: [string, number, number][] = [
  ["Kirtipur", 285, 365],
  ["Bungamati", 410, 455],
  ["Panauti", 850, 445],
];

function sceneValley(ctx: Ctx, t: number) {
  label(ctx, "Seven monument zones. Most visits land in a few squares.", 60, 120, 30, PAPER, 600);
  const drift = phase(t, 0.5, 0.95);
  for (const [name, x, y, weight] of UNESCO_ZONES) {
    ctx.strokeStyle = "rgba(212, 182, 122, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 16 + weight * 26, 0, Math.PI * 2);
    ctx.stroke();
    label(ctx, name, x, y - 22 - weight * 26, 13, MUTED, 400, "center");
  }
  for (const [name, x, y] of SATELLITE_TOWNS) {
    ctx.strokeStyle = BRICK;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, name, x, y + 44, 14, BRICK, 600, "center");
  }
  const totalWeight = UNESCO_ZONES.reduce((sum, zone) => sum + zone[3], 0);
  for (let i = 0; i < 170; i += 1) {
    let pick = noise(i) * totalWeight;
    let home = UNESCO_ZONES[0]!;
    for (const zone of UNESCO_ZONES) {
      pick -= zone[3];
      if (pick <= 0) {
        home = zone;
        break;
      }
    }
    const spread = 12 + home[3] * 22;
    const angle = noise(i + 500) * Math.PI * 2 + t * (0.6 + noise(i + 900));
    let x = home[1] + Math.cos(angle) * spread * noise(i + 200);
    let y = home[2] + Math.sin(angle) * spread * noise(i + 300);
    const disperses = i % 5 === 0;
    if (disperses) {
      const town = SATELLITE_TOWNS[i % 3]!;
      x += (town[1] + Math.cos(angle) * 14 - x) * drift;
      y += (town[2] + Math.sin(angle) * 14 - y) * drift;
    }
    ctx.fillStyle = disperses && drift > 0.05 ? BRICK : BRASS;
    ctx.globalAlpha = phase(t, 0, 0.12) * 0.9;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = phase(t, 0.55, 0.75);
  label(ctx, "Saalik points the next stop toward the towns nobody queues for.", 60, 505, 19, PAPER);
  ctx.globalAlpha = 1;
}

function sceneScan(ctx: Ctx, t: number, benchmark: BenchmarkSummary) {
  label(ctx, "Point the camera. The monument answers.", 60, 120, 30, PAPER, 600);
  card(ctx, 110, 160, 230, 330);
  pagoda(ctx, 225, 440, 62, 5, "rgba(212, 182, 122, 0.85)");
  const sweep = 190 + ((t * 5) % 1) * 250;
  ctx.fillStyle = "rgba(95, 174, 132, 0.8)";
  ctx.fillRect(122, sweep, 206, 3);

  label(ctx, "Photo + GPS, two-stage ranking", 420, 190, 18, MUTED);
  const matches: [string, number][] = [
    ["Nyatapola Mandir", 0.91],
    ["Bhairavnath Mandir", 0.78],
    ["Dattatreya Mandir", 0.71],
  ];
  matches.forEach(([name, score], row) => {
    const grow = phase(t, 0.2 + row * 0.08, 0.5 + row * 0.08);
    const y = 235 + row * 52;
    label(ctx, name, 420, y, 20, PAPER, row === 0 ? 600 : 400);
    ctx.fillStyle = "rgba(243, 239, 230, 0.12)";
    ctx.fillRect(420, y + 10, 440, 8);
    ctx.fillStyle = row === 0 ? GREEN : BRASS;
    ctx.fillRect(420, y + 10, 440 * score * grow, 8);
  });
  label(ctx, "Illustrative match scores", 420, 400, 13, MUTED);

  ctx.globalAlpha = phase(t, 0.55, 0.7);
  let x = 420;
  x += pill(ctx, `${benchmark.recallAt1.toFixed(3)} Recall@1 on held-out photos`, x, 450, "rgba(95, 174, 132, 0.2)", PAPER) + 10;
  pill(ctx, `${benchmark.recallAt3.toFixed(3)} Recall@3`, x, 450, "rgba(212, 182, 122, 0.2)", PAPER);
  pill(ctx, `${benchmark.latencyMs.toFixed(1)} ms warm encode (${benchmark.latencyDevice})`, 420, 490, "rgba(243, 239, 230, 0.1)", PAPER);
  ctx.globalAlpha = 1;
}

function sceneStory(ctx: Ctx, t: number) {
  label(ctx, "A sixty-second story, in two languages, with no signal.", 60, 120, 30, PAPER, 600);
  pagoda(ctx, 230, 470, 70, 5, BRASS);
  ctx.strokeStyle = "rgba(95, 174, 132, 0.7)";
  ctx.lineWidth = 2;
  for (let wave = 0; wave < 4; wave += 1) {
    const radius = 60 + ((t * 3 + wave / 4) % 1) * 110;
    ctx.globalAlpha = 1 - (radius - 60) / 110;
    ctx.beginPath();
    ctx.arc(320, 300, radius, -0.7, 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const lines: [string, number, string, number][] = [
    ["Nyatapola Mandir", 30, PAPER, 600],
    ["न्यातपोल मन्दिर", 26, BRASS, 400],
    ["Built in 1702 under King Bhupatindra Malla.", 19, PAPER, 400],
    ["Five roofs.", 19, PAPER, 400],
    ["Five pairs of stone guardians on the stair.", 19, PAPER, 400],
  ];
  lines.forEach(([value, size, color, weight], row) => {
    ctx.globalAlpha = phase(t, 0.08 + row * 0.1, 0.2 + row * 0.1);
    label(ctx, value, 500, 205 + row * 42, size, color, weight);
  });
  ctx.globalAlpha = phase(t, 0.6, 0.75);
  let x = 500;
  for (const tab of ["Story", "Iconography", "Dynasty timeline"]) {
    x += pill(ctx, tab, x, 430, "rgba(243, 239, 230, 0.1)", PAPER) + 8;
  }
  label(ctx, "101 monuments · English + नेपाली · sources listed", 500, 482, 16, MUTED);
  ctx.globalAlpha = 1;
}

function sceneGuide(ctx: Ctx, t: number) {
  label(ctx, "Every story ends with a local storyteller.", 60, 120, 30, PAPER, 600);
  card(ctx, 70, 180, 340, 230);
  label(ctx, "Aanya · Traveler", 95, 225, 22, PAPER, 600);
  label(ctx, "Scanned: Krishna Mandir, Patan", 95, 262, 17, MUTED);
  pill(ctx, "Book a verified local storyteller", 95, 320, BRASS, INK);
  label(ctx, "Free walk. She tips what it was worth.", 95, 370, 15, MUTED);

  card(ctx, 550, 180, 340, 230);
  label(ctx, "Bishnu · Guide", 575, 225, 22, PAPER, 600);
  const arrived = phase(t, 0.3, 0.5);
  ctx.globalAlpha = arrived;
  label(ctx, "New request · from a scan", 575, 262, 17, MUTED);
  label(ctx, "Krishna Mandir · 2 guests", 575, 300, 19, PAPER);
  const confirmed = t > 0.68;
  pill(ctx, confirmed ? "CONFIRMED" : "PENDING", 575, 350, confirmed ? GREEN : BRASS, INK);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(212, 182, 122, 0.5)";
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(420, 295);
  ctx.lineTo(540, 295);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = BRICK;
  ctx.beginPath();
  ctx.arc(420 + 120 * phase(t, 0.12, 0.32), 295, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = phase(t, 0.7, 0.85);
  label(ctx, "The scan that started the booking travels with it.", WIDTH / 2, 480, 20, PAPER, 400, "center");
  ctx.globalAlpha = 1;
}

function sceneCommand(ctx: Ctx, t: number) {
  label(ctx, "For the Tourism Board, every scan is a signal.", 60, 120, 30, PAPER, 600);
  const shift = phase(t, 0.15, 0.6);
  const rows: [string, number, string][] = [
    ["UNESCO squares", 0.86 - 0.12 * shift, BRASS],
    ["Kirtipur · Bungamati · Panauti", 0.14 + 0.12 * shift, BRICK],
  ];
  rows.forEach(([name, share, color], row) => {
    const y = 195 + row * 80;
    label(ctx, name, 60, y, 20, PAPER);
    ctx.fillStyle = "rgba(243, 239, 230, 0.1)";
    ctx.fillRect(60, y + 14, 620, 18);
    ctx.fillStyle = color;
    ctx.fillRect(60, y + 14, 620 * share, 18);
    label(ctx, `${Math.round(share * 100)}%`, 700, y + 30, 20, PAPER, 600);
  });
  label(ctx, "Illustrative dispersion target, set with NTB during the pilot", 60, 345, 14, MUTED);

  ctx.globalAlpha = phase(t, 0.6, 0.78);
  label(ctx, "90-day pilot", 60, 430, 54, BRASS, 600);
  label(ctx, "Kathmandu Valley · field photography · guide onboarding · weekly dispersion report", 60, 475, 18, PAPER);
  ctx.globalAlpha = 1;
}

// Narration and the scan scene quote the benchmark, so they take the numbers the last run exported.
const SCENES: {
  title: string;
  narration: (benchmark: BenchmarkSummary) => string;
  bowlHz: number;
  draw: (ctx: Ctx, t: number, benchmark: BenchmarkSummary) => void;
}[] = [
  {
    title: "The bottleneck",
    narration: () =>
      "The Kathmandu Valley holds seven UNESCO monument zones. Most visitors see the same few squares, while heritage towns like Kirtipur, Bungamati and Panauti stay quiet. Saalik is built to spread that attention, and the income that follows it.",
    bowlHz: 174.6,
    draw: sceneValley,
  },
  {
    title: "The scan",
    narration: (benchmark) =>
      `Point a phone at a temple. Saalik matches the photo against ${benchmark.photos} reference images and the visitor's GPS position. In our pre-departure benchmark, the right monument ranked first for ${Math.round(benchmark.recallAt1 * 100)} percent of photos the system had never seen.`,
    bowlHz: 196,
    draw: sceneScan,
  },
  {
    title: "The story",
    narration: () =>
      "Then the monument speaks. Each of 101 monuments carries a sixty-second story in English and Nepali, covering its history, iconography and living rituals, with sources listed for every passage. It works offline, in a courtyard with no signal.",
    bowlHz: 220,
    draw: sceneStory,
  },
  {
    title: "The guide",
    narration: () =>
      "Every story ends with an invitation to walk it with a licensed local guide. The traveler books in two taps. The guide sees the request, tagged with the monument that started it. The walk is free, and the tip goes to the storyteller.",
    bowlHz: 261.6,
    draw: sceneGuide,
  },
  {
    title: "The pilot",
    narration: () =>
      "For the Tourism Board, every scan is a signal. The command center shows where visitors gather, which monuments still need field photographs, and what guides earn. We propose a ninety-day pilot in the Kathmandu Valley.",
    bowlHz: 293.7,
    draw: sceneCommand,
  },
];

const TOTAL_SECONDS = SCENES.length * SCENE_SECONDS;
/** While paused at the start of a scene, show it mid-way: frame zero is the fade from black. */
const POSTER_SECONDS = 9;

/**
 * Struck-metal tone: three inharmonic partials, each doubled 0.7 Hz apart so the pair beats
 * slowly. A long decay reads as a singing bowl, a short high one as a hand bell.
 */
function strike(audio: AudioContext, hz: number, seconds: number, level: number) {
  const now = audio.currentTime;
  const out = audio.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(level, now + 0.02);
  out.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  out.connect(audio.destination);
  for (const [ratio, weight] of [
    [1, 1],
    [2.71, 0.45],
    [5.15, 0.2],
  ] as const) {
    for (const beat of [0, 0.7]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      gain.gain.value = weight * 0.5;
      osc.frequency.value = hz * ratio + beat;
      osc.connect(gain).connect(out);
      osc.start(now);
      osc.stop(now + seconds);
    }
  }
}

export function AnimatedPitchFilm({ benchmark }: { benchmark: BenchmarkSummary }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const elapsed = useRef(0);
  const cued = useRef(-1);
  const [playing, setPlaying] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [narrate, setNarrate] = useState(true);
  const [sound, setSound] = useState(true);
  const options = useRef({ narrate, sound });
  options.current = { narrate, sound };

  const draw = useCallback((seconds: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const index = Math.min(SCENES.length - 1, Math.floor(seconds / SCENE_SECONDS));
    const t = clamp01((seconds - index * SCENE_SECONDS) / SCENE_SECONDS);
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, INK);
    gradient.addColorStop(1, "#1f4034");
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textBaseline = "alphabetic";
    label(ctx, "SAALIK × NEPAL TOURISM BOARD", 60, 60, 14, BRASS, 600);
    label(ctx, `${index + 1} / ${SCENES.length} · ${SCENES[index]!.title}`, WIDTH - 60, 60, 14, MUTED, 400, "right");
    SCENES[index]!.draw(ctx, t, benchmark);
    // Fade each scene in and out so the cuts are soft.
    ctx.fillStyle = INK;
    ctx.globalAlpha = Math.max(1 - phase(t, 0, 0.05), phase(t, 0.96, 1)) * 0.9;
    ctx.fillRect(0, 70, WIDTH, HEIGHT - 70);
    ctx.globalAlpha = 1;
    const segment = (WIDTH - 120 - (SCENES.length - 1) * 6) / SCENES.length;
    SCENES.forEach((_, i) => {
      const x = 60 + i * (segment + 6);
      ctx.fillStyle = "rgba(243, 239, 230, 0.18)";
      ctx.fillRect(x, HEIGHT - 16, segment, 4);
      ctx.fillStyle = BRASS;
      ctx.fillRect(x, HEIGHT - 16, segment * clamp01(seconds / SCENE_SECONDS - i), 4);
    });
  }, [benchmark]);

  const silence = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  // Bowl strike and narration at the start of each scene.
  const cue = useCallback((index: number) => {
    setSceneIndex(index);
    const scene = SCENES[index]!;
    if (options.current.sound && audioRef.current) strike(audioRef.current, scene.bowlHz, 9, 0.16);
    if (options.current.narrate && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(scene.narration(benchmark));
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  }, [benchmark]);

  useEffect(() => {
    draw(POSTER_SECONDS);
    return () => {
      silence();
      void audioRef.current?.close();
    };
  }, [draw]);

  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Capping the step keeps a backgrounded tab from skipping scenes when it returns.
      elapsed.current = Math.min(TOTAL_SECONDS, elapsed.current + Math.min(0.1, (now - last) / 1000));
      last = now;
      const index = Math.min(SCENES.length - 1, Math.floor(elapsed.current / SCENE_SECONDS));
      if (index !== cued.current) {
        cued.current = index;
        cue(index);
      }
      draw(elapsed.current);
      if (elapsed.current >= TOTAL_SECONDS) {
        if (options.current.sound && audioRef.current) strike(audioRef.current, 880, 2.5, 0.1);
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, cue, draw]);

  const seek = (seconds: number) => {
    silence();
    elapsed.current = seconds;
    cued.current = -1;
    setSceneIndex(Math.min(SCENES.length - 1, Math.floor(seconds / SCENE_SECONDS)));
    draw(seconds + POSTER_SECONDS);
  };

  const togglePlay = () => {
    if (playing) {
      window.speechSynthesis?.pause();
      setPlaying(false);
      return;
    }
    // Browsers only allow audio to start from a user gesture, so the context is created here.
    audioRef.current ??= new AudioContext();
    void audioRef.current.resume();
    if (elapsed.current >= TOTAL_SECONDS) seek(0);
    window.speechSynthesis?.resume();
    setPlaying(true);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="filmCanvas" />
      <div className="btnRow" style={{ alignItems: "center" }}>
        <button type="button" className="btn btnPrimary" onClick={togglePlay}>
          {playing ? "Pause" : "Play 90-second film"}
        </button>
        <button
          type="button"
          className="btn btnSecondary"
          onClick={() => {
            setPlaying(false);
            seek(0);
          }}
        >
          Restart
        </button>
        {SCENES.map((scene, index) => (
          <button
            key={scene.title}
            type="button"
            className={`chip${index === sceneIndex ? " chipStrong" : ""}`}
            onClick={() => seek(index * SCENE_SECONDS)}
          >
            {index + 1}. {scene.title}
          </button>
        ))}
      </div>
      <div className="legendRow" style={{ marginTop: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={narrate}
            onChange={(event) => {
              setNarrate(event.target.checked);
              if (!event.target.checked) silence();
            }}
          />{" "}
          Spoken narration
        </label>
        <label>
          <input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} /> Singing bowl and bell
        </label>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>
        {SCENES[sceneIndex]!.narration(benchmark)}
      </p>
    </div>
  );
}
