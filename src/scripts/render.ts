
// ============================================================
// render.ts — Vẽ thủ công toàn bộ món ăn, nước uống & nhân vật.
// Tất cả đều vẽ bằng Canvas 2D, cache sprite để đạt hiệu năng cao.
// ============================================================

import type { DishId, DishVisual, ItemKind, PersonLook, PersonOpts } from "./types";
import { dishById } from "./food";
import { makeCanvas, rr } from "./utils";

const TAU = Math.PI * 2;

function ell(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string): void {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a0 = -Math.PI / 2 + (i * TAU) / 5;
    const a1 = a0 + TAU / 10;
    g.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    g.lineTo(cx + Math.cos(a1) * r * 0.45, cy + Math.sin(a1) * r * 0.45);
  }
  g.closePath();
  g.fill();
}

// ---------------- vật chứa ----------------

function bowlVessel(g: CanvasRenderingContext2D, body: string, rim: string, band = true): void {
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.beginPath();
  g.ellipse(1.5, 14, 21, 6, 0, 0, TAU);
  g.fill();
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(-21, -4);
  g.quadraticCurveTo(-17, 14, 0, 14);
  g.quadraticCurveTo(17, 14, 21, -4);
  g.closePath();
  g.fill();
  if (band) {
    g.strokeStyle = "#2b6cb0";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-16.5, 4);
    for (let x = -16.5; x <= 16.5; x += 4.2) g.quadraticCurveTo(x + 2.1, 7, x + 4.2, 4);
    g.stroke();
  }
  g.fillStyle = rim;
  g.beginPath();
  g.ellipse(0, -4, 21, 7.4, 0, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.18)";
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(0, -4, 21, 7.4, 0, 0, TAU);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath();
  g.ellipse(-14, 4, 3.2, 6.5, 0.35, 0, TAU);
  g.fill();
}

function plateVessel(g: CanvasRenderingContext2D): void {
  ell(g, 1.5, 8, 22, 8.5, "rgba(0,0,0,0.2)");
  ell(g, 0, 4, 22.5, 10.5, "#d8cbb0");
  ell(g, 0, 2.5, 22.5, 10.5, "#f6efe0");
  g.strokeStyle = "#c4b494";
  g.lineWidth = 1.2;
  g.beginPath();
  g.ellipse(0, 2, 16, 7.2, 0, 0, TAU);
  g.stroke();
}

function trayVessel(g: CanvasRenderingContext2D): void {
  ell(g, 1.5, 8, 23, 10, "rgba(0,0,0,0.22)");
  ell(g, 0, 3, 23.5, 11.5, "#a8742c");
  ell(g, 0, 1.5, 23.5, 11.5, "#c9974f");
  g.strokeStyle = "rgba(122,79,30,0.55)";
  g.lineWidth = 0.9;
  for (const k of [0.45, 0.72]) {
    g.beginPath();
    g.ellipse(0, 1.5, 23.5 * k, 11.5 * k, 0, 0, TAU);
    g.stroke();
  }
  for (let a = 0; a < TAU; a += Math.PI / 7) {
    g.beginPath();
    g.moveTo(Math.cos(a) * 8, 1.5 + Math.sin(a) * 4);
    g.lineTo(Math.cos(a) * 23, 1.5 + Math.sin(a) * 11);
    g.stroke();
  }
}

function leafVessel(g: CanvasRenderingContext2D): void {
  ell(g, 1.5, 8, 23, 9.5, "rgba(0,0,0,0.2)");
  ell(g, 0, 2.5, 24, 11.5, "#2b5c38");
  ell(g, 0, 1, 24, 11.5, "#3f7d4e");
  g.strokeStyle = "#2b5c38";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-20, 1);
  g.quadraticCurveTo(0, -5, 20, 1);
  g.stroke();
  g.strokeStyle = "rgba(120,190,130,0.5)";
  g.lineWidth = 0.8;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * 7, -1.5);
    g.quadraticCurveTo(i * 7 + 2, 3, i * 7 + 4, 7);
    g.stroke();
  }
}

function clayVessel(g: CanvasRenderingContext2D): void {
  ell(g, 1.5, 12, 20, 6, "rgba(0,0,0,0.24)");
  g.fillStyle = "#a8663a";
  rr(g, -19, -8, 38, 21, 9);
  g.fill();
  g.fillStyle = "#8a4f28";
  g.beginPath();
  g.ellipse(0, -8, 19, 6.4, 0, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(255,210,150,0.3)";
  g.lineWidth = 1.6;
  g.beginPath();
  g.ellipse(-11, 2, 3, 7, 0.3, 0, TAU);
  g.stroke();
}

function steamerVessel(g: CanvasRenderingContext2D): void {
  ell(g, 1.5, 8, 22, 9.5, "rgba(0,0,0,0.22)");
  ell(g, 0, 3, 23, 11, "#b58a4a");
  ell(g, 0, 1, 23, 11, "#caa05e");
  g.strokeStyle = "rgba(122,84,34,0.6)";
  g.lineWidth = 1;
  for (let x = -16; x <= 16; x += 5.5) {
    g.beginPath();
    g.moveTo(x, -8);
    g.lineTo(x, 10);
    g.stroke();
  }
  ell(g, 0, 0, 19, 8.6, "#b98e4c");
}

function loafVessel(g: CanvasRenderingContext2D): void {
  ell(g, 1.5, 11, 22, 6, "rgba(0,0,0,0.22)");
  g.fillStyle = "#d8973c";
  rr(g, -22, -7, 44, 17, 9);
  g.fill();
  g.fillStyle = "#e8b566";
  rr(g, -22, -9, 44, 10, 6);
  g.fill();
  g.strokeStyle = "#b57628";
  g.lineWidth = 1.4;
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(i * 12 - 3, -7);
    g.lineTo(i * 12 + 3, -1);
    g.stroke();
  }
}

// ---------------- nền món ----------------

function brothFill(g: CanvasRenderingContext2D, color: string): void {
  ell(g, 0, -4, 18.5, 6.2, color);
  g.fillStyle = "rgba(255,255,255,0.3)";
  g.beginPath();
  g.ellipse(-6, -5.6, 5, 1.6, 0.3, 0, TAU);
  g.fill();
}

function oilDrops(g: CanvasRenderingContext2D, color: string): void {
  for (const [x, y, r] of [[8, -6, 1.3], [12, -3.4, 0.9], [-11, -2.6, 1.1], [4, -1.6, 0.8]] as number[][])
    dot(g, x, y, r, color);
}

function strands(g: CanvasRenderingContext2D, color: string, w: number, n: number, wave = 3): void {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const y = -7.5 + (i * 7) / Math.max(1, n - 1);
    g.beginPath();
    g.moveTo(-15, y);
    g.quadraticCurveTo(-7, y - wave, 0, y);
    g.quadraticCurveTo(7, y + wave, 15, y);
    g.stroke();
  }
}

function riceMound(g: CanvasRenderingContext2D, color: string): void {
  ell(g, 0, -2, 16, 7.5, color);
  g.strokeStyle = "rgba(0,0,0,0.08)";
  g.lineWidth = 0.8;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    const x = Math.cos(a) * 11 * (0.4 + (i % 3) * 0.25);
    const y = -2 + Math.sin(a) * 4.6 * (0.4 + (i % 3) * 0.25);
    g.beginPath();
    g.arc(x, y, 1.1, 0.4, 2.6);
    g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.beginPath();
  g.ellipse(-5, -5, 6, 2.4, 0.4, 0, TAU);
  g.fill();
}

function porridgeBase(g: CanvasRenderingContext2D, color: string): void {
  ell(g, 0, -4, 18.5, 6.4, color);
  for (const [x, y] of [[-8, -5], [2, -7], [10, -4], [-2, -2.4], [6, -1.4]] as number[][])
    dot(g, x, y, 1.5, "rgba(255,255,255,0.4)");
}

function sheetBase(g: CanvasRenderingContext2D): void {
  g.fillStyle = "#f4eee2";
  for (let i = 0; i < 3; i++) {
    rr(g, -15 + i * 2, -7 + i * 3, 28 - i * 3, 7, 3.5);
    g.fill();
  }
  g.strokeStyle = "rgba(0,0,0,0.1)";
  g.lineWidth = 0.7;
  rr(g, -15, -7, 28, 7, 3.5);
  g.stroke();
}

// ---------------- topping ----------------

const SLOT: [number, number][] = [
  [-8, -5], [8, -5], [0, -1.5], [-9, 1.5], [9, 1.5], [0, -8], [-4, 3], [5, 3.5],
];

function topping(g: CanvasRenderingContext2D, kind: ItemKind, x: number, y: number, i: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(((i * 47) % 20) / 20 - 0.5);
  switch (kind) {
    case "bo":
      ell(g, 0, 0, 6.4, 4, "#c23a30");
      g.strokeStyle = "#f0b3a6";
      g.lineWidth = 1.1;
      g.beginPath();
      g.arc(0, 0, 4.4, 3.4, 5.6);
      g.stroke();
      g.strokeStyle = "rgba(255,240,235,0.9)";
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-4, 0.6);
      g.quadraticCurveTo(0, -1.4, 4, 0.8);
      g.stroke();
      break;
    case "ga":
      g.fillStyle = "#eed9b0";
      for (const [dx, dy] of [[-3, 0], [1, -2], [3, 1], [-1, 2]] as number[][]) {
        g.beginPath();
        g.ellipse(dx, dy, 3.4, 1.5, dx * 0.2, 0, TAU);
        g.fill();
      }
      break;
    case "gachien":
      g.fillStyle = "#d98f34";
      rr(g, -5, -3.4, 10, 6.8, 3);
      g.fill();
      g.fillStyle = "#f2b566";
      rr(g, -5, -3.4, 10, 3, 2.4);
      g.fill();
      dot(g, -2, 0.5, 0.7, "#a8641e");
      dot(g, 2.4, 1.2, 0.6, "#a8641e");
      break;
    case "cha":
      ell(g, 0, 0, 5.6, 4.2, "#b06a32");
      g.strokeStyle = "#7c451d";
      g.lineWidth = 1;
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.moveTo(k * 2.6 - 1.6, -2.6);
        g.lineTo(k * 2.6 + 1.6, 2.6);
        g.stroke();
      }
      break;
    case "tom":
      g.strokeStyle = "#f08a6a";
      g.lineWidth = 3.4;
      g.lineCap = "round";
      g.beginPath();
      g.arc(0, 0, 3.6, 0.6, 4.4);
      g.stroke();
      g.strokeStyle = "#f7b39a";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, 0, 3.6, 1, 3.4);
      g.stroke();
      ell(g, 3.4, 2.6, 1.8, 1.1, "#e06a4a");
      break;
    case "cua":
      for (const [dx, dy] of [[-2.6, -1], [1.6, -2], [3, 1.4], [-1, 2], [0, -0.2]] as number[][])
        dot(g, dx, dy, 1.5, "#e8823a");
      dot(g, 1, -0.4, 1, "#f2a468");
      break;
    case "trung":
      ell(g, 0, 0, 5.4, 4, "#fbf6ea");
      dot(g, 0.4, -0.2, 2.1, "#f2b32c");
      dot(g, -0.3, -0.9, 0.7, "#ffd873");
      break;
    case "xiu":
      dot(g, 0, 0, 4, "#9c5a30");
      g.fillStyle = "rgba(255,255,255,0.3)";
      g.beginPath();
      g.arc(-1.2, -1.2, 1.4, 0, TAU);
      g.fill();
      break;
    case "dau":
      g.fillStyle = "#f2ead8";
      rr(g, -4, -3, 8, 6, 1.4);
      g.fill();
      g.strokeStyle = "#d8c070";
      g.lineWidth = 1;
      rr(g, -4, -3, 8, 6, 1.4);
      g.stroke();
      g.fillStyle = "rgba(216,178,90,0.5)";
      rr(g, -4, -3, 8, 2, 1.4);
      g.fill();
      break;
    case "rau":
      g.strokeStyle = "#2b8f52";
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(0, 3.4);
      g.lineTo(0, -1);
      g.stroke();
      ell(g, -2.6, -1.6, 2.8, 1.7, "#43d97b");
      ell(g, 2.6, -2.4, 2.8, 1.7, "#37c26c");
      ell(g, 0, -4, 2.2, 1.5, "#4fe08a");
      break;
    case "dua":
      g.strokeStyle = "#e8912d";
      g.lineWidth = 1.3;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.moveTo(-3.6 + k * 2, -2.6);
        g.quadraticCurveTo(-2 + k * 2, 0, -3.2 + k * 2.4, 2.8);
        g.stroke();
      }
      break;
    case "lac":
      for (const [dx, dy] of [[-2.6, -1], [0.6, -2.2], [2.8, 0.4], [-0.6, 1.4], [1.2, 2.4]] as number[][])
        ell(g, dx, dy, 1.5, 1.1, "#c98a4b");
      break;
    case "chanh":
      g.fillStyle = "#a8e05f";
      g.beginPath();
      g.arc(0, 0, 3.8, Math.PI, 0);
      g.closePath();
      g.fill();
      g.strokeStyle = "#4f9e2a";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, 0, 3.8, Math.PI, 0);
      g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.9)";
      g.lineWidth = 0.6;
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(k * 2.4, -2.6);
        g.stroke();
      }
      break;
    case "dualeo":
      ell(g, 0, 0, 4, 2.4, "#cfe8b0");
      g.strokeStyle = "#7aa858";
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, 0, 4, 2.4, 0, 0, TAU);
      g.stroke();
      dot(g, -1.2, 0, 0.4, "#eaf5d8");
      dot(g, 1.2, -0.5, 0.4, "#eaf5d8");
      break;
    case "goi":
      g.fillStyle = "rgba(244,238,226,0.92)";
      rr(g, -6.5, -2.8, 13, 5.6, 2.8);
      g.fill();
      g.fillStyle = "rgba(240,138,106,0.85)";
      rr(g, -5, -1.6, 5, 3.2, 1.6);
      g.fill();
      g.fillStyle = "rgba(67,217,123,0.8)";
      rr(g, 0.6, -1.6, 4.4, 3.2, 1.6);
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.12)";
      g.lineWidth = 0.7;
      rr(g, -6.5, -2.8, 13, 5.6, 2.8);
      g.stroke();
      break;
    case "suon":
      g.fillStyle = "#8f4a20";
      rr(g, -5.6, -3.2, 11.2, 6.4, 3);
      g.fill();
      g.fillStyle = "#c07038";
      rr(g, -5.6, -3.2, 11.2, 2.6, 2.4);
      g.fill();
      g.strokeStyle = "#5e2f12";
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(-3, -2);
      g.lineTo(-1.6, 2.2);
      g.moveTo(1.4, -2.2);
      g.lineTo(3, 2);
      g.stroke();
      ell(g, 5.2, 0, 1.3, 2.4, "#e8dcc8");
      break;
    case "huyet":
      ell(g, 0, 0, 4.6, 3, "#7a4028");
      g.strokeStyle = "rgba(255,220,200,0.4)";
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(0, 0, 2.8, 3.6, 5.4);
      g.stroke();
      break;
    case "hanh":
      g.fillStyle = "#4fc46a";
      for (const [dx, dy] of [[-2.8, -0.6], [0.4, -1.8], [2.8, 0.2], [-0.8, 1.6]] as number[][]) {
        g.save();
        g.translate(dx, dy);
        g.rotate(dx);
        g.fillRect(-1.6, -0.5, 3.2, 1);
        g.restore();
      }
      break;
    case "carot":
      ell(g, 0, 0, 3.4, 2.2, "#e8762d");
      g.strokeStyle = "#c05a1e";
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(0, 0, 3.4, 2.2, 0, 0, TAU);
      g.stroke();
      dot(g, 0, 0, 0.9, "#f2a468");
      break;
    case "banhtrang":
      ell(g, 0, 0, 6, 4.6, "#f2e8d2");
      g.strokeStyle = "#d8c8a4";
      g.lineWidth = 0.9;
      g.beginPath();
      g.ellipse(0, 0, 6, 4.6, 0, 0, TAU);
      g.stroke();
      for (const [dx, dy] of [[-2, -1], [2, 1], [0, 2], [2.6, -1.6]] as number[][]) dot(g, dx, dy, 0.4, "#c8b888");
      break;
    case "nuocmam":
      ell(g, 0, 0.6, 4.4, 2.6, "#f6efe0");
      ell(g, 0, -0.4, 4.4, 2.4, "#e0b054");
      dot(g, -1, -0.8, 0.6, "#c0392b");
      break;
    case "mamtom":
      ell(g, 0, 0.6, 4.4, 2.6, "#f6efe0");
      ell(g, 0, -0.4, 4.4, 2.4, "#8a5a8f");
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.beginPath();
      g.ellipse(-1, -0.9, 1.6, 0.7, 0.4, 0, TAU);
      g.fill();
      break;
    case "bao":
      ell(g, 0, 1.4, 5.6, 3.8, "#e8e0d0");
      ell(g, 0, 0, 5.6, 4.4, "#f8f3e8");
      g.strokeStyle = "#d8cdb8";
      g.lineWidth = 0.9;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(k * 1.8, -3.6);
        g.quadraticCurveTo(k * 2.4, 0, k * 1.6, 2.6);
        g.stroke();
      }
      dot(g, 0, -3.4, 1, "#e8dcc8");
      break;
    case "khot":
      ell(g, 0, 0.8, 4.4, 3, "#d8973c");
      ell(g, 0, -0.4, 4.4, 3, "#f2c063");
      g.strokeStyle = "#f08a6a";
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(0, -0.8, 1.8, 0.8, 4.2);
      g.stroke();
      dot(g, -1.4, -1, 0.5, "#43d97b");
      break;
  }
  g.restore();
}

function drawToppings(g: CanvasRenderingContext2D, items: ItemKind[]): void {
  items.forEach((it, i) => topping(g, it, SLOT[i % SLOT.length][0], SLOT[i % SLOT.length][1], i));
}

// ---------------- nước uống ----------------

interface DrinkOpts {
  liq: [string, string];
  thick?: boolean;
  slice?: "dao" | "chanh" | "gung";
  foam?: boolean;
  bubbles?: boolean;
  straw: string;
}

function glassVessel(g: CanvasRenderingContext2D, o: DrinkOpts): void {
  ell(g, 1, 17, 9, 3, "rgba(0,0,0,0.22)");
  g.fillStyle = "rgba(220,235,245,0.32)";
  rr(g, -8, -16, 16, 31, 4.5);
  g.fill();
  const lg = g.createLinearGradient(0, -13, 0, 14);
  lg.addColorStop(0, o.liq[0]);
  lg.addColorStop(1, o.liq[1]);
  g.fillStyle = lg;
  rr(g, -6.6, o.thick ? -9 : -11, 13.2, o.thick ? 22.4 : 24.4, 3.6);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.5)";
  rr(g, -4.4, -8, 4.6, 4.6, 1.2);
  g.fill();
  rr(g, 0.6, -3, 4.2, 4.2, 1.2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.3)";
  rr(g, -3, 2, 4, 4, 1.2);
  g.fill();
  if (o.bubbles) {
    for (const [bx, by, br] of [[-3, -2, 0.8], [2, -6, 0.7], [4, 2, 0.6], [-2, 6, 0.7], [1, 9, 0.6], [-4, -9, 0.6]] as number[][])
      dot(g, bx, by, br, "rgba(255,240,220,0.75)");
  }
  if (o.foam) {
    for (const [fx, fy, fr] of [[-3, -11, 2.2], [1, -12, 2.6], [4.4, -10.6, 2]] as number[][])
      dot(g, fx, fy, fr, "#f6f2e6");
  }
  g.fillStyle = "rgba(255,255,255,0.4)";
  g.beginPath();
  g.ellipse(0, o.thick ? -9 : -11, 6.4, 1.7, 0, 0, TAU);
  g.fill();
  if (o.slice) {
    const c = o.slice === "dao" ? "#f0a04a" : o.slice === "chanh" ? "#e8d44a" : "#e0b060";
    const edge = o.slice === "dao" ? "#c07028" : o.slice === "chanh" ? "#a89a2a" : "#a87838";
    g.save();
    g.translate(7.6, -15);
    g.rotate(0.5);
    dot(g, 0, 0, 4.4, c);
    g.strokeStyle = edge;
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(0, 0, 4.4, 0, TAU);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 0.7;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 3.6, Math.sin(a) * 3.6);
      g.stroke();
    }
    g.restore();
  }
  g.save();
  g.rotate(-0.3);
  g.fillStyle = o.straw;
  rr(g, 2, -24, 3, 16, 1.5);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.35)";
  rr(g, 2, -24, 1.1, 16, 0.8);
  g.fill();
  g.restore();
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 1.2;
  rr(g, -8, -16, 16, 31, 4.5);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.35)";
  rr(g, -6.2, -13, 1.8, 24, 1);
  g.fill();
  dot(g, 6.4, -2, 0.8, "rgba(255,255,255,0.5)");
  dot(g, 5.6, 6, 0.6, "rgba(255,255,255,0.45)");
  dot(g, -6.6, 3, 0.7, "rgba(255,255,255,0.4)");
}

// ---------------- vẽ món hoàn chỉnh ----------------

function paintDish(g: CanvasRenderingContext2D, d: { id: DishId; visual: DishVisual }): void {
  const v = d.visual;
  if (v.drink) {
    glassVessel(g, v.drink);
    return;
  }
  if (v.vessel === "bowl") bowlVessel(g, v.bowlC ?? "#e9e2d2", "#f3ead8", !v.bowlC);
  else if (v.vessel === "plate") plateVessel(g);
  else if (v.vessel === "tray") {
    if (d.id === "banhbao") steamerVessel(g);
    else trayVessel(g);
  } else if (v.vessel === "leaf") leafVessel(g);
  else if (v.vessel === "clay") clayVessel(g);
  else if (v.vessel === "loaf") loafVessel(g);
  else steamerVessel(g);

  const cy = v.vessel === "bowl" ? 0 : -1.5;
  g.save();
  g.translate(0, cy);

  if (v.base === "pho") {
    if (v.broth) brothFill(g, v.broth);
    strands(g, "#f6e3b4", 1.7, 4, 2.6);
    if (v.broth) oilDrops(g, "rgba(255,190,80,0.8)");
  } else if (v.base === "vermi") {
    if (v.broth) brothFill(g, v.broth);
    strands(g, "#f4efe4", 1.1, 5, 2.2);
  } else if (v.base === "thick") {
    if (v.broth) brothFill(g, v.broth);
    strands(g, "#efe6d2", 2.6, 3, 3);
  } else if (v.base === "ymen") {
    if (v.broth) brothFill(g, v.broth);
    strands(g, "#e8c454", 1.4, 4, 2.4);
  } else if (v.base === "glassN") {
    if (v.broth) brothFill(g, v.broth);
    g.globalAlpha = 0.85;
    strands(g, "#ece4d2", 1, 5, 2.4);
    g.globalAlpha = 1;
  } else if (v.base === "rice") riceMound(g, "#fdfaf2");
  else if (v.base === "yrice") riceMound(g, "#e8c85e");
  else if (v.base === "porridge") porridgeBase(g, v.broth ?? "#f0e6d2");
  else if (v.base === "fryrice") {
    riceMound(g, "#e0a850");
    for (const [x, y, c] of [[-6, -4, "#7dc48f"], [4, -6, "#f2b32c"], [8, -1, "#7dc48f"], [-2, -7, "#f08a6a"]] as [number, number, string][])
      dot(g, x, y, 1, c);
  } else if (v.base === "sheet") sheetBase(g);

  if (v.items) drawToppings(g, v.items);

  switch (d.id) {
    case "bunbo":
      oilDrops(g, "rgba(220,60,20,0.85)");
      break;
    case "bunrieu":
      for (const [x, y] of [[-4, -6], [6, -3], [1, -1]] as number[][]) ell(g, x, y, 2.6, 1.6, "#c94a26");
      break;
    case "bokho":
      ell(g, -7, -3, 3.4, 2.4, "#7a3a18");
      ell(g, 6, -6, 3, 2.2, "#7a3a18");
      break;
    case "banhcanhcua":
      oilDrops(g, "rgba(232,130,58,0.85)");
      break;
    case "comnieu":
      g.strokeStyle = "#8a5a28";
      g.lineWidth = 1.6;
      g.beginPath();
      g.ellipse(0, -2, 15.5, 7, 0, 0, TAU);
      g.stroke();
      break;
  }

  if (v.broth && v.vessel === "bowl") {
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 1.1;
    g.lineCap = "round";
    for (const sx of [-5, 4]) {
      g.beginPath();
      g.moveTo(sx, -13);
      g.quadraticCurveTo(sx - 2.4, -16.5, sx, -20);
      g.stroke();
    }
  }
  g.restore();
}

// ---------------- cache sprite & API ----------------

const dishCache = new Map<string, HTMLCanvasElement>();
const BOX = 160;

function getSprite(id: DishId): HTMLCanvasElement {
  let cv = dishCache.get(id);
  if (!cv) {
    cv = makeCanvas(BOX, BOX);
    const g = cv.getContext("2d");
    if (g) {
      g.scale(BOX / 50, BOX / 50);
      g.translate(25, 25);
      g.lineJoin = "round";
      g.lineCap = "round";
      try {
        paintDish(g, dishById(id));
      } catch {
        /* không bao giờ để vẽ món làm hỏng game */
      }
    }
    dishCache.set(id, cv);
  }
  return cv;
}

export function drawDish(
  ctx: CanvasRenderingContext2D,
  id: DishId,
  cx: number,
  cy: number,
  size: number
): void {
  const s = getSprite(id);
  ctx.drawImage(s, cx - size, cy - size, size * 2, size * 2);
}

// ---------------- nhân vật ----------------

function drawHat(g: CanvasRenderingContext2D, hat: number, hairColor: string): void {
  switch (hat) {
    case 0: // nón lá
      g.fillStyle = "#d9b877";
      g.beginPath();
      g.moveTo(-21, -44);
      g.quadraticCurveTo(0, -62, 21, -44);
      g.quadraticCurveTo(0, -50, -21, -44);
      g.closePath();
      g.fill();
      g.strokeStyle = "#a8863f";
      g.lineWidth = 1.4;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(i * 7, -45 - Math.abs(i));
        g.quadraticCurveTo(i * 3, -56, 0, -59);
        g.stroke();
      }
      g.strokeStyle = "#8a6a3a";
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-21, -44);
      g.quadraticCurveTo(0, -50, 21, -44);
      g.stroke();
      break;
    case 1: // mũ lưỡi trai
      g.fillStyle = "#c0392b";
      g.beginPath();
      g.arc(0, -44, 10.5, Math.PI, 0);
      g.closePath();
      g.fill();
      g.fillStyle = "#8f1d14";
      g.beginPath();
      g.ellipse(0, -44, 13, 4, 0, 0, Math.PI);
      g.fill();
      g.fillStyle = "#e05540";
      g.beginPath();
      g.arc(0, -54, 2, 0, TAU);
      g.fill();
      break;
    case 2: // mũ cối
      g.fillStyle = "#7a8a5a";
      g.beginPath();
      g.ellipse(0, -45, 16, 5, 0, 0, TAU);
      g.fill();
      g.fillStyle = "#8a9a66";
      g.beginPath();
      g.arc(0, -47, 9, Math.PI, 0);
      g.closePath();
      g.fill();
      g.fillStyle = "#5d6b42";
      g.fillRect(-9, -49, 18, 2.4);
      break;
    case 3: // mũ bảo hiểm
      g.fillStyle = "#f2f2f2";
      g.beginPath();
      g.arc(0, -42, 11.5, Math.PI * 0.95, Math.PI * 2.05);
      g.closePath();
      g.fill();
      g.strokeStyle = "#c8c8c8";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(0, -42, 11.5, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
      g.strokeStyle = "#a8a8a8";
      g.beginPath();
      g.moveTo(-9, -35);
      g.quadraticCurveTo(0, -31, 9, -35);
      g.stroke();
      break;
    case 4: // mũ phớt
      g.fillStyle = "#6b4a2e";
      g.beginPath();
      g.ellipse(0, -45, 15, 4.5, 0, 0, TAU);
      g.fill();
      g.fillStyle = "#7a5636";
      rr(g, -8, -56, 16, 11, 4);
      g.fill();
      g.fillStyle = "#4a331e";
      g.fillRect(-8, -49, 16, 2.6);
      break;
    case 5: // mũ len
      g.fillStyle = "#2e8f86";
      g.beginPath();
      g.arc(0, -44, 10.5, Math.PI, 0);
      g.closePath();
      g.fill();
      g.fillStyle = "#256f68";
      g.fillRect(-10.5, -46, 21, 3.4);
      g.fillStyle = "#f2e3c2";
      g.beginPath();
      g.arc(0, -56, 3.2, 0, TAU);
      g.fill();
      break;
    case 6: // mũ đầu bếp
      g.fillStyle = "#ffffff";
      g.fillRect(-9, -50, 18, 7);
      g.beginPath();
      g.arc(-5, -52, 6, 0, TAU);
      g.arc(1, -55, 6.5, 0, TAU);
      g.arc(6, -51, 5.5, 0, TAU);
      g.fill();
      g.strokeStyle = "#d8d8d8";
      g.lineWidth = 1.2;
      g.strokeRect(-9, -50, 18, 7);
      break;
    case 7: // mũ bucket
      g.fillStyle = "#4a6b94";
      g.beginPath();
      g.moveTo(-8, -52);
      g.lineTo(8, -52);
      g.lineTo(13, -42);
      g.lineTo(-13, -42);
      g.closePath();
      g.fill();
      g.strokeStyle = "#3a567a";
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(-10, -46);
      g.lineTo(10, -46);
      g.stroke();
      g.fillStyle = "#3a567a";
      g.beginPath();
      g.ellipse(0, -42, 13.5, 3.4, 0, 0, Math.PI);
      g.fill();
      break;
    case 8: // khăn rằn
      g.fillStyle = "#1a1a1a";
      g.fillRect(-10, -48, 20, 7);
      g.fillStyle = "#f2f2f2";
      for (let rI = 0; rI < 2; rI++)
        for (let cI = 0; cI < 6; cI++)
          if ((rI + cI) % 2 === 0) g.fillRect(-10 + cI * 3.4, -48 + rI * 3.5, 3.4, 3.5);
      g.fillStyle = "#1a1a1a";
      g.beginPath();
      g.moveTo(10, -46);
      g.lineTo(16, -40);
      g.lineTo(12, -38);
      g.closePath();
      g.fill();
      break;
    case 9: // băng đô sao vàng
      g.fillStyle = "#e8b52a";
      g.fillRect(-10, -48, 20, 5);
      star(g, 0, -45.5, 3.4, "#c0392b");
      g.fillStyle = hairColor;
      g.beginPath();
      g.arc(0, -46, 10, Math.PI * 1.05, Math.PI * 1.95);
      g.fill();
      break;
  }
}

function drawShirt(g: CanvasRenderingContext2D, shirt: number): void {
  switch (shirt) {
    case 0: // bà ba nâu
      g.fillStyle = "#8a5a33";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.strokeStyle = "#5d3717";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, -33);
      g.lineTo(0, -13);
      g.stroke();
      g.fillStyle = "#3a2410";
      for (let i = 0; i < 3; i++) g.fillRect(-1.2, -30 + i * 6, 2.4, 2.4);
      break;
    case 1: // thun đỏ HQ
      g.fillStyle = "#c0392b";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.fillStyle = "#f0cd7e";
      g.font = "700 8px 'Be Vietnam Pro',sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("HQ", 0, -24);
      break;
    case 2: // sơ mi caro
      g.fillStyle = "#b03a2e";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.save();
      rr(g, -11, -34, 22, 22, 7);
      g.clip();
      g.fillStyle = "rgba(242,227,194,0.5)";
      for (let x = -9; x < 11; x += 6) g.fillRect(x, -34, 2, 22);
      for (let y = -32; y < -12; y += 6) g.fillRect(-11, y, 22, 2);
      g.restore();
      break;
    case 3: // bà ba xanh ngọc
      g.fillStyle = "#2e8f86";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.strokeStyle = "#a8efe6";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(0, -33);
      g.lineTo(0, -13);
      g.stroke();
      g.fillStyle = "#1d6b64";
      rr(g, -8, -24, 6, 6, 2);
      g.fill();
      break;
    case 4: // khoác da
      g.fillStyle = "#2b2b30";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.strokeStyle = "#9aa0a8";
      g.lineWidth = 1.6;
      g.setLineDash([2.5, 2]);
      g.beginPath();
      g.moveTo(0, -33);
      g.lineTo(0, -13);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = "#3a3a40";
      g.beginPath();
      g.moveTo(-11, -34);
      g.lineTo(-3, -30);
      g.lineTo(-11, -26);
      g.closePath();
      g.moveTo(11, -34);
      g.lineTo(3, -30);
      g.lineTo(11, -26);
      g.closePath();
      g.fill();
      break;
    case 5: // thun vàng sao
      g.fillStyle = "#e8b52a";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      star(g, 0, -24, 5, "#c0392b");
      break;
    case 6: // sơ mi trắng
      g.fillStyle = "#f2ead8";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.fillStyle = "#d8cbb0";
      g.beginPath();
      g.moveTo(-6, -34);
      g.lineTo(0, -29);
      g.lineTo(6, -34);
      g.closePath();
      g.fill();
      g.fillStyle = "#8a9aa8";
      for (let i = 0; i < 3; i++) g.fillRect(-1, -27 + i * 5, 2, 2);
      break;
    case 7: // hoodie xám
      g.fillStyle = "#7d8a97";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.fillStyle = "#6a7684";
      g.beginPath();
      g.arc(0, -34, 8, Math.PI, 0);
      g.closePath();
      g.fill();
      g.strokeStyle = "#3a424c";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-3, -31);
      g.lineTo(-3, -25);
      g.moveTo(3, -31);
      g.lineTo(3, -25);
      g.stroke();
      g.fillStyle = "#6a7684";
      rr(g, -7, -20, 14, 6, 3);
      g.fill();
      break;
    case 8: // thun lá xanh
      g.fillStyle = "#3f7d4e";
      rr(g, -11, -34, 22, 22, 7);
      g.fill();
      g.fillStyle = "#a8e05f";
      g.beginPath();
      g.ellipse(0, -24, 5, 3, -0.5, 0, TAU);
      g.fill();
      g.strokeStyle = "#2b5c38";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-3, -22);
      g.lineTo(3, -26);
      g.stroke();
      break;
    case 9: // áo dài hồng
      g.fillStyle = "#e0789a";
      rr(g, -11, -34, 22, 24, 7);
      g.fill();
      g.fillStyle = "#f7d9e4";
      g.fillRect(-2, -34, 4, 3);
      g.strokeStyle = "#c05a7e";
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(-7, -16);
      g.lineTo(-7, -10);
      g.moveTo(7, -16);
      g.lineTo(7, -10);
      g.stroke();
      break;
  }
}

/**
 * Vẽ nhân vật hình người (góc 3/4 từ trên) có đầu, thân, tay, chân, mắt, mũi, miệng.
 * x,y = vị trí bàn chân. Có animation tay chân khi di chuyển, mắt liếc theo hướng đi, chớp mắt.
 */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  o: PersonOpts
): void {
  const s = o.scale ?? 1;
  const look: PersonLook = o.look;
  const clock = o.clock ?? 0;
  const swing = o.moving ? Math.sin(o.walkT) : 0;
  const swing2 = o.moving ? Math.sin(o.walkT + Math.PI) : 0;
  const lift = o.moving ? Math.max(0, Math.sin(o.walkT)) * 3 : 0;
  const lift2 = o.moving ? Math.max(0, Math.sin(o.walkT + Math.PI)) * 3 : 0;
  const bob = o.moving ? Math.abs(Math.sin(o.walkT)) * 1.6 : Math.sin(clock * 2.2) * 0.8;
  const blink = o.blink ?? ((clock * 0.9) % 3.1) < 0.1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // bóng đổ
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 1, 15, 5.5, 0, 0, TAU);
  ctx.fill();

  // chân
  ctx.fillStyle = look.pants;
  rr(ctx, -8, -16 - lift, 6.5, 14 - (o.moving ? lift : 0), 3);
  ctx.fill();
  rr(ctx, 1.5, -16 - lift2, 6.5, 14 - (o.moving ? lift2 : 0), 3);
  ctx.fill();
  ctx.fillStyle = look.shoe;
  ctx.beginPath();
  ctx.ellipse(-4.6, -1 - lift, 4.4, 2.6, 0, 0, TAU);
  ctx.ellipse(4.8, -1 - lift2, 4.4, 2.6, 0, 0, TAU);
  ctx.fill();

  // thân + áo
  ctx.save();
  ctx.translate(0, -bob);
  drawShirt(ctx, look.shirt);

  // tay
  const armSwing = o.arms === "carry" ? 0 : swing * 0.5;
  const armSwing2 = o.arms === "carry" ? 0 : swing2 * 0.5;
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  if (o.arms === "carry") {
    ctx.beginPath();
    ctx.moveTo(-10, -28);
    ctx.quadraticCurveTo(-14, -20, -8, -15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -28);
    ctx.quadraticCurveTo(14, -20, 8, -15);
    ctx.stroke();
  } else {
    ctx.save();
    ctx.translate(-10.5, -30);
    ctx.rotate(armSwing);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.5, 13);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(10.5, -30);
    ctx.rotate(armSwing2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1.5, 13);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // đầu
  const hy = -42 - bob;
  ctx.fillStyle = look.hairColor;
  ctx.beginPath();
  ctx.arc(0, hy, 10.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(0, hy + 1.5, 9.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = look.hairColor;
  if (look.hairStyle === 0) {
    ctx.beginPath();
    ctx.arc(0, hy - 1, 9.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
  } else if (look.hairStyle === 1) {
    ctx.beginPath();
    ctx.arc(0, hy - 1, 9.6, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.fillRect(-9.5, hy - 2, 4, 10);
    ctx.fillRect(5.5, hy - 2, 4, 10);
  } else if (look.hairStyle === 2) {
    ctx.beginPath();
    ctx.arc(0, hy - 1, 9.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, hy - 10, 4.5, 0, TAU);
    ctx.fill();
  } else if (look.hairStyle === 3) {
    ctx.beginPath();
    ctx.arc(0, hy - 1, 9.6, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.fillRect(-10, hy - 2, 5, 14);
    ctx.fillRect(5, hy - 2, 5, 14);
  }

  // mắt
  const px = o.dir * 1.4;
  if (blink) {
    ctx.strokeStyle = "#26201c";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4.6, hy + 0.5);
    ctx.lineTo(-2.2, hy + 0.5);
    ctx.moveTo(2.2, hy + 0.5);
    ctx.lineTo(4.6, hy + 0.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-3.4 + px * 0.4, hy + 0.5, 2.2, 2.6, 0, 0, TAU);
    ctx.ellipse(3.4 + px * 0.4, hy + 0.5, 2.2, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#26201c";
    ctx.beginPath();
    ctx.arc(-3.4 + px, hy + 0.8, 1.15, 0, TAU);
    ctx.arc(3.4 + px, hy + 0.8, 1.15, 0, TAU);
    ctx.fill();
  }
  // mũi
  ctx.strokeStyle = "rgba(60,40,25,0.55)";
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, hy + 2.2);
  ctx.lineTo(0.4, hy + 4);
  ctx.stroke();
  // miệng
  const mood = o.mood ?? "neutral";
  ctx.strokeStyle = "#5c3320";
  ctx.lineWidth = 1.5;
  if (mood === "happy") {
    ctx.beginPath();
    ctx.arc(0, hy + 4.6, 3.2, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else if (mood === "angry") {
    ctx.beginPath();
    ctx.arc(0, hy + 8, 3, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (mood === "eat") {
    const chomp = 0.6 + Math.abs(Math.sin(clock * 9)) * 0.7;
    ctx.fillStyle = "#5c3320";
    ctx.beginPath();
    ctx.ellipse(0, hy + 5.6, 2.4, 1.8 * chomp, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-2.4, hy + 5.4);
    ctx.lineTo(2.4, hy + 5.4);
    ctx.stroke();
  }

  // mũ
  ctx.save();
  ctx.translate(0, -bob);
  drawHat(ctx, look.hat, look.hairColor);
  ctx.restore();

  ctx.restore();
}
