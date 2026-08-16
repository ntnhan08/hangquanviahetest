
// ============================================================
// game.ts — Lõi game Hàng Quán Vỉa Hè
// Vòng lặp, thế giới, mini-game, phục vụ, hạt, ambient & toàn bộ UI.
// ============================================================

import type {
  Btn,
  ChefLook,
  ChefState,
  Customer,
  DayConfig,
  Dish,
  DishId,
  Mini,
  Particle,
  Phase,
  PrepChip,
  StationDef,
  StatsPayload,
  TablePos,
  Tray,
} from "./types";
import {
  ALL_INGREDIENTS,
  CUSTOMER_TYPES,
  DAYS,
  DISHES,
  ANGRY_LINES,
  DRINK_LINES,
  HAPPY_LINES,
  PENALTY_RATE,
  TIP_LINES,
  WRONG_LINES,
  HATS,
  SHIRTS,
  dishById,
  dishIngredients,
  dishPatienceFactor,
  loadLook,
  saveLook,
} from "./food";
import { drawDish, drawPerson } from "./render";
import {
  createChef,
  seatOf,
  spawnCustomer,
  stepChefToward,
  updateCustomer,
} from "./character";
import {
  clamp,
  dist,
  easeOutBack,
  fmtClock,
  fmtDong,
  fmtK,
  makeCanvas,
  pick,
  rand,
  rr,
  sfx,
  wrapText,
} from "./utils";

export const W = 960;
export const H = 640;
const HUD_H = 56;
const WALK = { x0: 36, y0: 128, x1: 924, y1: 452 };
const DOOR = { x: 92, y: 132 };
const INTERACT_Y = 446;
const STAR_GOLD = "#ffd23f";

const F_D = '"Bungee", "Be Vietnam Pro", sans-serif';
const F_B = '"Be Vietnam Pro", sans-serif';

// bảng màu "quán Việt cổ × hiện đại"
const C = {
  paper: "#f3e3c0",
  paperDk: "#e6d0a4",
  ink: "#33220f",
  inkSoft: "#6b5636",
  lacquer: "#9c3324",
  lacquerDk: "#6e1f14",
  gold: "#d9a441",
  goldLt: "#f0cd7e",
  wood: "#3a2416",
  woodDk: "#241207",
  jade: "#3f7d5c",
  jadeDk: "#2b5c41",
};

const TABLES: TablePos[] = [
  { x: 190, y: 222 }, { x: 480, y: 222 }, { x: 770, y: 222 },
  { x: 190, y: 362 }, { x: 480, y: 362 }, { x: 770, y: 362 },
];

const STATIONS: StationDef[] = [
  { id: "prep", kind: "prep", x: 40, w: 140 },
  { id: "stove0", kind: "stove", x: 195, w: 76 },
  { id: "stove1", kind: "stove", x: 286, w: 76 },
  { id: "oven", kind: "oven", x: 377, w: 120 },
  { id: "pass", kind: "pass", x: 512, w: 120 },
  { id: "bar", kind: "bar", x: 647, w: 140 },
  { id: "trash", kind: "trash", x: 802, w: 118 },
];
const stationCX = (s: StationDef) => s.x + s.w / 2;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastT = 0;
  private destroyed = false;
  private dpr = 1;
  private bg: HTMLCanvasElement | null = null;
  private gallery: HTMLCanvasElement | null = null;
  private errGuard = false;
  viewAspect = 1.5;

  phase: Phase = "menu";
  private clock = 0;
  private lastPhase: Phase = "menu";
  private phaseStart = 0;
  private dayIdx = 0;
  private cfg: DayConfig = DAYS[0];
  private dayTime = DAYS[0].time;
  private money = 0;
  private totalMoney = 0;
  private best = 0;
  private penalized = 0;
  private combo = 0;
  private bestCombo = 0;
  private served = 0;
  private perfect = 0;
  private tuyetPham = 0;
  private missed = 0;
  private spawnT = 2;

  private chef: ChefState = createChef(480, 396);
  private chefLook: ChefLook = loadLook();
  carry: Tray | null = null;
  private customers: Customer[] = [];
  private nextId = 1;
  private mini: Mini | null = null;
  private pickList: Dish[] | null = null;
  private pickKind: "food" | "drink" = "food";
  private pending: { kind: "station"; id: string } | { kind: "serve"; cid: number } | null = null;

  private particles: Particle[] = [];
  private pPool: Particle[] = [];
  private shakeMag = 0;
  private flashRed = 0;
  private flashGreen = 0;
  private steamAcc = 0;
  private confettiAcc = 0;
  private hudGrad: CanvasGradient | null = null;

  // ambient
  private cat = { x: -60, y: 430, dir: 1, mode: "wait" as "wait" | "walk" | "pause", t: 3, tail: 0 };
  private moto = { x: -140, on: false, t: 12, dir: 1 };
  private twk = Array.from({ length: 14 }, (_, i) => ({ ph: i * 0.9, sp: 1.5 + (i % 3) * 0.6 }));

  private keys = new Set<string>();
  private btns: Btn[] = [];
  private hoverBtn = false;
  private pointer = { x: -100, y: -100 };

  private onKD: (e: KeyboardEvent) => void;
  private onKU: (e: KeyboardEvent) => void;
  private onPD: (e: PointerEvent) => void;
  private onPM: (e: PointerEvent) => void;
  private onBlur: () => void;
  private onFsChange = () => {
    const d = document as Document & { webkitFullscreenElement?: Element | null };
    if (!document.fullscreenElement && !d.webkitFullscreenElement) this.landscapeDone = false;
    this.measure();
  };
  private onWinResize = () => this.measure();

  private readonly isTouch = (() => {
    if (typeof window === "undefined") return false;
    const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    if (!touch) return false;
    try {
      if (window.matchMedia?.("(pointer: coarse)").matches) return true;
    } catch {
      /* bỏ qua */
    }
    return Math.min(screen.width, screen.height) < 620;
  })();
  private wantLandscape = false;
  private landscapeDone = false;
  private portraitPaused = false;
  // Disable portrait lock to allow full-screen on any device orientation
  private get portraitLocked(): boolean {
    return false;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    canvas.width = W * this.dpr;
    canvas.height = H * this.dpr;

    try {
      this.best = Number(localStorage.getItem("hqv-best") || 0) || 0;
    } catch {
      this.best = 0;
    }

    this.onKD = (e) => this.keyDown(e);
    this.onKU = (e) => this.keys.delete(e.key.toLowerCase());
    this.onPD = (e) => {
      e.preventDefault();
      sfx.unlock();
      this.pointerDown(this.toLogical(e));
    };
    this.onPM = (e) => {
      this.pointer = this.toLogical(e);
      this.updateCursor();
    };
    this.onBlur = () => {
      if (this.phase === "playing") this.togglePause();
    };
    window.addEventListener("keydown", this.onKD);
    window.addEventListener("keyup", this.onKU);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("fullscreenchange", this.onFsChange);
    document.addEventListener("webkitfullscreenchange", this.onFsChange as EventListener);
    window.addEventListener("resize", this.onWinResize);
    window.addEventListener("orientationchange", this.onWinResize);
    canvas.addEventListener("pointerdown", this.onPD);
    canvas.addEventListener("pointermove", this.onPM);

    this.buildBackground();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          this.buildBackground();
          this.gallery = null;
        })
        .catch(() => undefined);
    }
    this.measure();
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      new ResizeObserver(() => this.measure()).observe(canvas.parentElement);
    }

    this.lastT = performance.now();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKD);
    window.removeEventListener("keyup", this.onKU);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("fullscreenchange", this.onFsChange);
    document.removeEventListener("webkitfullscreenchange", this.onFsChange as EventListener);
    window.removeEventListener("resize", this.onWinResize);
    window.removeEventListener("orientationchange", this.onWinResize);
    this.canvas.removeEventListener("pointerdown", this.onPD);
    this.canvas.removeEventListener("pointermove", this.onPM);
  }

  private measure(): void {
    const p = this.canvas.parentElement;
    if (p && p.clientWidth > 0 && p.clientHeight > 0) {
      this.viewAspect = p.clientWidth / p.clientHeight;
      if (!this.portraitLocked && this.portraitPaused && this.phase === "paused") {
        this.portraitPaused = false;
        this.phase = "playing";
        this.lastT = performance.now();
      }
    }
    // Resize canvas to fill viewport exactly (no letterboxing)
    const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    this.dpr = dpr;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
  }

  private toLogical(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / W;
    const scaleY = rect.height / H;
    return { x: (e.clientX - rect.left) / scaleX, y: (e.clientY - rect.top) / scaleY };
  }

  // ---------------- API ----------------

  startGame = () => {
    sfx.unlock();
    sfx.click();
    this.totalMoney = 0;
    this.setupDay(0);
    // Landscape lock removed - game now plays full-screen on any orientation
  };

  private cancelOps = () => {
    if (!this.mini && !this.pickList) return;
    this.mini = null;
    this.pickList = null;
    sfx.click();
  };

  private tryLandscape(): void {
    if (!this.isTouch || this.landscapeDone) return;
    this.wantLandscape = true;
    const o = screen.orientation as ScreenOrientation & { lock?: (ori: string) => Promise<void> };
    const tryLock = () => {
      try {
        const p = o.lock?.("landscape");
        if (p && typeof p.then === "function") {
          p.then(() => {
            this.landscapeDone = true;
            this.wantLandscape = false;
          }).catch(() => {});
          return true;
        }
      } catch {
        /* thử cách khác */
      }
      return false;
    };
    if (tryLock()) return;
    try {
      const el = this.canvas as HTMLCanvasElement & {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
      };
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      if (!req) return;
      const p = req();
      if (p && typeof p.then === "function") {
        p.then(() => {
          if (!tryLock()) {
            this.landscapeDone = true;
            this.wantLandscape = false;
          }
        }).catch(() => {});
      }
    } catch {
      /* bỏ qua */
    }
  }

  beginDay = () => {
    if (this.phase !== "dayIntro") return;
    sfx.click();
    this.phase = "playing";
    // Landscape lock removed - game now plays full-screen on any orientation
  };
  nextDay = () => {
    sfx.click();
    this.setupDay(this.dayIdx + 1);
  };
  toMenu = () => {
    sfx.click();
    this.phase = "menu";
    this.mini = null;
    this.pickList = null;
    this.pending = null;
    this.customers = [];
    this.carry = null;
  };
  togglePause = () => {
    if (this.phase === "playing") {
      this.phase = "paused";
      sfx.click();
    } else if (this.phase === "paused") {
      this.phase = "playing";
      this.lastT = performance.now();
      sfx.click();
    }
  };
  toggleMute = () => {
    sfx.setMuted(!sfx.muted);
    sfx.click();
  };

  openCustomize = () => {
    sfx.click();
    this.phase = "customize";
  };
  changeHat = (d: number) => {
    this.chefLook.hat = ((this.chefLook.hat + d) % 10 + 10) % 10;
    saveLook(this.chefLook);
    sfx.plateTap(4);
  };
  changeShirt = (d: number) => {
    this.chefLook.shirt = ((this.chefLook.shirt + d) % 10 + 10) % 10;
    saveLook(this.chefLook);
    sfx.plateTap(6);
  };

  private setupDay(idx: number): void {
    this.dayIdx = clamp(idx, 0, DAYS.length - 1);
    this.cfg = DAYS[this.dayIdx];
    this.dayTime = this.cfg.time;
    this.money = 0;
    this.penalized = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.perfect = 0;
    this.tuyetPham = 0;
    this.missed = 0;
    this.spawnT = 1.4;
    this.customers = [];
    this.particles = [];
    this.mini = null;
    this.pickList = null;
    this.pending = null;
    this.carry = null;
    this.chef = createChef(480, 396);
    this.phase = "dayIntro";
  }

  // ---------------- input ----------------

  private keyDown(e: KeyboardEvent): void {
    const k = e.key;
    if (k === " ") e.preventDefault();
    if (e.repeat) return;
    this.keys.add(k.toLowerCase());
    if (k === "p" || k === "P") {
      this.togglePause();
      return;
    }
    if (k === "Escape") {
      if (this.mini || this.pickList) this.cancelOps();
      else this.togglePause();
      return;
    }
    if (k === "m" || k === "M") {
      this.toggleMute();
      return;
    }
    if (this.phase !== "playing") return;
    if (k === " ") {
      if (this.mini) this.miniAction();
      else this.actNearest();
    }
  }

  private updateCursor(): void {
    this.hoverBtn = false;
    for (const b of this.btns)
      if (this.pointer.x >= b.x && this.pointer.x <= b.x + b.w && this.pointer.y >= b.y && this.pointer.y <= b.y + b.h) {
        this.hoverBtn = true;
        break;
      }
    this.canvas.style.cursor = this.hoverBtn ? "pointer" : this.phase === "playing" ? "crosshair" : "default";
  }

  private pointerDown(p: { x: number; y: number }): void {
    this.pointer = p;
    // Portrait lock disabled - no need to force landscape
    this.updateCursor();
    for (let i = this.btns.length - 1; i >= 0; i--) {
      const b = this.btns[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        b.act();
        return;
      }
    }
    if (this.phase !== "playing") return;
    if (this.pickList) {
      this.pickList = null;
      sfx.click();
      return;
    }
    if (this.mini) {
      const r = this.miniRect();
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) this.miniAction();
      return;
    }
    if (p.y < HUD_H + 10) return;
    for (const s of STATIONS) {
      if (p.x >= s.x - 8 && p.x <= s.x + s.w + 8 && p.y >= 462 && p.y <= H) {
        this.requestStation(s);
        return;
      }
    }
    for (const c of this.customers) {
      if ((c.state === "sit" || c.state === "eat") && dist(p.x, p.y, c.x, c.y + 20) < 56) {
        this.requestServe(c);
        return;
      }
    }
    this.chef.target = { x: clamp(p.x, WALK.x0, WALK.x1), y: clamp(p.y, WALK.y0, WALK.y1) };
    this.pending = null;
  }

  // ---------------- trạm ----------------

  private stationAt(id: string): StationDef {
    return STATIONS.find((s) => s.id === id)!;
  }
  private nearStation(s: StationDef): boolean {
    return dist(this.chef.x, this.chef.y, stationCX(s), INTERACT_Y) < 74;
  }

  private requestStation(s: StationDef): void {
    if (this.nearStation(s)) this.actStation(s);
    else {
      this.pending = { kind: "station", id: s.id };
      this.chef.target = { x: clamp(stationCX(s), WALK.x0, WALK.x1), y: INTERACT_Y - 12 };
    }
  }

  private requestServe(c: Customer): void {
    if (dist(this.chef.x, this.chef.y, c.x, c.y + 84) < 84) this.tryServe(c);
    else {
      this.pending = { kind: "serve", cid: c.id };
      const t = TABLES[c.table];
      this.chef.target = { x: clamp(t.x, WALK.x0, WALK.x1), y: Math.min(t.y + 84, WALK.y1) };
    }
  }

  private actNearest(): void {
    let bestS: StationDef | null = null;
    let bd = 90;
    for (const s of STATIONS) {
      const d = dist(this.chef.x, this.chef.y, stationCX(s), INTERACT_Y);
      if (d < bd) {
        bd = d;
        bestS = s;
      }
    }
    if (bestS) this.actStation(bestS);
  }

  private toast(text: string, color = "#ffd9a0"): void {
    this.spawnText(480, 430, text, color, 16);
  }

  private actStation(s: StationDef): void {
    const tray = this.carry;
    switch (s.kind) {
      case "prep": {
        if (tray) {
          sfx.reject();
          this.toast(tray.stage === 9 ? "Đồ cháy — mang ra THÙNG RÁC đổ trước!" : "Hai tay một món thôi!");
          return;
        }
        this.pickKind = "food";
        this.pickList = this.cfg.dishIds.map((id) => dishById(id));
        sfx.click();
        return;
      }
      case "bar": {
        if (tray) {
          sfx.reject();
          this.toast("Đang cầm đồ — bưng ra bàn trước đã!");
          return;
        }
        this.pickKind = "drink";
        this.pickList = this.cfg.drinkIds.map((id) => dishById(id));
        sfx.click();
        return;
      }
      case "stove":
      case "oven": {
        if (!tray) {
          sfx.reject();
          this.toast("Ra bàn SƠ CHẾ chọn món trước đã!");
          return;
        }
        if (tray.stage === 9) {
          sfx.reject();
          this.toast("Cháy khét rồi — đổ ở THÙNG RÁC!");
          return;
        }
        if (tray.stage !== 0) {
          sfx.reject();
          this.toast(tray.stage === 1 ? "Nấu xong rồi — qua quầy RA MÓN!" : "Món xong rồi — bưng ra bàn thôi!");
          return;
        }
        if (tray.dish.category === "drink") {
          sfx.reject();
          this.toast("Nước pha ở QUẦY NƯỚC!");
          return;
        }
        if (tray.dish.cookAt !== s.kind) {
          sfx.reject();
          this.toast(tray.dish.cookAt === "oven" ? "Món này phải nướng ở LÒ!" : "Món này nấu trên BẾP LỬA!");
          return;
        }
        this.mini = { kind: "cook", dish: tray.dish, burner: s.id, m: 0, dir: 1, bounces: 0 };
        sfx.click();
        return;
      }
      case "pass": {
        if (!tray) {
          sfx.reject();
          this.toast("Chưa có món để trình bày!");
          return;
        }
        if (tray.stage === 9) {
          sfx.reject();
          this.toast("Đồ cháy thì trình bày sao được!");
          return;
        }
        if (tray.stage === 0) {
          sfx.reject();
          this.toast("Phải NẤU chín trước đã!");
          return;
        }
        if (tray.stage === 2) {
          sfx.reject();
          this.toast("Xong rồi — chạm vào khách để bưng ra!");
          return;
        }
        this.mini = { kind: "plate", dish: tray.dish, taps: 0, t: 0 };
        sfx.click();
        return;
      }
      case "trash": {
        if (!tray) {
          sfx.reject();
          this.toast("Thùng rác trống trơn~");
          return;
        }
        this.puff(stationCX(s), 500, 10, tray.stage === 9 ? "#3a3a3a" : "#8a6a4a");
        this.carry = null;
        this.pending = null;
        sfx.dump();
        this.toast("Đã đổ bỏ!");
        return;
      }
    }
  }

  private startPrep(d: Dish): void {
    this.pickList = null;
    const need = dishIngredients(d);
    const pool = ALL_INGREDIENTS.filter((x) => !need.includes(x));
    const decoys: string[] = [];
    while (decoys.length < 2 && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      decoys.push(pool.splice(i, 1)[0]);
    }
    const labels = [...need, ...decoys];
    for (let i = labels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [labels[i], labels[j]] = [labels[j], labels[i]];
    }
    const chips: PrepChip[] = labels.map((label) => ({
      label,
      needed: need.includes(label),
      taken: false,
      shake: 0,
    }));
    this.mini = { kind: "prep", dish: d, chips, added: 0, need: need.length, mistakes: 0 };
    sfx.click();
  }

  private startShake(d: Dish): void {
    this.pickList = null;
    this.mini = { kind: "shake", dish: d, t: 0 };
    sfx.click();
  }

  // ---------------- mini-game ----------------

  private miniRect() {
    return { x: 240, y: 146, w: 480, h: 296 };
  }

  private prepChipRects(m: Extract<Mini, { kind: "prep" }>) {
    const r = this.miniRect();
    const x0 = r.x + 172;
    const y0 = r.y + 132;
    const cw = 88;
    const ch = 33;
    const gx = 7;
    const gy = 7;
    return m.chips.map((_, i) => ({
      x: x0 + (i % 3) * (cw + gx),
      y: y0 + Math.floor(i / 3) * (ch + gy),
      w: cw,
      h: ch,
    }));
  }

  private miniAction(): void {
    const m = this.mini;
    if (!m) return;
    if (m.kind === "prep") {
      const rects = this.prepChipRects(m);
      const p = this.pointer;
      let hit = -1;
      for (let i = 0; i < rects.length; i++) {
        const rc = rects[i];
        if (!m.chips[i].taken && p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h) {
          hit = i;
          break;
        }
      }
      if (hit < 0) return;
      const chip = m.chips[hit];
      const rc = rects[hit];
      const r = this.miniRect();
      const bx = r.x + 88;
      const by = r.y + 168;
      if (chip.needed) {
        chip.taken = true;
        m.added++;
        sfx.prepHit(m.added, m.added === m.need);
        this.sparkle(bx, by - 20, 5, [STAR_GOLD]);
        if (m.added >= m.need) {
          const stars = m.mistakes === 0 ? 3 : m.mistakes === 1 ? 2 : 1;
          this.carry = { dish: m.dish, stage: 0, stars: [stars, 0, 0] };
          this.mini = null;
          sfx.stageDone(stars);
          this.spawnText(480, 300, "★".repeat(stars) + " SƠ CHẾ XONG!", STAR_GOLD, 22);
        }
      } else {
        chip.shake = 0.4;
        m.mistakes++;
        sfx.prepMiss();
        this.flashRed = Math.max(this.flashRed, 0.35);
        this.spawnText(rc.x + rc.w / 2, rc.y - 8, "Không phải!", "#ff8a75", 12);
      }
    } else if (m.kind === "cook") {
      const d = Math.abs(m.m - 0.5);
      const s = STATIONS.find((st) => st.id === m.burner)!;
      this.finishCook(d <= 0.09 ? 3 : d <= 0.22 ? 2 : d <= 0.38 ? 1 : 0, s);
    } else if (m.kind === "plate") {
      m.taps++;
      sfx.plateTap(m.taps);
      this.sparkle(480, 300, 1, ["#ffd23f", "#43d97b", "#ff8a75", "#fff1cf"]);
      if (m.taps >= 8) this.finishPlate(3);
    } else {
      const v = Math.sin(clamp(m.t / 1.55, 0, 1) * Math.PI);
      const d = Math.abs(v - 0.85);
      this.finishShake(d <= 0.08 ? 3 : d <= 0.2 ? 2 : d <= 0.38 ? 1 : 0);
    }
  }

  private finishCook(stars: number, s: StationDef): void {
    const tray = this.carry;
    this.mini = null;
    if (!tray) return;
    const px = stationCX(s);
    if (stars === 0) {
      tray.stage = 9;
      sfx.burn();
      this.shakeMag = Math.max(this.shakeMag, 7);
      this.flashRed = Math.max(this.flashRed, 0.7);
      this.smokeBurst(px, 500, 14);
      this.spawnText(480, 300, "CHÁY KHÉT!!!", "#ff5a45", 26);
      this.toast("Mang ra thùng rác đổ bỏ!", "#ff8a75");
    } else {
      tray.stage = 1;
      tray.stars[1] = stars;
      sfx.cookStop(true);
      sfx.stageDone(stars);
      this.steamBurst(px, 496, 10);
      this.spawnText(480, 300, "★".repeat(stars) + " CHÍN TỚI!", STAR_GOLD, 22);
    }
  }

  private finishPlate(stars: number): void {
    const tray = this.carry;
    this.mini = null;
    if (!tray) return;
    tray.stage = 2;
    tray.stars[2] = stars;
    sfx.stageDone(stars);
    this.flashGreen = Math.max(this.flashGreen, 0.8);
    this.spawnText(480, 300, "★".repeat(stars) + " MÓN HOÀN CHỈNH!", "#8ef0b0", 24);
    this.toast("Chạm vào khách để bưng ra bàn!", "#8ef0b0");
  }

  private finishShake(stars: number): void {
    const m = this.mini;
    this.mini = null;
    if (!m || m.kind !== "shake") return;
    if (stars === 0) {
      sfx.spill();
      this.spawnText(480, 300, "TRÀN MẤT RỒI!", "#ff8a75", 22);
      this.puff(480, 320, 10, m.dish.visual.drink?.liq[0] ?? "#88c0e8");
      return;
    }
    this.carry = { dish: m.dish, stage: 2, stars: [stars, stars, stars] };
    sfx.pour();
    sfx.stageDone(stars);
    this.spawnText(480, 300, "★".repeat(stars) + " NƯỚC XONG!", "#8ef0e6", 22);
  }

  private updateMini(dt: number): void {
    const m = this.mini;
    if (!m) return;
    if (m.kind === "prep") {
      for (const c of m.chips) if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
    } else if (m.kind === "cook") {
      m.m += m.dir * this.cfg.cookSpeed * dt;
      if (m.m >= 1 || m.m <= 0) {
        m.m = clamp(m.m, 0, 1);
        m.dir *= -1;
        m.bounces++;
        if (m.bounces >= 6) {
          const s = STATIONS.find((st) => st.id === m.burner)!;
          this.finishCook(0, s);
        }
      }
    } else if (m.kind === "plate") {
      m.t += dt;
      if (m.t >= 2.3) this.finishPlate(m.taps >= 5 ? 2 : 1);
    } else {
      m.t += dt * 1.55;
      if (m.t >= 1.55) this.finishShake(1);
    }
  }

  // ---------------- phục vụ ----------------

  private tryServe(c: Customer): void {
    const t = this.carry;
    if (!t) {
      sfx.reject();
      c.dialog = { text: "Món của tôi đâu?", t: 1.4, color: "#ffe28a" };
      this.toast("Tay không sao bưng! Đi nấu món đã.");
      return;
    }
    if (t.stage === 9) {
      sfx.reject();
      this.toast("Đừng bưng đồ cháy cho khách!!", "#ff8a75");
      return;
    }
    if (t.stage !== 2) {
      sfx.reject();
      this.toast(t.stage === 0 ? "Món chưa nấu chín!" : "Chưa trình bày xong!");
      return;
    }
    const pf = clamp(c.patience / c.maxPatience, 0, 1);

    if (t.dish.category === "drink") {
      if (!c.drink) {
        sfx.reject();
        c.dialog = { text: "Tôi có gọi nước đâu?", t: 1.4, color: "#ffe28a" };
        return;
      }
      if (c.gotDrink) {
        sfx.reject();
        c.dialog = { text: "Đủ nước rồi!", t: 1.2, color: "#ffe28a" };
        return;
      }
      if (c.drink.id !== t.dish.id) {
        sfx.reject();
        c.dialog = { text: "Không phải nước này…", t: 1.4, color: "#ff8a75" };
        c.patience -= c.maxPatience * 0.08;
        return;
      }
      const s = t.stars[0];
      const gain = Math.round((t.dish.price * (0.8 + 0.2 * s) * (1 + pf * 0.2)) / 1000) * 1000;
      this.money += gain;
      this.totalMoney += gain;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      c.gotDrink = true;
      c.dialog = { text: pick(DRINK_LINES), t: 1.5, color: "#8ef0e6" };
      this.carry = null;
      this.pending = null;
      sfx.pour();
      this.spawnText(c.x, c.y - 70, "+" + fmtDong(gain), "#8ef0e6", 17);
      this.sparkle(c.x, c.y + 13, 8, ["#2ec4b6", "#8ef0e6", "#fff1cf"]);
      this.moneyFly(c.x, c.y - 30);
      return;
    }

    if (c.gotFood) {
      sfx.reject();
      c.dialog = { text: "No rồi chef ơi!", t: 1.3, color: "#ffe28a" };
      return;
    }
    if (c.dish.id !== t.dish.id) {
      sfx.burn();
      this.shakeMag = Math.max(this.shakeMag, 6);
      this.flashRed = Math.max(this.flashRed, 0.5);
      c.patience -= c.maxPatience * 0.35;
      c.dialog = { text: pick(WRONG_LINES), t: 1.6, color: "#ff8a75" };
      this.combo = 0;
      this.spawnText(c.x, c.y - 60, "SAI MÓN!", "#ff5a45", 20);
      this.carry = null;
      this.pending = null;
      this.puff(c.x, c.y + 30, 8, "#a8825a");
      if (c.patience <= 0) this.expire(c);
      return;
    }

    const [p0, p1, p2] = t.stars;
    const avg = (p0 + p1 + p2) / 3;
    const qualMul = 0.75 + avg * 0.2;
    const comboMul = 1 + Math.min(this.combo, 10) * 0.1;
    let gain = Math.round((t.dish.price * qualMul * (1 + pf * 0.5) * comboMul) / 1000) * 1000;
    const isPerfectDish = avg >= 3;
    if (isPerfectDish) {
      gain = Math.round((gain * 1.15) / 1000) * 1000;
      this.tuyetPham++;
    }
    this.money += gain;
    this.totalMoney += gain;
    this.served++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    c.gotFood = true;
    c.state = "eat";
    c.eatT = c.drink && !c.gotDrink ? 6 : 1.6;
    c.happy = true;
    c.dialog = { text: pick(HAPPY_LINES), t: 1.5, color: "#ffe28a" };
    this.carry = null;
    this.pending = null;
    sfx.serve(this.combo);
    this.flashGreen = Math.max(this.flashGreen, 0.7);
    this.spawnText(c.x, c.y - 70, "+" + fmtDong(gain), STAR_GOLD, 21);
    if (isPerfectDish) this.spawnText(c.x, c.y - 100, "TUYỆT PHẨM 3 SAO!", "#ffe9a8", 15);
    this.sparkle(c.x, c.y + 10, 14, ["#ffd23f", "#ff4b3e", "#43d97b", "#fff1cf"]);
    for (let i = 0; i < 3; i++) this.heart(c.x, c.y - 40 - i * 8);
    this.moneyFly(c.x, c.y - 30);
    if (pf > 0.6) {
      const tip = Math.round((t.dish.price * 0.25 * c.type.tipMul) / 1000) * 1000;
      this.money += tip;
      this.totalMoney += tip;
      this.perfect++;
      this.spawnText(c.x, c.y - 44, pick(TIP_LINES) + " +" + fmtK(tip), "#8ef0b0", 13);
      sfx.tip();
    }
    if (this.combo > 1 && this.combo % 5 === 0) {
      this.spawnText(480, 250, "COMBO x" + this.combo + "!", "#ff8a4a", 30);
      this.shakeMag = Math.max(this.shakeMag, 4);
    }
  }

  // ---------------- khách ----------------

  private trySpawn(): void {
    const free: number[] = [];
    for (let i = 0; i < this.cfg.tables; i++) {
      if (!this.customers.some((c) => c.table === i)) free.push(i);
    }
    if (free.length === 0) return;
    const table = pick(free);
    const dish = dishById(pick(this.cfg.dishIds));
    const drink = Math.random() < this.cfg.drinkChance ? dishById(pick(this.cfg.drinkIds)) : null;
    const type = pick(CUSTOMER_TYPES);
    const maxPatience = this.cfg.patience * type.patienceMul * dishPatienceFactor(dish);
    const seat = seatOf(TABLES[table]);
    this.customers.push(
      spawnCustomer(this.nextId++, table, dish, drink, maxPatience, DOOR, seat)
    );
  }

  private expire(c: Customer): void {
    if (c.state === "leave") return;
    c.state = "leave";
    c.happy = false;
    c.dialog = { text: pick(ANGRY_LINES), t: 1.8, color: "#ff6b5e" };
    this.missed++;
    this.combo = 0;
    const penalty = Math.round((c.dish.price * PENALTY_RATE) / 1000) * 1000;
    this.money = Math.max(0, this.money - penalty);
    this.totalMoney = Math.max(0, this.totalMoney - penalty);
    this.penalized += penalty;
    this.spawnText(c.x, c.y - 92, "PHẠT -" + fmtDong(penalty), "#ff5a45", 16);
    this.shakeMag = Math.max(this.shakeMag, 8);
    this.flashRed = Math.max(this.flashRed, 1);
    sfx.walkout();
    this.puff(c.x, c.y, 8, "#ff5a45");
    this.anger(c.x, c.y - 60);
    this.anger(c.x - 20, c.y - 44);
    this.anger(c.x + 20, c.y - 44);
    if (this.pending?.kind === "serve" && this.pending.cid === c.id) this.pending = null;
  }

  private updateCustomers(dt: number, full: boolean): void {
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      const seat = seatOf(TABLES[c.table]);
      const res = updateCustomer(c, dt, seat, DOOR, full);
      if (res === "expired") {
        this.expire(c);
        if (this.phase !== "playing") return;
      } else if (res === "gone") {
        this.customers.splice(i, 1);
      } else if (full && c.state === "sit" && !c.gotFood && c.patience < c.maxPatience * 0.25) {
        if (Math.random() < dt * 0.9) this.anger(c.x + rand(-14, 14), c.y - 58);
      }
    }
  }

  // ---------------- vòng lặp ----------------

  private tick(t: number): void {
    if (this.destroyed) return;
    const dt = clamp((t - this.lastT) / 1000, 0, 0.05);
    this.lastT = t;
    try {
      this.update(dt);
    } catch (err) {
      if (!this.errGuard) {
        this.errGuard = true;
        console.error("[hqv] update:", err);
      }
    }
    try {
      this.draw();
    } catch (err) {
      if (!this.errGuard) {
        this.errGuard = true;
        console.error("[hqv] draw:", err);
      }
    }
    this.raf = requestAnimationFrame((tt) => this.tick(tt));
  }

  private update(dt: number): void {
    this.clock += dt;
    // Portrait lock disabled - game runs in any orientation
    this.shakeMag *= Math.exp(-7 * dt);
    if (this.shakeMag < 0.05) this.shakeMag = 0;
    this.flashRed = Math.max(0, this.flashRed - dt * 2.2);
    this.flashGreen = Math.max(0, this.flashGreen - dt * 2.2);
    this.updateParticles(dt);
    this.updateAmbient(dt);

    this.steamAcc += dt;
    if (this.steamAcc > 0.22 && this.phase === "playing") {
      this.steamAcc = 0;
      this.emitSteam((Math.random() < 0.5 ? 233 : 324) + rand(-10, 10), 508);
      const t = this.carry;
      if (t && t.dish.category === "food" && (t.stage === 1 || t.stage === 2)) {
        this.emitSteam(this.chef.x + this.chef.dir * 24 + rand(-6, 6), this.chef.y - 22);
      }
    }
    if (this.phase === "victory") {
      this.confettiAcc += dt;
      if (this.confettiAcc > 0.09) {
        this.confettiAcc = 0;
        for (let i = 0; i < 3; i++) this.emitConfetti();
      }
    }

    const ambient = this.phase === "gameover" || this.phase === "victory" || this.phase === "dayEnd";
    if (ambient) {
      this.updateCustomers(dt, false);
      return;
    }
    if (this.phase !== "playing") return;

    // đầu bếp: phím hoặc chạm
    let kx = 0;
    let ky = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) kx -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) kx += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) ky -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) ky += 1;
    this.chef.moving = false;
    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      this.chef.x = clamp(this.chef.x + (kx / len) * 260 * dt, WALK.x0, WALK.x1);
      this.chef.y = clamp(this.chef.y + (ky / len) * 260 * dt, WALK.y0, WALK.y1);
      if (kx !== 0) this.chef.dir = kx > 0 ? 1 : -1;
      this.chef.target = null;
      this.chef.moving = true;
    } else if (this.chef.target) {
      const arrived = stepChefToward(this.chef, 265, dt, WALK);
      if (arrived && this.pending) {
        const pd = this.pending;
        this.pending = null;
        if (pd.kind === "station") this.actStation(this.stationAt(pd.id));
        else {
          const c = this.customers.find((cc) => cc.id === pd.cid);
          if (c && (c.state === "sit" || c.state === "eat")) this.tryServe(c);
        }
      }
    }
    if (this.chef.moving) this.chef.walkT += dt * 11;

    this.dayTime -= dt;
    if (this.dayTime <= 0) {
      this.dayTime = 0;
      this.mini = null;
      this.pickList = null;
      this.endDay();
      return;
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = rand(this.cfg.spawnMin, this.cfg.spawnMax);
      this.trySpawn();
    }

    this.updateCustomers(dt, true);
    if (this.phase !== "playing") return;
    this.updateMini(dt);
  }

  private endDay(): void {
    if (this.money >= this.cfg.goal) {
      this.saveBest();
      if (this.dayIdx >= DAYS.length - 1) {
        this.phase = "victory";
        sfx.victory();
      } else {
        this.phase = "dayEnd";
        sfx.dayEnd();
      }
    } else {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.phase = "gameover";
    this.mini = null;
    this.pickList = null;
    this.pending = null;
    this.saveBest();
    sfx.gameover();
  }

  private saveBest(): void {
    try {
      if (this.totalMoney > this.best) {
        this.best = this.totalMoney;
        localStorage.setItem("hqv-best", String(this.best));
      }
    } catch {
      /* bỏ qua */
    }
  }

  private stats(): StatsPayload {
    return {
      day: this.cfg.day,
      money: this.money,
      goal: this.cfg.goal,
      served: this.served,
      perfect: this.perfect,
      tuyetPham: this.tuyetPham,
      missed: this.missed,
      bestCombo: this.bestCombo,
      totalMoney: this.totalMoney,
      penalized: this.penalized,
      goalReached: this.money >= this.cfg.goal,
    };
  }

  // ---------------- hạt ----------------

  private emit(p: Particle): void {
    if (this.particles.length < 420) this.particles.push(p);
    else this.pPool.push(p);
  }
  private getP(): Particle {
    const p = this.pPool.pop();
    if (p) return p;
    return { kind: "spark", x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1, size: 2, color: "#fff" };
  }
  private resetP(p: Particle): void {
    p.text = undefined;
    p.tx = undefined;
    p.ty = undefined;
    p.rot = undefined;
    p.vr = undefined;
    p.fontSize = undefined;
  }
  private puff(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      const p = this.getP();
      this.resetP(p);
      p.kind = "puff";
      p.x = x + rand(-22, 22);
      p.y = y + rand(-14, 14);
      p.vx = rand(-60, 60);
      p.vy = rand(-100, -25);
      p.life = p.maxLife = rand(0.4, 0.8);
      p.size = rand(5, 11);
      p.color = color;
      this.emit(p);
    }
  }
  private sparkle(x: number, y: number, n: number, colors: string[]): void {
    for (let i = 0; i < n; i++) {
      const p = this.getP();
      this.resetP(p);
      p.kind = "spark";
      p.x = x + rand(-26, 26);
      p.y = y + rand(-12, 12);
      p.vx = rand(-150, 150);
      p.vy = rand(-250, -60);
      p.life = p.maxLife = rand(0.45, 0.85);
      p.size = rand(2, 4.5);
      p.color = pick(colors);
      this.emit(p);
    }
  }
  private smokeBurst(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.getP();
      this.resetP(p);
      p.kind = "smoke";
      p.x = x + rand(-20, 20);
      p.y = y;
      p.vx = rand(-30, 30);
      p.vy = rand(-90, -40);
      p.life = p.maxLife = rand(0.7, 1.4);
      p.size = rand(7, 14);
      p.color = "#4a4a4a";
      this.emit(p);
    }
  }
  private steamBurst(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) this.emitSteam(x + rand(-24, 24), y);
  }
  private emitSteam(x: number, y: number): void {
    const p = this.getP();
    this.resetP(p);
    p.kind = "steam";
    p.x = x;
    p.y = y;
    p.vx = rand(-8, 8);
    p.vy = rand(-46, -28);
    p.life = p.maxLife = rand(0.8, 1.4);
    p.size = rand(4, 8);
    p.color = "#ffffff";
    this.emit(p);
  }
  private heart(x: number, y: number): void {
    const p = this.getP();
    this.resetP(p);
    p.kind = "heart";
    p.x = x + rand(-14, 14);
    p.y = y;
    p.vx = rand(-14, 14);
    p.vy = rand(-70, -45);
    p.life = p.maxLife = rand(0.7, 1.1);
    p.size = rand(5, 8);
    p.color = "#ff5a78";
    this.emit(p);
  }
  private anger(x: number, y: number): void {
    const p = this.getP();
    this.resetP(p);
    p.kind = "anger";
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = -26;
    p.life = p.maxLife = 0.7;
    p.size = 9;
    p.color = "#ff5a45";
    this.emit(p);
  }
  private moneyFly(x: number, y: number): void {
    const p = this.getP();
    this.resetP(p);
    p.kind = "money";
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.life = p.maxLife = 0.6;
    p.size = 10;
    p.color = C.goldLt;
    p.tx = 480;
    p.ty = 22;
    this.emit(p);
  }
  private emitConfetti(): void {
    const p = this.getP();
    this.resetP(p);
    p.kind = "confetti";
    p.x = rand(0, W);
    p.y = -10;
    p.vx = rand(-40, 40);
    p.vy = rand(60, 170);
    p.life = p.maxLife = rand(2, 3.2);
    p.size = rand(5, 9);
    p.color = pick(["#ffd23f", "#ff4b3e", "#43d97b", "#2ec4b6", "#fff1cf", "#ff8a4a"]);
    p.rot = rand(0, 6);
    p.vr = rand(-6, 6);
    this.emit(p);
  }
  private spawnText(x: number, y: number, text: string, color: string, fontSize: number): void {
    const p = this.getP();
    this.resetP(p);
    p.kind = "text";
    p.x = clamp(x, 90, W - 90);
    p.y = y;
    p.vx = 0;
    p.vy = -44;
    p.life = p.maxLife = 1.3;
    p.size = fontSize;
    p.color = color;
    p.text = text;
    p.fontSize = fontSize;
    this.emit(p);
  }

  private updateParticles(dt: number): void {
    let w = 0;
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0 || p.y > H + 40) {
        this.pPool.push(p);
        continue;
      }
      if (p.kind === "money" && p.tx !== undefined && p.ty !== undefined) {
        const k = 1 - p.life / p.maxLife;
        const e = k * k;
        p.x += (p.tx - p.x) * Math.min(1, dt * (4 + e * 14));
        p.y += (p.ty - p.y) * Math.min(1, dt * (4 + e * 14));
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (p.kind === "spark" || p.kind === "confetti") {
        p.vy += (p.kind === "confetti" ? 150 : 620) * dt;
        if (p.rot !== undefined && p.vr !== undefined) p.rot += p.vr * dt;
      }
      if (p.kind === "steam" || p.kind === "smoke") {
        p.vy -= 10 * dt;
        p.x += Math.sin(this.clock * 3 + p.y * 0.05) * 0.4;
      }
      ps[w++] = p;
    }
    ps.length = w;
    if (ps.length > 420) {
      for (let i = 0; i < ps.length - 420; i++) this.pPool.push(ps[i]);
      ps.splice(0, ps.length - 420);
    }
  }

  // ---------------- ambient ----------------

  private updateAmbient(dt: number): void {
    const cat = this.cat;
    cat.tail += dt * 6;
    if (cat.mode === "wait") {
      cat.t -= dt;
      if (cat.t <= 0) {
        cat.mode = "walk";
        cat.dir = Math.random() < 0.5 ? 1 : -1;
        cat.x = cat.dir === 1 ? -50 : W + 50;
        cat.y = rand(415, 445);
      }
    } else if (cat.mode === "walk") {
      cat.x += cat.dir * 55 * dt;
      if (Math.random() < dt * 0.25) {
        cat.mode = "pause";
        cat.t = rand(1, 2.4);
      }
      if (cat.x < -70 || cat.x > W + 70) {
        cat.mode = "wait";
        cat.t = rand(6, 14);
      }
    } else {
      cat.t -= dt;
      if (cat.t <= 0) cat.mode = "walk";
    }
    const mo = this.moto;
    if (!mo.on) {
      mo.t -= dt;
      if (mo.t <= 0) {
        mo.on = true;
        mo.dir = Math.random() < 0.5 ? 1 : -1;
        mo.x = mo.dir === 1 ? -160 : W + 160;
      }
    } else {
      mo.x += mo.dir * 340 * dt;
      if ((mo.dir === 1 && mo.x > W + 180) || (mo.dir === -1 && mo.x < -180)) {
        mo.on = false;
        mo.t = rand(12, 22);
      }
    }
  }

  private drawAmbient(ctx: CanvasRenderingContext2D): void {
    const t = this.clock;
    // dây đèn lấp lánh
    for (let i = 0; i < this.twk.length; i++) {
      const w = this.twk[i];
      const tt = i / 13;
      const lx = tt * W;
      const ly = 66 + Math.sin(Math.PI * tt) * 16 + 5;
      const a = 0.35 + 0.35 * Math.sin(t * w.sp + w.ph);
      ctx.fillStyle = `rgba(255,236,150,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(lx, ly, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // đèn lồng
    for (const [lx0, ph] of [[80, 0], [880, 1.7]] as [number, number][]) {
      const sw = Math.sin(t * 1.3 + ph) * 0.09;
      ctx.save();
      ctx.translate(lx0, 0);
      ctx.rotate(sw);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 42);
      ctx.stroke();
      const glow = ctx.createRadialGradient(0, 66, 4, 0, 66, 42);
      glow.addColorStop(0, "rgba(255,120,60,0.5)");
      glow.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 66, 42, 0, Math.PI * 2);
      ctx.fill();
      const lg = ctx.createRadialGradient(-6, 58, 4, 0, 66, 26);
      lg.addColorStop(0, "#ff7a4a");
      lg.addColorStop(1, "#c22b1e");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(0, 66, 20, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d9a441";
      rr(ctx, -9, 38, 18, 6, 3);
      ctx.fill();
      rr(ctx, -9, 88, 18, 6, 3);
      ctx.fill();
      ctx.restore();
    }
    // xe máy
    if (this.moto.on) {
      const mo = this.moto;
      ctx.save();
      ctx.globalAlpha = 0.9;
      const beam = ctx.createLinearGradient(mo.x, 0, mo.x + mo.dir * 120, 0);
      beam.addColorStop(0, "rgba(255,240,180,0.28)");
      beam.addColorStop(1, "rgba(255,240,180,0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(mo.x, 88);
      ctx.lineTo(mo.x + mo.dir * 120, 78);
      ctx.lineTo(mo.x + mo.dir * 120, 112);
      ctx.lineTo(mo.x, 104);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0d1826";
      ctx.beginPath();
      ctx.ellipse(mo.x - mo.dir * 8, 100, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mo.x - mo.dir * 26, 104, 8, 0, Math.PI * 2);
      ctx.arc(mo.x + mo.dir * 12, 104, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(mo.x - mo.dir * 2, 86, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mo.x - mo.dir * 2, 74, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(mo.x + mo.dir * 20, 96, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.drawCat(ctx);
  }

  private drawCat(ctx: CanvasRenderingContext2D): void {
    const c = this.cat;
    if (c.mode === "wait" && c.x < -40) return;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.dir, 1);
    const step = c.mode === "walk" ? Math.sin(c.tail * 2) * 2 : 0;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6a4a";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.quadraticCurveTo(-22, -2 + Math.sin(c.tail) * 4, -24, -10 + Math.sin(c.tail) * 3);
    ctx.stroke();
    ctx.fillStyle = "#a8825a";
    ctx.beginPath();
    ctx.ellipse(0, 2 + step * 0.3, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13, -6 + step * 0.2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -11);
    ctx.lineTo(10, -17);
    ctx.lineTo(13, -12);
    ctx.closePath();
    ctx.moveTo(15, -12);
    ctx.lineTo(18, -17);
    ctx.lineTo(19, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath();
    ctx.arc(15, -7, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------------- nền ----------------

  private buildBackground(): void {
    const cv = makeCanvas(W * 3, H * 3);
    const c = cv.getContext("2d");
    if (!c) return;
    c.scale(3, 3);

    c.fillStyle = "#152740";
    c.fillRect(0, 0, W, H);
    for (let ty = 120; ty < 470; ty += 46) {
      for (let tx = 0; tx < W; tx += 46) {
        if (((tx / 46) + (ty / 46)) % 2 === 0) {
          c.fillStyle = "rgba(255,255,255,0.022)";
          c.fillRect(tx, ty, 46, 46);
        }
      }
    }
    c.strokeStyle = "rgba(0,0,0,0.14)";
    c.lineWidth = 1;
    for (let ty = 120; ty <= 470; ty += 46) {
      c.beginPath();
      c.moveTo(0, ty);
      c.lineTo(W, ty);
      c.stroke();
    }
    for (let tx = 0; tx <= W; tx += 46) {
      c.beginPath();
      c.moveTo(tx, 120);
      c.lineTo(tx, 470);
      c.stroke();
    }

    const wg = c.createLinearGradient(0, 0, 0, 120);
    wg.addColorStop(0, "#0a1830");
    wg.addColorStop(1, "#10253e");
    c.fillStyle = wg;
    c.fillRect(0, 0, W, 120);
    c.fillStyle = "#1d3a5c";
    c.fillRect(0, 112, W, 8);
    for (const wx of [150, 480, 810]) {
      c.fillStyle = "rgba(255,190,110,0.13)";
      rr(c, wx - 46, 62, 92, 42, 6);
      c.fill();
      c.strokeStyle = "#27476b";
      c.lineWidth = 3;
      rr(c, wx - 46, 62, 92, 42, 6);
      c.stroke();
      c.beginPath();
      c.moveTo(wx, 62);
      c.lineTo(wx, 104);
      c.stroke();
    }
    c.strokeStyle = "rgba(255,255,255,0.08)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(0, 66);
    c.quadraticCurveTo(W / 2, 84, W, 66);
    c.stroke();
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const lx = t * W;
      const ly = 66 + Math.sin(Math.PI * t) * 16;
      c.fillStyle = i % 3 === 0 ? "#ffd23f" : i % 3 === 1 ? "#ff6a45" : "#2ec4b6";
      c.globalAlpha = 0.75;
      c.beginPath();
      c.arc(lx, ly + 5, 3, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }

    // thảm cửa
    c.fillStyle = "rgba(46,196,182,0.16)";
    rr(c, DOOR.x - 44, DOOR.y - 16, 88, 46, 10);
    c.fill();
    c.strokeStyle = "rgba(46,196,182,0.4)";
    c.lineWidth = 2;
    rr(c, DOOR.x - 44, DOOR.y - 16, 88, 46, 10);
    c.stroke();
    c.fillStyle = "#2ec4b6";
    c.font = `9px ${F_D}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("CỬA", DOOR.x, DOOR.y + 7);

    // quầy dưới
    const cg = c.createLinearGradient(0, 470, 0, 640);
    cg.addColorStop(0, "#7c4a22");
    cg.addColorStop(1, "#5d3717");
    c.fillStyle = cg;
    c.fillRect(0, 470, W, 170);
    c.strokeStyle = "rgba(0,0,0,0.25)";
    c.lineWidth = 2;
    for (let x = 60; x < W; x += 96) {
      c.beginPath();
      c.moveTo(x, 486);
      c.lineTo(x, 640);
      c.stroke();
    }
    c.fillStyle = "#9c6231";
    c.fillRect(0, 462, W, 14);
    c.fillStyle = "rgba(255,220,160,0.4)";
    c.fillRect(0, 462, W, 3);

    // SƠ CHẾ
    c.fillStyle = "#a9b8c8";
    rr(c, 44, 480, 132, 96, 10);
    c.fill();
    c.fillStyle = "#c9974f";
    rr(c, 58, 498, 70, 50, 8);
    c.fill();
    c.fillStyle = "#dfe8f0";
    c.beginPath();
    c.moveTo(140, 500);
    c.lineTo(168, 512);
    c.lineTo(140, 522);
    c.closePath();
    c.fill();
    // BẾP
    c.fillStyle = "#2b3540";
    rr(c, 195, 480, 167, 96, 10);
    c.fill();
    for (const bx of [233, 324]) {
      c.fillStyle = "#1a2027";
      c.beginPath();
      c.arc(bx, 530, 30, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#55697d";
      c.beginPath();
      c.arc(bx, 528, 20, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#c9803a";
      c.beginPath();
      c.arc(bx, 528, 15, 0, Math.PI * 2);
      c.fill();
    }
    // LÒ
    c.fillStyle = "#7d8a97";
    rr(c, 385, 480, 104, 96, 10);
    c.fill();
    c.fillStyle = "#222a33";
    rr(c, 396, 500, 82, 48, 6);
    c.fill();
    c.fillStyle = "rgba(255,140,40,0.25)";
    rr(c, 396, 500, 82, 48, 6);
    c.fill();
    // RA MÓN
    c.fillStyle = "#a9b8c8";
    rr(c, 516, 480, 112, 96, 10);
    c.fill();
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i === 2 ? "#f5f0e4" : "#e0d9c8";
      c.beginPath();
      c.ellipse(548, 540 - i * 7, 24, 8, 0, 0, Math.PI * 2);
      c.fill();
    }
    // QUẦY NƯỚC
    c.fillStyle = "#5d3717";
    rr(c, 651, 480, 132, 96, 10);
    c.fill();
    const bottleCols = ["#7ab854", "#f0a050", "#8a5a33", "#e8d060", "#d63a2e"];
    bottleCols.forEach((col, i) => {
      const bx = 668 + i * 24;
      c.fillStyle = col;
      rr(c, bx, 502, 12, 26, 4);
      c.fill();
      c.fillStyle = "#f2ead8";
      rr(c, bx + 3, 496, 6, 8, 2);
      c.fill();
    });
    // THÙNG RÁC
    c.fillStyle = "#274b46";
    rr(c, 806, 486, 110, 90, 10);
    c.fill();
    c.fillStyle = "#35625b";
    rr(c, 800, 478, 122, 16, 8);
    c.fill();

    // nhãn trạm
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `12px ${F_D}`;
    const labels: [string, number][] = [
      ["SƠ CHẾ", 110], ["BẾP LỬA", 278], ["LÒ NƯỚNG", 437],
      ["RA MÓN", 572], ["QUẦY NƯỚC", 717], ["THÙNG RÁC", 861],
    ];
    for (const [txt, x] of labels) {
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillText(txt, x + 1, 615);
      c.fillStyle = "#ffd9a0";
      c.fillText(txt, x, 614);
    }

    // bàn ăn
    for (const t of TABLES) {
      c.fillStyle = "rgba(0,0,0,0.3)";
      c.beginPath();
      c.ellipse(t.x + 4, t.y + 6, 50, 46, 0, 0, Math.PI * 2);
      c.fill();
      for (const gy of [-56, 56]) {
        c.fillStyle = "#7a4f26";
        c.beginPath();
        c.arc(t.x, t.y + gy, 15, 0, Math.PI * 2);
        c.fill();
      }
      const tg = c.createRadialGradient(t.x - 12, t.y - 12, 8, t.x, t.y, 46);
      tg.addColorStop(0, "#b5824a");
      tg.addColorStop(1, "#8a5c2c");
      c.fillStyle = tg;
      c.beginPath();
      c.arc(t.x, t.y, 44, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#6e4a22";
      c.lineWidth = 4;
      c.beginPath();
      c.arc(t.x, t.y, 44, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#e5322d";
      c.beginPath();
      c.arc(t.x - 8, t.y, 5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#43d97b";
      c.beginPath();
      c.arc(t.x + 8, t.y, 5, 0, Math.PI * 2);
      c.fill();
    }

    this.bg = cv;
  }

  // ---------------- vẽ ----------------

  private popScale(): number {
    const t = clamp((this.clock - this.phaseStart) / 0.3, 0, 1);
    return 0.9 + 0.1 * easeOutBack(t);
  }

  private draw(): void {
    const ctx = this.ctx;
    this.btns.length = 0;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.shakeMag > 0) ctx.translate(rand(-1, 1) * this.shakeMag, rand(-1, 1) * this.shakeMag);

    // Scale to fit the canvas while maintaining game aspect ratio
    const scaleX = window.innerWidth / W;
    const scaleY = window.innerHeight / H;
    const scale = Math.max(scaleX, scaleY);
    ctx.scale(scale, scale);

    ctx.fillStyle = "#152740";
    ctx.fillRect(0, 0, W, H);
    if (this.bg) ctx.drawImage(this.bg, 0, 0, W, H);

    this.drawAmbient(ctx);
    this.drawStationFx(ctx);
    this.drawTableFx(ctx);
    this.drawCustomers(ctx);
    this.drawChef(ctx);
    this.drawParticles(ctx);

    if (this.flashRed > 0) {
      ctx.fillStyle = `rgba(255,60,40,${(this.flashRed * 0.16).toFixed(3)})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    if (this.flashGreen > 0) {
      ctx.fillStyle = `rgba(90,230,140,${(this.flashGreen * 0.08).toFixed(3)})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    // đom đóm
    for (let i = 0; i < 6; i++) {
      const fx = 120 + i * 140 + Math.sin(this.clock * 0.4 + i * 2.1) * 60;
      const fy = 300 + Math.cos(this.clock * 0.5 + i * 1.7) * 110;
      const a = 0.2 + 0.2 * Math.sin(this.clock * 2.4 + i * 2);
      ctx.fillStyle = `rgba(255,225,120,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.phase === "playing") {
      this.drawPick(ctx);
      this.drawMini(ctx);
    }
    this.drawHUD(ctx);

    if (this.phase !== this.lastPhase) {
      this.lastPhase = this.phase;
      this.phaseStart = this.clock;
    }
    const isOverlay = this.phase !== "playing";
    const pop = this.popScale();
    if (isOverlay && pop < 1) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(pop, pop);
      ctx.translate(-W / 2, -H / 2);
    }
    if (this.phase === "menu") this.drawMenu(ctx);
    else if (this.phase === "customize") this.drawCustomize(ctx);
    else if (this.phase === "dayIntro") this.drawDayIntro(ctx);
    else if (this.phase === "paused") this.drawPaused(ctx);
    else if (this.phase === "dayEnd") this.drawDayEnd(ctx);
    else if (this.phase === "gameover") this.drawGameOver(ctx);
    else if (this.phase === "victory") this.drawVictory(ctx);
    if (isOverlay && pop < 1) ctx.restore();

    if (this.portraitLocked) this.drawPortraitBlock(ctx);
    this.updateCursor();
  }

  private drawStationFx(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== "playing") return;
    for (const s of STATIONS) {
      const cx = stationCX(s);
      const hov = this.pointer.x >= s.x - 8 && this.pointer.x <= s.x + s.w + 8 && this.pointer.y >= 462;
      if (hov) {
        ctx.strokeStyle = "rgba(255,210,63,0.8)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -this.clock * 24;
        rr(ctx, s.x - 4, 476, s.w + 8, 106, 12);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (this.nearStation(s)) {
        const label = this.actionLabel(s);
        ctx.font = `700 11.5px ${F_B}`;
        const tw = ctx.measureText(label).width + 18;
        const by = 452 + Math.sin(this.clock * 5) * 3;
        ctx.fillStyle = "rgba(10,22,40,0.92)";
        rr(ctx, cx - tw / 2, by - 12, tw, 22, 11);
        ctx.fill();
        ctx.strokeStyle = "#ffd23f";
        ctx.lineWidth = 1.5;
        rr(ctx, cx - tw / 2, by - 12, tw, 22, 11);
        ctx.stroke();
        ctx.fillStyle = "#ffd23f";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, cx, by);
      }
      if (this.mini?.kind === "cook" && this.mini.burner === s.id) {
        if (s.kind === "oven") {
          const a = 0.3 + 0.25 * Math.sin(this.clock * 12);
          ctx.fillStyle = `rgba(255,140,40,${a.toFixed(3)})`;
          rr(ctx, 396, 500, 82, 48, 6);
          ctx.fill();
        } else {
          for (let i = 0; i < 5; i++) {
            const fx = cx - 20 + i * 10 + Math.sin(this.clock * 17 + i * 2) * 2.5;
            const fh = 12 + Math.sin(this.clock * 21 + i * 1.7) * 4;
            ctx.fillStyle = i % 2 ? "#ff8c28" : "#ffd23f";
            ctx.beginPath();
            ctx.moveTo(fx - 4, 554);
            ctx.quadraticCurveTo(fx, 554 - fh, fx + 4, 554);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  }

  private actionLabel(s: StationDef): string {
    const t = this.carry;
    switch (s.kind) {
      case "prep":
        return t ? (t.stage === 9 ? "ĐANG CẦM ĐỒ CHÁY!" : "ĐANG CẦM MÓN") : "CHỌN MÓN";
      case "bar":
        return t ? (t.dish.category === "drink" ? "NƯỚC XONG RỒI" : "ĐANG CẦM MÓN") : "PHA NƯỚC";
      case "stove":
      case "oven":
        if (!t) return "CẦN MÓN ĐỂ NẤU";
        if (t.stage === 9) return "ĐỒ CHÁY!";
        if (t.stage === 0)
          return t.dish.cookAt === s.kind
            ? "NẤU " + t.dish.name.toUpperCase()
            : t.dish.cookAt === "oven" ? "CẦN LÒ NƯỚNG" : "CẦN BẾP LỬA";
        return t.stage === 1 ? "ĐÃ NẤU XONG" : "MÓN XONG RỒI";
      case "pass":
        if (!t) return "CHƯA CÓ MÓN";
        if (t.stage === 1) return "TRÌNH BÀY " + t.dish.name.toUpperCase();
        if (t.stage === 2) return "BƯNG RA BÀN!";
        return t.stage === 0 ? "NẤU TRƯỚC ĐÃ" : "ĐỒ CHÁY!";
      case "trash":
        return t ? "ĐỔ BỎ" : "THÙNG RÁC";
    }
  }

  private drawTableFx(ctx: CanvasRenderingContext2D): void {
    for (let i = this.cfg.tables; i < TABLES.length; i++) {
      const t = TABLES[i];
      ctx.fillStyle = "rgba(8,16,30,0.62)";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `9px ${F_D}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#7d93ad";
      ctx.fillText("CHƯA MỞ", t.x, t.y);
    }
    for (const c of this.customers) {
      if (c.state === "eat") {
        const t = TABLES[c.table];
        const k = clamp(c.eatT / 1.5, 0, 1);
        ctx.save();
        ctx.globalAlpha = Math.min(1, k * 3);
        drawDish(ctx, c.dish.id, t.x, t.y, 26 * (0.8 + 0.2 * Math.min(1, k * 2)));
        ctx.restore();
      }
    }
  }

  private drawCustomers(ctx: CanvasRenderingContext2D): void {
    for (const c of this.customers) {
      const bob = c.state === "sit" ? Math.sin(c.bobT) * 1.4 : 0;
      const x = c.x;
      const y = c.y + bob;
      const isWalking = c.state === "walkin" || c.state === "leave";
      const seat = seatOf(TABLES[c.table]);
      const cdir = c.state === "walkin" ? (seat.x >= x ? 1 : -1) : c.state === "leave" ? -1 : 1;
      let cmood: "neutral" | "happy" | "angry" | "eat" = "neutral";
      if (c.state === "eat") cmood = "eat";
      else if (c.state === "leave") cmood = c.happy ? "happy" : "angry";
      else if (c.state === "sit" && c.patience / c.maxPatience < 0.25) cmood = "angry";
      drawPerson(ctx, x, y + 16, {
        look: c.look,
        walkT: c.bobT,
        moving: isWalking,
        dir: cdir,
        scale: 1,
        mood: cmood,
        arms: "swing",
        clock: this.clock + c.id * 0.7,
      });

      const t = this.carry;
      if (t && t.stage === 2) {
        const wantFood = !c.gotFood && c.state === "sit";
        const wantDrink = !!c.drink && !c.gotDrink && (c.state === "sit" || c.state === "eat");
        if ((t.dish.category === "food" && wantFood) || (t.dish.category === "drink" && wantDrink)) {
          const ok = t.dish.id === (t.dish.category === "food" ? c.dish.id : c.drink!.id);
          ctx.strokeStyle = ok ? "rgba(142,240,176,0.9)" : "rgba(255,138,117,0.7)";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 5]);
          ctx.lineDashOffset = -this.clock * 26;
          ctx.beginPath();
          ctx.arc(x, y + 4, 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      const pendingFood = !c.gotFood;
      const pendingDrink = c.drink && !c.gotDrink;
      if ((c.state === "sit" || c.state === "eat") && (pendingFood || pendingDrink))
        this.drawBubble(ctx, c, x, y, pendingFood, !!pendingDrink);

      if (c.dialog) {
        const a = clamp(c.dialog.t / 0.3, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = `800 13px ${F_B}`;
        const tw = ctx.measureText(c.dialog.text).width + 20;
        const dx = clamp(x, 20 + tw / 2, W - 20 - tw / 2);
        const dy = y - 108;
        ctx.fillStyle = "rgba(10,20,36,0.92)";
        rr(ctx, dx - tw / 2, dy - 14, tw, 26, 12);
        ctx.fill();
        ctx.strokeStyle = c.dialog.color;
        ctx.lineWidth = 1.5;
        rr(ctx, dx - tw / 2, dy - 14, tw, 26, 12);
        ctx.stroke();
        ctx.fillStyle = c.dialog.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.dialog.text, dx, dy);
        ctx.restore();
      }
    }
  }

  private drawBubble(
    ctx: CanvasRenderingContext2D,
    c: Customer,
    x: number,
    y: number,
    pendingFood: boolean,
    pendingDrink: boolean
  ): void {
    const pf = clamp(c.patience / c.maxPatience, 0, 1);
    const bx = clamp(x, 46, W - 46);
    const by = y - 56;
    const mainId = pendingFood ? c.dish.id : c.drink!.id;
    const pulse = pendingFood && pf < 0.25 ? 1 + Math.sin(this.clock * 10) * 0.06 : 1;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#fff8e7";
    rr(ctx, -26, -24, 52, 46, 12);
    ctx.fill();
    ctx.strokeStyle = pendingFood && pf < 0.25 ? "#ff5a45" : "#d9c08a";
    ctx.lineWidth = 2.5;
    rr(ctx, -26, -24, 52, 46, 12);
    ctx.stroke();
    ctx.fillStyle = "#fff8e7";
    ctx.beginPath();
    ctx.moveTo(-7, 21);
    ctx.lineTo(7, 21);
    ctx.lineTo(0, 31);
    ctx.closePath();
    ctx.fill();
    drawDish(ctx, mainId, 0, -1, 15);
    if (pendingFood) {
      ctx.lineWidth = 3.6;
      ctx.strokeStyle = "rgba(10,20,36,0.16)";
      ctx.beginPath();
      ctx.arc(0, -1, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = pf > 0.55 ? "#43d97b" : pf > 0.25 ? "#ffd23f" : "#ff5a45";
      ctx.beginPath();
      ctx.arc(0, -1, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pf);
      ctx.stroke();
    }
    if (pendingFood && pendingDrink) {
      ctx.fillStyle = "#0e2036";
      ctx.beginPath();
      ctx.arc(22, 14, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2ec4b6";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(22, 14, 11, 0, Math.PI * 2);
      ctx.stroke();
      drawDish(ctx, c.drink!.id, 22, 14, 9);
    }
    ctx.restore();
  }

  private drawChef(ctx: CanvasRenderingContext2D): void {
    if (this.phase === "menu") return;
    const ch = this.chef;
    const bob = ch.moving ? Math.sin(ch.walkT) * 2 : Math.sin(this.clock * 2.4) * 1;
    const x = ch.x;
    const y = ch.y + bob;

    if (ch.target && this.phase === "playing") {
      const a = 0.35 + 0.25 * Math.sin(this.clock * 6);
      ctx.strokeStyle = `rgba(46,196,182,${a.toFixed(3)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ch.target.x, ch.target.y, 12 + Math.sin(this.clock * 6) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawPerson(ctx, x, y + 18, {
      look: {
        skin: "#f0c8a0",
        hairColor: "#3a2a1e",
        hairStyle: 0,
        hat: this.chefLook.hat,
        shirt: this.chefLook.shirt,
        pants: "#3a4a5c",
        shoe: "#26201c",
      },
      walkT: ch.walkT,
      moving: ch.moving,
      dir: ch.dir,
      scale: 1.12,
      mood: "neutral",
      arms: this.carry ? "carry" : "swing",
      clock: this.clock,
    });

    if (this.carry) {
      const t = this.carry;
      const tx = x + ch.dir * 23;
      const ty = y - 6 + Math.sin(this.clock * 7) * 1.2;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(ch.moving ? Math.sin(ch.walkT) * 0.06 * ch.dir : 0);
      ctx.translate(-tx, -ty);
      ctx.fillStyle = "#e8e0d0";
      ctx.beginPath();
      ctx.ellipse(tx, ty + 8, 17, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (t.stage === 9) {
        ctx.fillStyle = "#2a2a2a";
        ctx.beginPath();
        ctx.arc(tx, ty, 13, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawDish(ctx, t.dish.id, tx, ty, 14);
      }
      for (let i = 0; i < 3; i++) {
        const done = t.stage === 9 ? false : t.stage >= i;
        const burnt = t.stage === 9 && i === 1;
        ctx.fillStyle = burnt ? "#ff5a45" : done ? "#43d97b" : "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(tx - 8 + i * 8, ty + 18, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      if (p.kind === "steam") {
        ctx.fillStyle = `rgba(255,255,255,${(a * 0.2).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "smoke") {
        ctx.fillStyle = `rgba(70,70,70,${(a * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.kind === "puff") {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.kind === "confetti") {
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx.restore();
      } else if (p.kind === "heart") {
        const s = p.size * (0.6 + 0.4 * a);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.55);
        ctx.bezierCurveTo(-s, -s * 0.15, -s * 0.55, -s * 0.95, 0, -s * 0.3);
        ctx.bezierCurveTo(s * 0.55, -s * 0.95, s, -s * 0.15, 0, s * 0.55);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "anger") {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(-s, -s);
        ctx.lineTo(-s * 0.3, -s * 0.3);
        ctx.moveTo(s, -s);
        ctx.lineTo(s * 0.3, -s * 0.3);
        ctx.moveTo(-s, s);
        ctx.lineTo(-s * 0.3, s * 0.3);
        ctx.moveTo(s, s);
        ctx.lineTo(s * 0.3, s * 0.3);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === "money") {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.font = `10px ${F_D}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("₫", p.x, p.y);
        ctx.restore();
      } else if (p.kind === "text" && p.text) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const big = (p.fontSize ?? 14) >= 18;
        ctx.font = big ? `${p.fontSize}px ${F_D}` : `800 ${p.fontSize}px ${F_B}`;
        ctx.lineWidth = big ? 5 : 3.5;
        ctx.strokeStyle = "rgba(10,16,28,0.9)";
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }
    }
  }

  // ---------------- mini-game vẽ ----------------

  private drawMini(ctx: CanvasRenderingContext2D): void {
    const m = this.mini;
    if (!m) return;
    const r = this.miniRect();
    ctx.fillStyle = "rgba(24,10,4,0.6)";
    ctx.fillRect(0, HUD_H, W, H - HUD_H);
    ctx.fillStyle = "#180d06";
    rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 10);
    ctx.fill();
    ctx.fillStyle = "#1d1208";
    rr(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = C.lacquer;
    ctx.lineWidth = 3;
    rr(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.4;
    rr(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 5);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    drawDish(ctx, m.dish.id, r.x + 52, r.y + 52, 26);

    if (m.kind === "prep") {
      ctx.font = `18px ${F_D}`;
      ctx.fillStyle = "#ffd23f";
      ctx.fillText("SƠ CHẾ — BỎ NGUYÊN LIỆU!", r.x + r.w / 2 + 30, r.y + 30);
      const rx0 = r.x + 172;
      const ry0 = r.y + 44;
      const rw = r.w - 188;
      const rh = 82;
      ctx.fillStyle = "rgba(240,205,126,0.07)";
      rr(ctx, rx0, ry0, rw, rh, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(240,205,126,0.5)";
      ctx.lineWidth = 1.4;
      rr(ctx, rx0, ry0, rw, rh, 8);
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.font = `10px ${F_D}`;
      ctx.fillStyle = C.gold;
      ctx.fillText("CÔNG THỨC", rx0 + 10, ry0 + 13);
      ctx.font = `800 10.5px ${F_B}`;
      ctx.fillStyle = m.added >= m.need ? "#7dc48f" : C.goldLt;
      ctx.textAlign = "right";
      ctx.fillText(`${m.added}/${m.need}`, rx0 + rw - 10, ry0 + 13);
      const needChips = m.chips.filter((c) => c.needed);
      const colW = (rw - 20) / 2;
      needChips.forEach((c, i) => {
        const ix = rx0 + 10 + (i % 2) * colW;
        const iy = ry0 + 27 + Math.floor(i / 2) * 14;
        ctx.textAlign = "left";
        ctx.font = `700 10.5px ${F_B}`;
        if (c.taken) {
          ctx.fillStyle = "#7dc48f";
          ctx.fillText("✓", ix, iy);
          ctx.fillStyle = "rgba(125,196,143,0.85)";
        } else {
          ctx.fillStyle = "#c0392b";
          ctx.fillText("•", ix, iy);
          ctx.fillStyle = C.paper;
        }
        ctx.fillText(c.label, ix + 12, iy, colW - 18);
      });
      ctx.textAlign = "center";
      const bx = r.x + 88;
      const by = r.y + 186;
      const v = m.dish.visual.vessel;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(bx, by + 34, 52, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (v === "bowl") {
        ctx.fillStyle = m.dish.visual.bowlC ?? "#e9e2d2";
        ctx.beginPath();
        ctx.moveTo(bx - 52, by - 12);
        ctx.quadraticCurveTo(bx - 44, by + 32, bx, by + 32);
        ctx.quadraticCurveTo(bx + 44, by + 32, bx + 52, by - 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f3ead8";
        ctx.beginPath();
        ctx.ellipse(bx, by - 12, 52, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (v === "plate") {
        ctx.fillStyle = "#f3ead8";
        ctx.beginPath();
        ctx.ellipse(bx, by + 6, 56, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (v === "tray") {
        ctx.fillStyle = "#c9974f";
        rr(ctx, bx - 56, by - 16, 112, 52, 10);
        ctx.fill();
      } else if (v === "leaf") {
        ctx.fillStyle = "#3f7d4e";
        ctx.beginPath();
        ctx.ellipse(bx, by + 4, 58, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (v === "clay") {
        ctx.fillStyle = "#a8663a";
        rr(ctx, bx - 48, by - 20, 96, 56, 16);
        ctx.fill();
      } else {
        ctx.fillStyle = "#d8973c";
        rr(ctx, bx - 54, by - 18, 108, 44, 22);
        ctx.fill();
      }
      const ING_COLORS = ["#d63f35", "#43d97b", "#f6e3b4", "#e08a3c", "#b06a32", "#a8e05f", "#f2c9a5"];
      let ai = 0;
      for (const c of m.chips) {
        if (!c.taken || !c.needed) continue;
        const h = (c.label.length * 37 + c.label.charCodeAt(0)) % ING_COLORS.length;
        const ox = ((ai % 3) - 1) * 22;
        const oy = Math.floor(ai / 3) * -9;
        ctx.fillStyle = ING_COLORS[h];
        ctx.beginPath();
        ctx.ellipse(bx + ox, by - 8 + oy, 11, 6.5, (ai * 1.3) % 1, 0, Math.PI * 2);
        ctx.fill();
        ai++;
      }
      ctx.font = `13px ${F_D}`;
      ctx.fillStyle = m.added >= m.need ? "#43d97b" : "#fff1cf";
      ctx.fillText(`${m.added}/${m.need}`, bx, by + 52);
      const rects = this.prepChipRects(m);
      m.chips.forEach((c, i) => {
        const rc = rects[i];
        const hov =
          !c.taken &&
          this.pointer.x >= rc.x && this.pointer.x <= rc.x + rc.w &&
          this.pointer.y >= rc.y && this.pointer.y <= rc.y + rc.h;
        const dx = c.shake > 0 ? Math.sin(this.clock * 42) * c.shake * 14 : 0;
        ctx.save();
        ctx.globalAlpha = c.taken ? 0.32 : 1;
        ctx.fillStyle = hov ? "#2a1a10" : "#241609";
        rr(ctx, rc.x + dx, rc.y - (hov ? 2 : 0), rc.w, rc.h, 9);
        ctx.fill();
        ctx.strokeStyle = c.shake > 0 ? "#ff5a45" : hov ? "#ffd23f" : "#4a3a24";
        ctx.lineWidth = hov || c.shake > 0 ? 2 : 1.5;
        rr(ctx, rc.x + dx, rc.y - (hov ? 2 : 0), rc.w, rc.h, 9);
        ctx.stroke();
        const dotC = ING_COLORS[(c.label.length * 37 + c.label.charCodeAt(0)) % ING_COLORS.length];
        ctx.fillStyle = dotC;
        ctx.beginPath();
        ctx.arc(rc.x + dx + 14, rc.y + rc.h / 2 - (hov ? 2 : 0), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = "left";
        ctx.font = `700 10.5px ${F_B}`;
        ctx.fillStyle = c.taken ? "#7d93ad" : "#fff1cf";
        ctx.fillText(c.label, rc.x + dx + 24, rc.y + rc.h / 2 - (hov ? 2 : 0) + 0.5, rc.w - 30);
        ctx.restore();
        if (c.taken) {
          ctx.strokeStyle = "#43d97b";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(rc.x + rc.w - 22, rc.y + rc.h / 2);
          ctx.lineTo(rc.x + rc.w - 18, rc.y + rc.h / 2 + 4);
          ctx.lineTo(rc.x + rc.w - 11, rc.y + rc.h / 2 - 5);
          ctx.stroke();
        }
        ctx.textAlign = "center";
      });
    } else if (m.kind === "cook") {
      ctx.font = `18px ${F_D}`;
      ctx.fillStyle = "#ffd23f";
      ctx.fillText(m.burner === "oven" ? "NƯỚNG — CANH LỬA!" : "NẤU — CANH LỬA!", r.x + r.w / 2 + 30, r.y + 34);
      ctx.font = `600 12px ${F_B}`;
      ctx.fillStyle = "#c8d8ea";
      ctx.fillText("Bấm / SPACE khi kim vào ô vàng — lệch quá là CHÁY!", r.x + r.w / 2 + 30, r.y + 56);
      const bx = r.x + 40;
      const bw = r.w - 80;
      const by = r.y + 150;
      ctx.fillStyle = "#3a2218";
      rr(ctx, bx, by - 14, bw, 28, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(200,216,234,0.35)";
      rr(ctx, bx + bw * 0.28, by - 14, bw * 0.44, 28, 12);
      ctx.fill();
      ctx.fillStyle = "#ffd23f";
      rr(ctx, bx + bw * 0.41, by - 14, bw * 0.18, 28, 10);
      ctx.fill();
      ctx.fillStyle = "#43d97b";
      rr(ctx, bx + bw * 0.475, by - 14, bw * 0.05, 28, 6);
      ctx.fill();
      const mx = bx + bw * m.m;
      ctx.fillStyle = "#fff1cf";
      ctx.beginPath();
      ctx.moveTo(mx, by - 26);
      ctx.lineTo(mx - 7, by - 36);
      ctx.lineTo(mx + 7, by - 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(mx - 2, by - 26, 4, 52);
      for (let i = 0; i < 6; i++) {
        const fx = bx + 20 + (i * (bw - 40)) / 5;
        const fh = 14 + Math.sin(this.clock * 18 + i * 2) * 5;
        ctx.fillStyle = i % 2 ? "#ff8c28" : "#ffd23f";
        ctx.beginPath();
        ctx.moveTo(fx - 6, by + 56);
        ctx.quadraticCurveTo(fx, by + 56 - fh, fx + 6, by + 56);
        ctx.closePath();
        ctx.fill();
      }
    } else if (m.kind === "plate") {
      ctx.font = `18px ${F_D}`;
      ctx.fillStyle = "#ffd23f";
      ctx.fillText("TRÌNH BÀY — BẤM LIÊN TỤC!", r.x + r.w / 2 + 30, r.y + 34);
      ctx.font = `600 12px ${F_B}`;
      ctx.fillStyle = "#c8d8ea";
      ctx.fillText(`8 lần trong 2.3 giây — còn ${Math.max(0, 2.3 - m.t).toFixed(1)}s`, r.x + r.w / 2 + 30, r.y + 56);
      const k = clamp(m.taps / 8, 0, 1);
      ctx.fillStyle = "#0e2036";
      ctx.beginPath();
      ctx.arc(480, r.y + 160, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(480, r.y + 160, 52, 0, Math.PI * 2);
      ctx.clip();
      drawDish(ctx, m.dish.id, 480, r.y + 160, 50 * (0.5 + 0.5 * k));
      ctx.restore();
      ctx.strokeStyle = "#43d97b";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(480, r.y + 160, 60, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      ctx.stroke();
      ctx.font = `22px ${F_D}`;
      ctx.fillStyle = "#fff1cf";
      ctx.fillText(`${m.taps}/8`, 480, r.y + 236);
    } else {
      ctx.font = `18px ${F_D}`;
      ctx.fillStyle = "#ffd23f";
      ctx.fillText("PHA CHẾ — LẮC ĐỀU TAY!", r.x + r.w / 2 + 30, r.y + 34);
      ctx.font = `600 12px ${F_B}`;
      ctx.fillStyle = "#c8d8ea";
      ctx.fillText("Bấm / SPACE khi mực nước chạm VẠCH TRÀ!", r.x + r.w / 2 + 30, r.y + 56);
      const gx = 480;
      const gy = r.y + 100;
      const gh = 130;
      const gw = 64;
      const v = Math.sin(clamp(m.t / 1.55, 0, 1) * Math.PI);
      const liq = m.dish.visual.drink?.liq[0] ?? "#88c0e8";
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 3;
      rr(ctx, gx - gw / 2, gy, gw, gh, 10);
      ctx.stroke();
      const fh = v * (gh - 10);
      ctx.fillStyle = liq;
      rr(ctx, gx - gw / 2 + 4, gy + gh - 4 - fh, gw - 8, fh, 6);
      ctx.fill();
      const ty2 = gy + gh - 4 - 0.85 * (gh - 10);
      ctx.fillStyle = "rgba(67,217,123,0.28)";
      ctx.fillRect(gx - gw / 2, ty2 - 9, gw, 18);
      ctx.strokeStyle = "#43d97b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx - gw / 2 - 10, ty2);
      ctx.lineTo(gx + gw / 2 + 10, ty2);
      ctx.stroke();
      ctx.font = `9px ${F_D}`;
      ctx.fillStyle = "#43d97b";
      ctx.fillText("VẠCH", gx + gw / 2 + 26, ty2);
    }
    ctx.font = `600 11px ${F_B}`;
    ctx.fillStyle = "rgba(243,227,192,0.55)";
    ctx.fillText("CHẠM / SPACE để thao tác · nút X (hoặc ESC) để thoát", r.x + r.w / 2, r.y + r.h - 16);
    this.xBtn(ctx, r.x + r.w, r.y, this.cancelOps);
  }

  private drawPick(ctx: CanvasRenderingContext2D): void {
    if (!this.pickList) return;
    const list = this.pickList;
    const isDrink = this.pickKind === "drink";
    ctx.fillStyle = "rgba(24,10,4,0.66)";
    ctx.fillRect(0, HUD_H, W, H - HUD_H);
    const cols = 4;
    const bw = 112;
    const bh = 92;
    const gap = 12;
    const rows = Math.ceil(list.length / cols);
    const pw = cols * bw + (cols - 1) * gap + 40;
    const ph = rows * bh + (rows - 1) * gap + 100;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2 + 10;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    rr(ctx, px + 6, py + 8, pw, ph, 6);
    ctx.fill();
    ctx.fillStyle = C.paper;
    rr(ctx, px, py, pw, ph, 6);
    ctx.fill();
    ctx.strokeStyle = isDrink ? C.jade : C.lacquer;
    ctx.lineWidth = 3.5;
    rr(ctx, px + 2, py + 2, pw - 4, ph - 4, 5);
    ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.3;
    rr(ctx, px + 8, py + 8, pw - 16, ph - 16, 3);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `17px ${F_D}`;
    ctx.fillStyle = isDrink ? C.jade : C.lacquer;
    ctx.fillText(isDrink ? "PHA NƯỚC GÌ?" : "HÔM NAY BÁN MÓN GÌ?", W / 2, py + 32);
    ctx.font = `600 11.5px ${F_B}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText(
      isDrink
        ? "Nước pha 1 bước ở quầy — nhưng khách gọi nước thì thiếu kiên nhẫn lắm!"
        : "Bỏ đủ nguyên liệu vào đồ đựng — chấm đỏ = món cầu kỳ, khách kiên nhẫn chờ lâu hơn!",
      W / 2, py + 54
    );

    list.forEach((d, i) => {
      const cx0 = px + 20 + (i % cols) * (bw + gap);
      const cy0 = py + 74 + Math.floor(i / cols) * (bh + gap);
      const hov =
        this.pointer.x >= cx0 && this.pointer.x <= cx0 + bw && this.pointer.y >= cy0 && this.pointer.y <= cy0 + bh;
      ctx.fillStyle = hov ? "#fff6de" : C.paperDk;
      rr(ctx, cx0, cy0 - (hov ? 2 : 0), bw, bh, 8);
      ctx.fill();
      ctx.strokeStyle = hov ? (isDrink ? C.jade : C.lacquer) : "rgba(107,86,54,0.5)";
      ctx.lineWidth = hov ? 2.2 : 1.4;
      rr(ctx, cx0, cy0 - (hov ? 2 : 0), bw, bh, 8);
      ctx.stroke();
      drawDish(ctx, d.id, cx0 + bw / 2, cy0 + 32 - (hov ? 2 : 0), 22);
      ctx.font = `800 12px ${F_B}`;
      ctx.fillStyle = C.ink;
      ctx.fillText(d.name, cx0 + bw / 2, cy0 + 64 - (hov ? 2 : 0));
      ctx.font = `600 11px ${F_B}`;
      ctx.fillStyle = C.lacquer;
      ctx.fillText(
        fmtK(d.price) + (d.category === "drink" ? " · NƯỚC" : d.cookAt === "oven" ? " · LÒ" : " · BẾP"),
        cx0 + bw / 2, cy0 + 79 - (hov ? 2 : 0)
      );
      const ingN = dishIngredients(d).length;
      const lvl = d.category === "drink" ? 0 : ingN <= 4 ? 1 : ingN <= 5 ? 2 : 3;
      for (let di = 0; di < 3; di++) {
        ctx.fillStyle = di < lvl ? C.lacquer : "rgba(107,86,54,0.28)";
        ctx.beginPath();
        ctx.arc(cx0 + bw - 22 + di * 8, cy0 + 12 - (hov ? 2 : 0), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      this.btns.push({ x: cx0, y: cy0, w: bw, h: bh, act: () => (isDrink ? this.startShake(d) : this.startPrep(d)) });
    });
    ctx.font = `600 10.5px ${F_B}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText("chạm ra ngoài hoặc nút X để hủy", W / 2, py + ph - 14);
    this.xBtn(ctx, px + pw, py, this.cancelOps);
  }

  // ---------------- HUD ----------------

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    if (!this.hudGrad) {
      this.hudGrad = ctx.createLinearGradient(0, 0, 0, HUD_H);
      this.hudGrad.addColorStop(0, "#3a2416");
      this.hudGrad.addColorStop(1, C.woodDk);
    }
    ctx.fillStyle = this.hudGrad;
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = "rgba(240,205,126,0.22)";
    ctx.fillRect(0, HUD_H - 2, W, 2);
    for (let i = 0; i < W / 16; i++) {
      ctx.fillStyle = i % 2 === 0 ? C.lacquer : C.paper;
      ctx.beginPath();
      ctx.arc(i * 16 + 8, HUD_H, 8, 0, Math.PI);
      ctx.fill();
    }
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `14px ${F_D}`;
    ctx.fillStyle = C.goldLt;
    ctx.fillText("HÀNG QUÁN", 14, 20);
    ctx.font = `800 9px ${F_B}`;
    ctx.fillStyle = "#c9a86a";
    ctx.fillText(`NGÀY ${this.cfg.day}/${DAYS.length} · ${this.cfg.name.toUpperCase()}`, 14, 40);
    const tf = clamp(this.dayTime / this.cfg.time, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    rr(ctx, 128, 14, 170, 10, 5);
    ctx.fill();
    ctx.fillStyle = tf > 0.3 ? C.gold : "#e05540";
    rr(ctx, 128, 14, Math.max(4, 170 * tf), 10, 5);
    ctx.fill();
    ctx.font = `13px ${F_D}`;
    ctx.fillStyle = tf > 0.3 ? C.goldLt : "#ff8a75";
    ctx.fillText(fmtClock(this.dayTime), 128, 40);

    ctx.textAlign = "center";
    ctx.font = `20px ${F_D}`;
    ctx.fillStyle = C.goldLt;
    ctx.fillText(fmtDong(this.money), 480, 19);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    rr(ctx, 400, 34, 160, 8, 4);
    ctx.fill();
    ctx.fillStyle = "#7dc48f";
    rr(ctx, 400, 34, Math.max(4, 160 * clamp(this.money / this.cfg.goal, 0, 1)), 8, 4);
    ctx.fill();
    ctx.font = `800 9px ${F_B}`;
    ctx.fillStyle = "#c9a86a";
    ctx.fillText("mục tiêu " + fmtDong(this.cfg.goal), 480, 49);

    let rx = 640;
    if (this.combo >= 2) {
      if (this.combo >= 4) {
        const fa = 0.3 + 0.2 * Math.sin(this.clock * 14);
        const fg = ctx.createRadialGradient(rx + 12, 30, 2, rx + 12, 30, 26);
        fg.addColorStop(0, `rgba(255,150,50,${fa.toFixed(3)})`);
        fg.addColorStop(1, "rgba(255,150,50,0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(rx + 12, 30, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `16px ${F_D}`;
      ctx.textAlign = "left";
      ctx.fillStyle = this.combo >= 4 ? "#ff8c28" : "#ff9d5e";
      ctx.fillText("x" + this.combo, rx, 28);
      ctx.font = `800 8.5px ${F_B}`;
      ctx.fillStyle = "#c9a86a";
      ctx.fillText("COMBO", rx, 44);
      rx += 52;
    }
    if (this.carry) {
      drawDish(ctx, this.carry.dish.id, rx + 14, 26, 13);
      for (let i = 0; i < 3; i++) {
        const done = this.carry.stage === 9 ? false : this.carry.stage >= i;
        ctx.fillStyle = this.carry.stage === 9 && i === 1 ? "#ff5a45" : done ? "#43d97b" : "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(rx + 36 + i * 11, 26, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `800 8.5px ${F_B}`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#7d93ad";
      const lbl =
        this.carry.stage === 2 ? "BƯNG RA BÀN!"
        : this.carry.stage === 9 ? "ĐỒ CHÁY!"
        : this.carry.stage === 1 ? "QUA RA MÓN"
        : "ĐI NẤU!";
      ctx.fillText(lbl, rx + 32, 45);
      rx += 74;
    }
    ctx.textAlign = "left";
    ctx.font = `13px ${F_D}`;
    ctx.fillStyle = this.missed > 0 ? "#ff8a75" : "#7d93ad";
    ctx.fillText("✕" + this.missed, rx, 22);
    ctx.font = `800 8.5px ${F_B}`;
    ctx.fillStyle = "#c9a86a";
    ctx.fillText(this.penalized > 0 ? "PHẠT " + fmtK(this.penalized) : "KHÁCH BỎ ĐI", rx, 42);
    rx += 92;
    this.hudBtn(ctx, rx, 12, "II", () => this.togglePause());
    this.hudBtn(ctx, rx + 40, 12, sfx.muted ? "×♪" : "♪", () => this.toggleMute());
  }

  private hudBtn(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, act: () => void): void {
    const hov = this.pointer.x >= x && this.pointer.x <= x + 32 && this.pointer.y >= y && this.pointer.y <= y + 32;
    ctx.fillStyle = hov ? "#1d3352" : "#16283f";
    rr(ctx, x, y, 32, 32, 8);
    ctx.fill();
    ctx.strokeStyle = hov ? "#ffd23f" : "#33537a";
    ctx.lineWidth = 2;
    rr(ctx, x, y, 32, 32, 8);
    ctx.stroke();
    ctx.fillStyle = "#ffd23f";
    ctx.font = `12px ${F_D}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 16, y + 17);
    this.btns.push({ x, y, w: 32, h: 32, act });
  }

  private xBtn(ctx: CanvasRenderingContext2D, cx: number, cy: number, act: () => void): void {
    const hov = dist(this.pointer.x, this.pointer.y, cx, cy) < 19;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 2.5, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hov ? "#c0392b" : C.lacquer;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.goldLt;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.moveTo(cx + 5, cy - 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.stroke();
    ctx.lineCap = "butt";
    this.btns.push({ x: cx - 19, y: cy - 19, w: 38, h: 38, act });
  }

  // ---------------- màn hình ----------------

  private panel(ctx: CanvasRenderingContext2D, w: number, h: number, awning = true) {
    const px = W / 2 - w / 2;
    const py = H / 2 - h / 2;
    ctx.fillStyle = "rgba(24,10,4,0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    rr(ctx, px + 8, py + 10, w, h, 6);
    ctx.fill();
    ctx.fillStyle = C.paper;
    rr(ctx, px, py, w, h, 6);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    rr(ctx, px, py, w, h, 6);
    ctx.clip();
    ctx.strokeStyle = "rgba(160,120,60,0.08)";
    ctx.lineWidth = 1;
    for (let y = py + 8; y < py + h; y += 9) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + w, y + 3);
      ctx.stroke();
    }
    if (awning) {
      ctx.fillStyle = C.lacquer;
      ctx.fillRect(px, py, w, 26);
      ctx.fillStyle = C.gold;
      for (let x = px + 10; x < px + w - 8; x += 26) {
        ctx.save();
        ctx.translate(x, py + 13);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
      ctx.fillStyle = C.goldLt;
      ctx.fillRect(px, py + 26, w, 2);
    }
    ctx.restore();
    ctx.strokeStyle = C.lacquer;
    ctx.lineWidth = 4;
    rr(ctx, px + 2, py + 2, w - 4, h - 4, 5);
    ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.5;
    rr(ctx, px + 9, py + 9, w - 18, h - 18, 3);
    ctx.stroke();
    for (const [gx, gy] of [[px + 9, py + 9], [px + w - 9, py + 9], [px + 9, py + h - 9], [px + w - 9, py + h - 9]] as [number, number][]) {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = C.lacquer;
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.fillStyle = C.gold;
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    return { px, py };
  }

  private bigBtn(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    kind: "lantern" | "teal" | "ghost",
    act: () => void
  ): void {
    const hov = this.pointer.x >= x && this.pointer.x <= x + w && this.pointer.y >= y && this.pointer.y <= y + h;
    const dy = hov ? -2 : 0;
    if (kind === "lantern") {
      ctx.fillStyle = C.lacquerDk;
      rr(ctx, x, y + 5, w, h, 6);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y + dy, 0, y + dy + h);
      g.addColorStop(0, hov ? "#b8452f" : "#a63a28");
      g.addColorStop(1, C.lacquerDk);
      ctx.fillStyle = g;
      rr(ctx, x, y + dy, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      rr(ctx, x, y + dy, w, h, 6);
      ctx.stroke();
      ctx.fillStyle = C.goldLt;
    } else if (kind === "teal") {
      ctx.fillStyle = C.jadeDk;
      rr(ctx, x, y + 5, w, h, 6);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y + dy, 0, y + dy + h);
      g.addColorStop(0, hov ? "#4c9270" : C.jade);
      g.addColorStop(1, C.jadeDk);
      ctx.fillStyle = g;
      rr(ctx, x, y + dy, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      rr(ctx, x, y + dy, w, h, 6);
      ctx.stroke();
      ctx.fillStyle = "#f3e3c0";
    } else {
      ctx.fillStyle = hov ? C.paperDk : "rgba(243,227,192,0.5)";
      rr(ctx, x, y + dy, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = hov ? C.lacquer : "rgba(156,51,36,0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      rr(ctx, x, y + dy, w, h, 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.lacquer;
    }
    ctx.font = `${h >= 46 ? 19 : 14}px ${F_D}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + dy + h / 2 + 1);
    this.btns.push({ x, y: y - 4, w, h: h + 8, act });
  }

  private statRow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    label: string,
    value: string,
    accent = false
  ): void {
    ctx.font = `600 13px ${F_B}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = C.inkSoft;
    ctx.fillText(label, x, y);
    ctx.font = `14px ${F_D}`;
    ctx.textAlign = "right";
    ctx.fillStyle = accent ? C.jade : C.lacquer;
    ctx.fillText(value, x + w, y);
    ctx.strokeStyle = "rgba(156,51,36,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y + 13);
    ctx.lineTo(x + w, y + 13);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private buildGallery(): void {
    const gw = 744;
    const rows = 5;
    const gh = rows * 34;
    const cv = makeCanvas(gw * 2, gh * 2);
    const c = cv.getContext("2d");
    if (!c) return;
    c.scale(2, 2);
    c.textAlign = "center";
    c.textBaseline = "middle";
    DISHES.forEach((d, i) => {
      const col = i % 9;
      const row = Math.floor(i / 9);
      const cx = col * (gw / 9) + gw / 18;
      const cy = row * 34 + 14;
      drawDish(c, d.id, cx, cy - 2, 12);
      if (d.category === "drink") {
        c.fillStyle = C.jade;
        c.beginPath();
        c.arc(cx + 16, cy - 12, 2.4, 0, Math.PI * 2);
        c.fill();
      }
      c.font = `700 7.5px ${F_B}`;
      c.fillStyle = d.category === "drink" ? C.jadeDk : C.inkSoft;
      c.fillText(d.name.toUpperCase(), cx, cy + 13);
    });
    this.gallery = cv;
  }

  private drawMenu(ctx: CanvasRenderingContext2D): void {
    if (!this.gallery) this.buildGallery();
    const pw = 800;
    const phh = 506;
    const { px, py } = this.panel(ctx, pw, phh);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const sw = 470;
    const sx = W / 2 - sw / 2;
    const sy = py + 38;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    rr(ctx, sx + 5, sy + 6, sw, 78, 8);
    ctx.fill();
    const wg = ctx.createLinearGradient(0, sy, 0, sy + 78);
    wg.addColorStop(0, "#4a2f1b");
    wg.addColorStop(1, "#2c1a0d");
    ctx.fillStyle = wg;
    rr(ctx, sx, sy, sw, 78, 8);
    ctx.fill();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2.5;
    rr(ctx, sx + 4, sy + 4, sw - 8, 70, 6);
    ctx.stroke();
    ctx.font = `34px ${F_D}`;
    ctx.fillStyle = C.goldLt;
    ctx.fillText("HÀNG QUÁN", W / 2, sy + 30);
    ctx.font = `15px ${F_D}`;
    ctx.fillStyle = "#e8b56a";
    ctx.fillText("V Ỉ A   H È", W / 2, sy + 58);
    ctx.save();
    ctx.translate(px + pw - 78, sy + 34);
    ctx.rotate(-0.12);
    ctx.fillStyle = "rgba(156,51,36,0.92)";
    rr(ctx, -36, -24, 72, 48, 6);
    ctx.fill();
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 1.6;
    rr(ctx, -32, -20, 64, 40, 4);
    ctx.stroke();
    ctx.fillStyle = C.paper;
    ctx.font = `800 9px ${F_B}`;
    ctx.fillText("MỘT SẢN PHẨM CỦA", 0, -9);
    ctx.font = `11px ${F_D}`;
    ctx.fillText("EYECORE", 0, 4);
    ctx.fillText("LABS", 0, 17);
    ctx.restore();

    ctx.font = `600 12.5px ${F_B}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText("Quán nhỏ phố Hàng Trống vừa sang tên cho bạn — 5 ngày thành vua bếp vỉa hè!", W / 2, py + 136);

    const steps: [string, string][] = [
      ["Chạm để ĐI", "đầu bếp chạy tới nơi chạm"],
      ["BỎ NGUYÊN LIỆU", "vào tô, mẹt, niêu… đúng món"],
      ["NẤU & TRÌNH BÀY", "canh lửa — cháy là đổ!"],
      ["BƯNG RA BÀN", "khách còn vui = có tip"],
    ];
    steps.forEach((s, i) => {
      const bx = px + 28 + i * 190;
      const by = py + 156;
      ctx.fillStyle = C.lacquer;
      ctx.beginPath();
      ctx.arc(bx + 11, by + 11, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(bx + 11, by + 11, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = C.goldLt;
      ctx.font = `12px ${F_D}`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), bx + 11, by + 12);
      ctx.textAlign = "left";
      ctx.fillStyle = C.ink;
      ctx.font = `800 12px ${F_B}`;
      ctx.fillText(s[0], bx + 30, by + 6);
      ctx.fillStyle = C.inkSoft;
      ctx.font = `600 10px ${F_B}`;
      ctx.fillText(s[1], bx + 30, by + 20);
    });

    ctx.textAlign = "left";
    ctx.font = `11px ${F_D}`;
    ctx.fillStyle = C.lacquer;
    ctx.fillText("THỰC ĐƠN 41 MÓN ĂN & NƯỚC UỐNG", px + 28, py + 200);
    ctx.fillStyle = C.jade;
    ctx.font = `800 9px ${F_B}`;
    ctx.textAlign = "right";
    ctx.fillText("● = nước uống", px + pw - 28, py + 200);
    ctx.fillStyle = "rgba(58,36,22,0.12)";
    rr(ctx, px + 24, py + 208, pw - 48, 176, 6);
    ctx.fill();
    if (this.gallery) ctx.drawImage(this.gallery, px + 28, py + 212, 744, 170);

    if (this.best > 0) {
      ctx.textAlign = "center";
      ctx.font = `600 12px ${F_B}`;
      ctx.fillStyle = C.jade;
      ctx.fillText("Kỷ lục doanh thu: " + fmtDong(this.best), W / 2, py + 398);
    }
    this.bigBtn(ctx, W / 2 - 215, py + 408, 205, 50, "MỞ QUÁN NGAY", "lantern", this.startGame);
    this.bigBtn(ctx, W / 2 + 10, py + 408, 205, 50, "TỦ ĐỒ", "teal", this.openCustomize);
    ctx.textAlign = "center";
    ctx.font = `600 10.5px ${F_B}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText("SPACE tương tác · P tạm dừng · M âm thanh · WASD di chuyển", W / 2, py + 474);
    ctx.font = `800 9.5px ${F_B}`;
    ctx.fillStyle = "rgba(156,51,36,0.75)";
    ctx.fillText("HÀNG QUÁN VỈA HÈ — EYECORE LABS", W / 2, py + 492);
  }

  private drawCustomize(ctx: CanvasRenderingContext2D): void {
    const pw = 620;
    const ph = 520;
    const { px, py } = this.panel(ctx, pw, ph);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `26px ${F_D}`;
    ctx.fillStyle = C.lacquer;
    ctx.fillText("TỦ ĐỒ ĐẦU BẾP", W / 2, py + 52);
    ctx.font = `600 12px ${F_B}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText("Phối nón và áo cho chef của bạn — lưu tự động!", W / 2, py + 76);

    ctx.fillStyle = "rgba(58,36,22,0.15)";
    ctx.beginPath();
    ctx.ellipse(W / 2, py + 300, 90, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    drawPerson(ctx, W / 2, py + 296, {
      look: {
        skin: "#f0c8a0",
        hairColor: "#3a2a1e",
        hairStyle: 0,
        hat: this.chefLook.hat,
        shirt: this.chefLook.shirt,
        pants: "#3a4a5c",
        shoe: "#26201c",
      },
      walkT: this.clock * 7,
      moving: true,
      dir: Math.sin(this.clock * 0.8) > 0 ? 1 : -1,
      scale: 2.3,
      mood: "happy",
      arms: "swing",
      clock: this.clock,
    });

    this.pickerRow(ctx, py + 350, "NÓN", HATS[this.chefLook.hat].name, () => this.changeHat(-1), () => this.changeHat(1));
    this.pickerRow(ctx, py + 402, "ÁO", SHIRTS[this.chefLook.shirt].name, () => this.changeShirt(-1), () => this.changeShirt(1));

    this.bigBtn(ctx, W / 2 - 110, py + 448, 220, 46, "XONG — RA QUÁN", "lantern", this.toMenu);
  }

  private pickerRow(
    ctx: CanvasRenderingContext2D,
    y: number,
    label: string,
    value: string,
    prev: () => void,
    next: () => void
  ): void {
    const cx = W / 2;
    ctx.textAlign = "left";
    ctx.font = `12px ${F_D}`;
    ctx.fillStyle = C.jade;
    ctx.fillText(label, cx - 250, y + 2);
    this.bigBtn(ctx, cx - 160, y - 18, 44, 38, "◀", "ghost", prev);
    ctx.textAlign = "center";
    ctx.font = `800 15px ${F_B}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(value, cx + 12, y + 2);
    this.bigBtn(ctx, cx + 140, y - 18, 44, 38, "▶", "ghost", next);
  }

  private drawDayIntro(ctx: CanvasRenderingContext2D): void {
    const cfg = this.cfg;
    const items: DishId[] = [...cfg.dishIds, ...cfg.drinkIds];
    const rows = Math.ceil(items.length / 2);
    const ph = 250 + rows * 46;
    const { px, py } = this.panel(ctx, 660, Math.min(ph, 600));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `28px ${F_D}`;
    ctx.fillStyle = C.lacquer;
    ctx.fillText(`NGÀY ${cfg.day} — ${cfg.name.toUpperCase()}`, W / 2, py + 52);
    const chips = [`Mục tiêu ${fmtDong(cfg.goal)}`, `${cfg.tables} bàn hoạt động`, `Kiên nhẫn ~${cfg.patience}s`];
    const cw = 180;
    chips.forEach((t, i) => {
      const cx = W / 2 + (i - 1) * (cw + 10) - cw / 2;
      ctx.fillStyle = "rgba(58,36,22,0.1)";
      rr(ctx, cx, py + 76, cw, 30, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(156,51,36,0.55)";
      ctx.lineWidth = 1.5;
      rr(ctx, cx, py + 76, cw, 30, 8);
      ctx.stroke();
      ctx.font = `800 11.5px ${F_B}`;
      ctx.fillStyle = C.ink;
      ctx.fillText(t, cx + cw / 2, py + 92);
    });
    ctx.textAlign = "left";
    ctx.font = `11px ${F_D}`;
    ctx.fillStyle = C.lacquer;
    ctx.fillText("THỰC ĐƠN HÔM NAY", px + 46, py + 126);
    items.forEach((id, i) => {
      const d = dishById(id);
      const row = Math.floor(i / 2);
      const col = i % 2;
      const dx = px + 56 + col * 292;
      const dy = py + 140 + row * 46;
      const isNew = cfg.newIds.includes(id);
      ctx.fillStyle = isNew ? "rgba(63,125,92,0.16)" : "rgba(58,36,22,0.1)";
      rr(ctx, dx, dy, 272, 38, 9);
      ctx.fill();
      ctx.strokeStyle = isNew ? "rgba(63,125,92,0.7)" : "rgba(107,86,54,0.5)";
      ctx.lineWidth = 1.5;
      rr(ctx, dx, dy, 272, 38, 9);
      ctx.stroke();
      drawDish(ctx, d.id, dx + 24, dy + 19, 15);
      ctx.textAlign = "left";
      ctx.font = `800 12.5px ${F_B}`;
      ctx.fillStyle = C.ink;
      ctx.fillText(d.name + (isNew ? "  MỚI!" : ""), dx + 46, dy + 13);
      ctx.font = `600 10.5px ${F_B}`;
      ctx.fillStyle = C.lacquer;
      ctx.fillText(
        `${fmtK(d.price)} · ${d.category === "drink" ? "pha QUẦY NƯỚC · 1 bước" : d.cookAt === "oven" ? "nướng LÒ" : "nấu BẾP"}${d.category === "food" ? " · 3 bước" : ""}`,
        dx + 46, dy + 28
      );
    });
    const tipY = py + 140 + rows * 46 + 6;
    ctx.fillStyle = "rgba(58,36,22,0.12)";
    rr(ctx, px + 40, tipY, 580, 44, 9);
    ctx.fill();
    ctx.fillStyle = C.lacquer;
    ctx.fillRect(px + 40, tipY, 4, 44);
    ctx.font = `italic 600 11.5px ${F_B}`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = "left";
    ctx.fillText("Mẹo: " + cfg.tip, px + 56, tipY + 14, 550);
    this.bigBtn(ctx, W / 2 - 130, tipY + 58, 260, 46, "BẮT ĐẦU BÁN HÀNG", "lantern", this.beginDay);
  }

  private drawPaused(ctx: CanvasRenderingContext2D): void {
    this.panel(ctx, 380, 260);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `28px ${F_D}`;
    ctx.fillStyle = C.lacquer;
    ctx.fillText("TẠM DỪNG", W / 2, H / 2 - 70);
    ctx.font = `600 12.5px ${F_B}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText("Nồi nước dùng vẫn sôi lăn tăn…", W / 2, H / 2 - 40);
    this.bigBtn(ctx, W / 2 - 110, H / 2 - 16, 220, 44, "CHƠI TIẾP", "teal", this.togglePause);
    this.bigBtn(ctx, W / 2 - 110, H / 2 + 42, 220, 38, "VỀ MENU CHÍNH", "ghost", this.toMenu);
  }

  private drawDayEnd(ctx: CanvasRenderingContext2D): void {
    const s = this.stats();
    this.panel(ctx, 460, 430);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `28px ${F_D}`;
    ctx.fillStyle = C.lacquer;
    ctx.fillText(`HẾT NGÀY ${s.day}!`, W / 2, H / 2 - 155);
    ctx.font = `13px ${F_D}`;
    ctx.fillStyle = C.jade;
    ctx.fillText("ĐẠT MỤC TIÊU", W / 2, H / 2 - 127);
    const x = W / 2 - 180;
    this.statRow(ctx, x, H / 2 - 93, 360, "Doanh thu hôm nay", fmtDong(s.money));
    this.statRow(ctx, x, H / 2 - 63, 360, "Bát đã phục vụ", String(s.served));
    this.statRow(ctx, x, H / 2 - 33, 360, "Bát tuyệt phẩm 3 sao", String(s.tuyetPham), true);
    this.statRow(ctx, x, H / 2 - 3, 360, "Có tip", String(s.perfect));
    this.statRow(ctx, x, H / 2 + 27, 360, "Combo đỉnh nhất", "x" + s.bestCombo);
    this.statRow(ctx, x, H / 2 + 57, 360, "Tiền phạt khách bỏ đi", s.penalized > 0 ? "-" + fmtDong(s.penalized) : "0₫");
    this.statRow(ctx, x, H / 2 + 87, 360, "Tổng tích lũy", fmtDong(s.totalMoney), true);
    this.bigBtn(ctx, W / 2 - 130, H / 2 + 125, 260, 48, `NGÀY ${s.day + 1} — TIẾP TỤC`, "lantern", this.nextDay);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    const s = this.stats();
    const { px, py } = this.panel(ctx, 480, 430, false);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `34px ${F_D}`;
    ctx.fillStyle = "#c0392b";
    ctx.fillText("ĐÓNG QUÁN…", W / 2, py + 66);
    ctx.font = `600 13px ${F_B}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(`Hết 3:30 mà không đạt ${fmtDong(s.goal)} của ngày ${s.day}.`, W / 2, py + 100);
    ctx.fillText("Chủ nhà đã lấy lại mặt bằng.", W / 2, py + 118);
    const x = W / 2 - 185;
    this.statRow(ctx, x, py + 152, 370, `Doanh thu ngày ${s.day}`, fmtDong(s.money));
    this.statRow(ctx, x, py + 180, 370, "Bát đã phục vụ", String(s.served));
    this.statRow(ctx, x, py + 208, 370, "Khách bỏ đi", String(s.missed));
    this.statRow(ctx, x, py + 236, 370, "Tiền phạt khách bỏ đi", "-" + fmtDong(s.penalized), true);
    this.statRow(ctx, x, py + 264, 370, "Tổng tích lũy", fmtDong(s.totalMoney));
    this.bigBtn(ctx, W / 2 - 125, py + 292, 250, 46, "CHƠI LẠI TỪ NGÀY 1", "lantern", this.startGame);
    this.bigBtn(ctx, W / 2 - 125, py + 350, 250, 38, "VỀ MENU CHÍNH", "ghost", this.toMenu);
  }

  private drawVictory(ctx: CanvasRenderingContext2D): void {
    const s = this.stats();
    this.panel(ctx, 500, 440);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `12px ${F_D}`;
    ctx.fillStyle = C.jade;
    ctx.fillText(`SAU ${DAYS.length} NGÀY BÁN HÀNG`, W / 2, H / 2 - 160);
    ctx.font = `36px ${F_D}`;
    ctx.fillStyle = C.lacquer;
    ctx.fillText("VUA BẾP VỈA HÈ!", W / 2 + 2, H / 2 - 120);
    ctx.fillStyle = C.gold;
    ctx.fillText("VUA BẾP VỈA HÈ!", W / 2, H / 2 - 122);
    ctx.font = `600 13px ${F_B}`;
    ctx.fillStyle = C.ink;
    ctx.fillText("Cả phố Hàng Trống xếp hàng trước quán của bạn.", W / 2, H / 2 - 86);
    ctx.fillText('Từ phở đến cà phê — tiếng "cho một ly nữa!" vẫn vang mãi…', W / 2, H / 2 - 66);
    const x = W / 2 - 190;
    this.statRow(ctx, x, H / 2 - 30, 380, `Tổng doanh thu ${DAYS.length} ngày`, fmtDong(s.totalMoney), true);
    this.statRow(ctx, x, H / 2, 380, "Bát phục vụ (ngày cuối)", String(s.served));
    this.statRow(ctx, x, H / 2 + 30, 380, "Bát tuyệt phẩm (ngày cuối)", String(s.tuyetPham));
    this.statRow(ctx, x, H / 2 + 60, 380, "Combo đỉnh nhất", "x" + s.bestCombo);
    this.bigBtn(ctx, W / 2 - 125, H / 2 + 92, 250, 46, "MỞ QUÁN MÙA MỚI", "teal", this.startGame);
    this.bigBtn(ctx, W / 2 - 125, H / 2 + 146, 250, 38, "VỀ MENU CHÍNH", "ghost", this.toMenu);
    ctx.font = `800 10px ${F_B}`;
    ctx.fillStyle = "rgba(156,51,36,0.75)";
    ctx.fillText("HÀNG QUÁN VỈA HÈ — EYECORE LABS", W / 2, H / 2 + 202);
  }

  private drawPortraitBlock(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(18,9,3,0.96)";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H / 2 - 70, 40, W / 2, H / 2 - 70, 420);
    glow.addColorStop(0, "rgba(255,140,60,0.14)");
    glow.addColorStop(1, "rgba(255,140,60,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const px = W / 2;
    const py = H / 2 - 78;
    const R = 108;
    ctx.strokeStyle = "rgba(240,205,126,0.5)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(px, py, R, -Math.PI * 0.78, -Math.PI * 0.12);
    ctx.stroke();

    const t = (Math.sin(this.clock * 1.7 - Math.PI / 2) + 1) / 2;
    const ang = -t * (Math.PI / 2);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.fillStyle = "#2b2b30";
    rr(ctx, -34, -62, 68, 124, 14);
    ctx.fill();
    ctx.strokeStyle = "#4a4a52";
    ctx.lineWidth = 2;
    rr(ctx, -34, -62, 68, 124, 14);
    ctx.stroke();
    const sg = ctx.createLinearGradient(0, -54, 0, 50);
    sg.addColorStop(0, "#c0392b");
    sg.addColorStop(1, "#8f1d14");
    ctx.fillStyle = sg;
    rr(ctx, -28, -54, 56, 104, 8);
    ctx.fill();
    ctx.fillStyle = "#2b2b30";
    rr(ctx, -9, -54, 18, 6, 3);
    ctx.fill();
    ctx.fillStyle = "#ffe9a8";
    ctx.font = `12px ${F_D}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PHỞ", 0, -14);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    rr(ctx, -12, 40, 24, 4, 2);
    ctx.fill();
    ctx.restore();

    const pulse = 1 + Math.sin(this.clock * 3) * 0.015;
    ctx.save();
    ctx.translate(W / 2, H / 2 + 62);
    ctx.scale(pulse, pulse);
    ctx.font = `30px ${F_D}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#20100a";
    ctx.fillText("XOAY NGANG ĐIỆN THOẠI", 2, 2);
    ctx.fillStyle = C.goldLt;
    ctx.fillText("XOAY NGANG ĐIỆN THOẠI", 0, 0);
    ctx.restore();

    ctx.font = `600 14px ${F_B}`;
    ctx.fillStyle = "#e8cfa8";
    ctx.textAlign = "center";
    ctx.fillText("Hàng Quán Vỉa Hè chỉ chơi được ở chế độ ngang", W / 2, H / 2 + 96);
    ctx.font = `600 11.5px ${F_B}`;
    ctx.fillStyle = "rgba(200,169,106,0.8)";
    ctx.fillText("Game sẽ tự mở khi bạn xoay máy — hoặc chạm để tự xoay", W / 2, H / 2 + 118);

    this.bigBtn(ctx, W / 2 - 130, H / 2 + 142, 260, 46, "TỰ ĐỘNG XOAY NGAY", "lantern", () => this.tryLandscape());
  }
}
