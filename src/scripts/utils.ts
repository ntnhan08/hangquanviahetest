
// ============================================================
// utils.ts — Công cụ toán học, định dạng, vẽ cơ bản & âm thanh
// ============================================================

// ---------------- toán ----------------

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function dist(x0: number, y0: number, x1: number, y1: number): number {
  return Math.hypot(x1 - x0, y1 - y0);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Nảy nhẹ khi mở màn hình (easeOutBack), t ∈ [0,1] → [0.9, 1] */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ---------------- định dạng tiền ----------------

export function fmtDong(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "₫";
}

export function fmtK(n: number): string {
  return Math.round(n / 1000) + "k";
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------------- vẽ cơ bản ----------------

/** Hình chữ nhật bo góc (tương thích mọi trình duyệt). */
export function rr(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

/** Xuống dòng văn bản theo bề rộng tối đa. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99
): void {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = words[i];
      lines++;
      if (lines >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return cv;
}

// ============================================================
// Âm thanh WebAudio — thuần oscillator, không file ngoài,
// mọi hàm đều bọc try/catch để không bao giờ làm đứng game.
// ============================================================

class Sfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    try {
      if (typeof window === "undefined") return null;
      if (!this.ac) {
        if (!window.AudioContext) return null;
        this.ac = new AudioContext();
        this.master = this.ac.createGain();
        this.master.gain.value = this.muted ? 0 : 0.4;
        this.master.connect(this.ac.destination);
      }
      if (this.ac.state === "suspended") void this.ac.resume();
      return this.ac;
    } catch {
      return null;
    }
  }

  unlock(): void {
    try {
      this.ensure();
    } catch {
      /* bỏ qua */
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      if (this.master && this.ac)
        this.master.gain.setTargetAtTime(m ? 0 : 0.4, this.ac.currentTime, 0.02);
    } catch {
      /* bỏ qua */
    }
  }

  private tone(
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0
  ): void {
    try {
      const ac = this.ensure();
      if (!ac || !this.master || this.muted) return;
      const t = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(1, f0), t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch {
      /* bỏ qua */
    }
  }

  private burst(dur: number, vol: number, freq: number, delay = 0): void {
    try {
      const ac = this.ensure();
      if (!ac || !this.master || this.muted) return;
      const t = ac.currentTime + delay;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const filt = ac.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.master);
      src.start(t);
    } catch {
      /* bỏ qua */
    }
  }

  click(): void {
    this.tone(720, 480, 0.06, "triangle", 0.22);
  }
  reject(): void {
    this.tone(230, 160, 0.08, "square", 0.13);
  }
  prepHit(round: number, perfect: boolean): void {
    this.tone(420 + round * 90, 700 + round * 90, 0.08, "triangle", 0.28);
    if (perfect) this.tone(1400, 2000, 0.06, "sine", 0.12, 0.02);
  }
  prepMiss(): void {
    this.tone(200, 130, 0.1, "square", 0.12);
  }
  cookStop(good: boolean): void {
    if (good) {
      this.tone(520, 520, 0.1, "sine", 0.3);
      this.tone(780, 780, 0.14, "sine", 0.22, 0.06);
    } else {
      this.tone(300, 220, 0.16, "square", 0.18);
    }
  }
  plateTap(n: number): void {
    this.tone(600 + n * 60, 900 + n * 60, 0.05, "triangle", 0.2);
  }
  stageDone(stars: number): void {
    const b = 500 + stars * 120;
    this.tone(b, b, 0.1, "sine", 0.26);
    this.tone(b * 1.5, b * 1.5, 0.14, "sine", 0.2, 0.07);
  }
  serve(combo: number): void {
    const b = 620 + Math.min(combo, 8) * 55;
    this.tone(b, b, 0.12, "sine", 0.3);
    this.tone(b * 1.5, b * 1.5, 0.14, "sine", 0.24, 0.06);
    this.tone(b * 2, b * 2, 0.18, "sine", 0.18, 0.12);
    this.burst(0.12, 0.07, 5200, 0.02);
  }
  tip(): void {
    this.tone(1500, 2200, 0.12, "sine", 0.2, 0.04);
    this.tone(2200, 2800, 0.1, "sine", 0.14, 0.12);
  }
  burn(): void {
    this.burst(0.4, 0.22, 1300);
    this.tone(180, 70, 0.35, "sawtooth", 0.16, 0.03);
  }
  dump(): void {
    this.burst(0.3, 0.2, 1400);
    this.tone(320, 110, 0.2, "triangle", 0.18, 0.02);
  }
  pour(): void {
    this.tone(900, 380, 0.24, "sine", 0.16);
    this.tone(1300, 600, 0.18, "sine", 0.1, 0.06);
    this.burst(0.16, 0.06, 6000, 0.03);
  }
  spill(): void {
    this.tone(500, 160, 0.3, "sine", 0.18);
    this.burst(0.25, 0.14, 2400, 0.02);
  }
  walkout(): void {
    this.tone(392, 388, 0.14, "triangle", 0.2);
    this.tone(311, 306, 0.22, "triangle", 0.2, 0.13);
  }
  dayEnd(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.16, "triangle", 0.24, i * 0.11));
  }
  gameover(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.97, 0.26, "sawtooth", 0.14, i * 0.17));
  }
  victory(): void {
    [523, 659, 784, 880, 1047, 1319].forEach((f, i) =>
      this.tone(f, f, 0.18, "triangle", 0.22, i * 0.1)
    );
  }
}

export const sfx = new Sfx();
