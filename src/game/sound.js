// Suoni del gioco, fatti al momento (niente file da scaricare). Si possono spegnere.
let ctx = null;
const KEY = "mora_game_sound";
export const soundOn = () => {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch (e) {
    return true;
  }
};
export const setSoundOn = (on) => {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch (e) {
    // niente
  }
};
const ac = () => {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};
const tone = (f0, f1, dur, type = "sine", vol = 0.15, delay = 0) => {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
};
export const play = (name) => {
  if (!soundOn()) return;
  try {
    if (name === "clack") {
      tone(900, 300, 0.06, "square", 0.08);
      tone(240, 120, 0.08, "triangle", 0.12, 0.02);
    } else if (name === "thud") tone(160, 60, 0.18, "sine", 0.25);
    else if (name === "bump") {
      tone(120, 40, 0.3, "sawtooth", 0.18);
      tone(2400, 900, 0.12, "square", 0.05);
    } else if (name === "perfect") {
      tone(660, 660, 0.09, "triangle", 0.14);
      tone(990, 990, 0.14, "triangle", 0.14, 0.08);
    } else if (name === "error") tone(180, 140, 0.25, "square", 0.08);
    else if (name === "horn") {
      tone(311, 311, 0.35, "sawtooth", 0.06);
      tone(392, 392, 0.35, "sawtooth", 0.05);
    } else if (name === "fail") {
      tone(392, 196, 0.5, "triangle", 0.15);
    } else if (name === "start") {
      tone(523, 523, 0.1, "triangle", 0.12);
      tone(659, 659, 0.1, "triangle", 0.12, 0.1);
      tone(784, 784, 0.18, "triangle", 0.12, 0.2);
    }
  } catch (e) {
    // niente audio: pazienza
  }
};
