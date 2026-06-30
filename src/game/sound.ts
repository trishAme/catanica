type AudioConstructor = typeof AudioContext;

let audioContext: AudioContext | undefined;
let musicTimer: number | undefined;
let musicStep = 0;
let defeatAudio: HTMLAudioElement | undefined;
let defeatStopTimer: number | undefined;

const DEFEAT_AUDIO_URL = "assets/nononono-cat.mp3";
export const DEFEAT_AUDIO_VOLUME = 0.32;

type MusicTheme = {
  notes: number[];
  interval: number;
  lead: OscillatorType;
  bass: OscillatorType;
  gain: number;
  bassGain: number;
  duration?: number;
};

const MUSIC_THEMES: Record<string, MusicTheme> = {
  "window-bed": {
    notes: [196, 247, 262, 330, 294, 262, 247, 0, 196, 247, 294, 392, 330, 294, 262, 0],
    interval: 230,
    lead: "square",
    bass: "triangle",
    gain: 0.016,
    bassGain: 0.01
  },
  "desk-laptop": {
    notes: [165, 196, 247, 294, 330, 294, 247, 0, 196, 247, 294, 247, 220, 196, 165, 0],
    interval: 210,
    lead: "square",
    bass: "triangle",
    gain: 0.014,
    bassGain: 0.009
  },
  "cat-hammock": {
    notes: [220, 277, 330, 370, 330, 277, 247, 0, 220, 247, 294, 330, 294, 247, 220, 0],
    interval: 238,
    lead: "square",
    bass: "triangle",
    gain: 0.02,
    bassGain: 0.012
  },
  bedroom: {
    notes: [392, 440, 392, 330, 349, 392, 330, 0, 294, 330, 349, 330, 294, 262, 247, 0],
    interval: 360,
    lead: "triangle",
    bass: "sine",
    gain: 0.026,
    bassGain: 0.012,
    duration: 0.24
  },
  greenhouse: {
    notes: [262, 330, 392, 494, 392, 330, 294, 0, 294, 370, 440, 392, 330, 294, 262, 0],
    interval: 245,
    lead: "sine",
    bass: "triangle",
    gain: 0.015,
    bassGain: 0.008
  },
  "grandma-corner": {
    notes: [262, 330, 392, 440, 392, 330, 294, 0, 247, 294, 330, 392, 330, 294, 262, 0],
    interval: 315,
    lead: "triangle",
    bass: "sine",
    gain: 0.022,
    bassGain: 0.013,
    duration: 0.18
  }
};

export function getMusicThemeIds(): string[] {
  return Object.keys(MUSIC_THEMES);
}

let musicThemeId = "window-bed";

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const AudioCtor =
    window.AudioContext ??
    ((window as Window & { webkitAudioContext?: AudioConstructor })
      .webkitAudioContext);

  if (!AudioCtor) {
    return undefined;
  }

  audioContext ??= new AudioCtor();
  return audioContext;
}

function resumeAudioContext(): AudioContext | undefined {
  const context = getAudioContext();

  if (context?.state === "suspended") {
    void context.resume().catch(() => undefined);
  }

  return context;
}

export function unlockAudio(): void {
  resumeAudioContext();
}

function playTone(
  frequency: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
  endFrequency = frequency
): void {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const schedule = () => {
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const now = context.currentTime;

    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency !== frequency) {
      oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration);
    }
    oscillator.type = type;
    volume.gain.setValueAtTime(0, now);
    volume.gain.linearRampToValueAtTime(gain, now + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  if (context.state === "suspended") {
    void context.resume().then(schedule).catch(() => undefined);
    return;
  }

  schedule();
}

function playNoise(duration: number, gain: number): void {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const schedule = () => {
    const frameCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      const envelope = 1 - index / frameCount;
      data[index] = (Math.random() * 2 - 1) * envelope;
    }

    const source = context.createBufferSource();
    const volume = context.createGain();
    const now = context.currentTime;

    source.buffer = buffer;
    volume.gain.setValueAtTime(gain, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(volume);
    volume.connect(context.destination);
    source.start(now);
  };

  if (context.state === "suspended") {
    void context.resume().then(schedule).catch(() => undefined);
    return;
  }

  schedule();
}

export function startBackgroundMusic(themeId = "window-bed"): void {
  const context = resumeAudioContext();

  if (!context) {
    return;
  }

  if (musicTimer !== undefined && musicThemeId === themeId) {
    return;
  }

  if (musicTimer !== undefined) {
    window.clearInterval(musicTimer);
    musicTimer = undefined;
    musicStep = 0;
  }

  musicThemeId = themeId;

  musicTimer = window.setInterval(() => {
    const theme = MUSIC_THEMES[musicThemeId] ?? MUSIC_THEMES["window-bed"];

    if (context.state !== "running") {
      return;
    }

    const note = theme.notes[musicStep % theme.notes.length];
    const bass = musicStep % 4 === 0;
    musicStep += 1;

    if (note === 0) {
      return;
    }

    const duration = theme.duration ?? 0.12;
    playTone(note, duration, theme.gain, theme.lead);

    if (bass) {
      playTone(note / 2, Math.max(0.18, duration + 0.06), theme.bassGain, theme.bass);
    }
  }, (MUSIC_THEMES[musicThemeId] ?? MUSIC_THEMES["window-bed"]).interval);
}

export function playMunch(): void {
  const variants = [
    { base: 172, bite: 620 },
    { base: 188, bite: 540 },
    { base: 156, bite: 580 }
  ];
  const voice = variants[Math.floor(Math.random() * variants.length)];

  playTone(voice.bite, 0.04, 0.026, "triangle", voice.bite * 0.72);
  playTone(voice.base, 0.13, 0.074, "sine", voice.base * 0.82);
  window.setTimeout(() => playTone(voice.base * 0.72, 0.09, 0.046, "triangle", voice.base * 0.58), 72);
}

export function playMeow(): void {
  const voices = [
    { first: 420, peak: 650, end: 330, gain: 0.078, type: "square" as OscillatorType },
    { first: 340, peak: 520, end: 280, gain: 0.07, type: "triangle" as OscillatorType },
    { first: 520, peak: 760, end: 430, gain: 0.064, type: "square" as OscillatorType },
    { first: 390, peak: 470, end: 260, gain: 0.072, type: "sawtooth" as OscillatorType }
  ];
  const voice = voices[Math.floor(Math.random() * voices.length)];

  playTone(voice.first, 0.14, voice.gain, voice.type, voice.peak);
  window.setTimeout(() => playTone(voice.peak, 0.12, voice.gain * 0.9, voice.type, voice.end), 92);
  window.setTimeout(() => playTone(voice.end, 0.08, voice.gain * 0.42, "triangle", voice.end * 0.82), 196);
}

export function playBlip(): void {
  playTone(520, 0.06, 0.05, "square");
}

export function playCrash(): void {
  playNoise(0.16, 0.11);
  playTone(980, 0.035, 0.035, "triangle", 720);
  window.setTimeout(() => playTone(1320, 0.025, 0.028, "triangle", 940), 35);
  window.setTimeout(() => playTone(760, 0.045, 0.026, "sine", 520), 74);
}

export function playPotBreak(): void {
  playNoise(0.15, 0.095);
  playTone(360, 0.035, 0.018, "triangle", 260);
  window.setTimeout(() => playNoise(0.055, 0.04), 48);
  window.setTimeout(() => playTone(260, 0.045, 0.012, "sine", 190), 76);
}

export function stopDefeatCat(): void {
  if (defeatStopTimer !== undefined) {
    window.clearTimeout(defeatStopTimer);
    defeatStopTimer = undefined;
  }

  if (!defeatAudio) {
    return;
  }

  defeatAudio.pause();
  defeatAudio.currentTime = 0;
}

export function playDefeatCat(): void {
  if (typeof window === "undefined") {
    return;
  }

  stopDefeatCat();
  defeatAudio ??= new Audio(DEFEAT_AUDIO_URL);
  defeatAudio.volume = DEFEAT_AUDIO_VOLUME;
  defeatAudio.currentTime = 0;

  void defeatAudio.play().catch(() => {
    playOminous();
  });

  defeatStopTimer = window.setTimeout(() => stopDefeatCat(), 3000);
}

export function playOminous(): void {
  playTone(155, 0.18, 0.09, "triangle");
  window.setTimeout(() => playTone(116, 0.24, 0.08, "triangle"), 120);
}

export function playSleepTone(): void {
  playTone(392, 0.12, 0.05, "triangle");
  window.setTimeout(() => playTone(494, 0.18, 0.05, "triangle"), 110);
  window.setTimeout(() => playTone(587, 0.24, 0.04, "triangle"), 260);
}
