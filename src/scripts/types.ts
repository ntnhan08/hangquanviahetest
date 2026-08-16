
// ============================================================
// types.ts — Toàn bộ kiểu dữ liệu dùng chung của game
// ============================================================

export type DishId =
  // món ăn
  | "phobo" | "phoga" | "hutieu" | "banhmi" | "bunrieu" | "banhcanh" | "bokho"
  | "buncha" | "bundau" | "comtron" | "mitron" | "comtam" | "comgachien" | "xoi"
  | "comchay" | "supcua" | "banhcanhcua" | "bunbo" | "miquang" | "bunthitnuong"
  | "chaolong" | "chaoga" | "mienga" | "comnieu" | "comchienhaisan" | "banhuot"
  | "banhcuon" | "banhkhot" | "banhbao" | "goicuon"
  // nước uống
  | "matcha" | "coca" | "tradao" | "bodua" | "trabidao" | "trada"
  | "cafeden" | "cafesua" | "trachanh" | "tragung" | "nuocmia";

export type ItemKind =
  | "bo" | "ga" | "gachien" | "cha" | "tom" | "cua" | "trung" | "xiu" | "dau"
  | "rau" | "dua" | "lac" | "chanh" | "dualeo" | "goi" | "suon" | "huyet"
  | "hanh" | "carot" | "banhtrang" | "nuocmam" | "mamtom" | "bao" | "khot";

export interface DrinkVisual {
  liq: [string, string];
  thick?: boolean;
  slice?: "dao" | "chanh" | "gung";
  foam?: boolean;
  bubbles?: boolean;
  straw: string;
}

export interface DishVisual {
  vessel: "bowl" | "plate" | "tray" | "leaf" | "clay" | "loaf" | "glass";
  bowlC?: string;
  base?:
    | "pho" | "vermi" | "thick" | "ymen" | "glassN"
    | "rice" | "yrice" | "porridge" | "fryrice" | "sheet";
  broth?: string;
  items?: ItemKind[];
  drink?: DrinkVisual;
}

export interface Dish {
  id: DishId;
  name: string;
  category: "food" | "drink";
  price: number;
  day: number;
  cookAt: "stove" | "oven" | "bar";
  plating: string;
  visual: DishVisual;
}

export interface DayConfig {
  day: number;
  name: string;
  time: number;
  tables: number;
  patience: number;
  spawnMin: number;
  spawnMax: number;
  goal: number;
  cookSpeed: number;
  drinkChance: number;
  dishIds: DishId[];
  drinkIds: DishId[];
  newIds: DishId[];
  tip: string;
}

export interface CustomerType {
  id: string;
  name: string;
  skin: string;
  shirt: string;
  hair: string;
  hat: "none" | "nonla" | "helmet" | "cap";
  hatColor: string;
  patienceMul: number;
  tipMul: number;
}

// ---------------- nhân vật ----------------

export interface PersonLook {
  skin: string;
  hairColor: string;
  hairStyle: number; // 0 ngắn · 1 bob · 2 búi · 3 dài · 4 hói
  hat: number; // 0..9
  shirt: number; // 0..9
  pants: string;
  shoe: string;
}

export type Mood = "neutral" | "happy" | "angry" | "eat";

export interface PersonOpts {
  look: PersonLook;
  walkT: number;
  moving: boolean;
  dir: number; // -1 trái · 1 phải
  scale?: number;
  mood?: Mood;
  arms?: "swing" | "carry";
  clock?: number;
  blink?: boolean;
}

export interface ChefLook {
  hat: number;
  shirt: number;
}

export interface HatDef {
  id: number;
  name: string;
}

export interface ShirtDef {
  id: number;
  name: string;
  color: string;
  accent: string;
}

// ---------------- thực thể trong game ----------------

export interface Vec2 {
  x: number;
  y: number;
}

export interface ChefState {
  x: number;
  y: number;
  target: Vec2 | null;
  dir: number;
  walkT: number;
  moving: boolean;
}

export interface Dialog {
  text: string;
  t: number;
  color: string;
}

export type CustomerState = "walkin" | "sit" | "eat" | "leave";

export interface Customer {
  id: number;
  type: CustomerType;
  table: number;
  dish: Dish;
  drink: Dish | null;
  gotFood: boolean;
  gotDrink: boolean;
  x: number;
  y: number;
  state: CustomerState;
  happy: boolean;
  patience: number;
  maxPatience: number;
  bobT: number;
  waitT: number;
  eatT: number;
  dialog: Dialog | null;
  look: PersonLook;
}

/** stage: 0 đã sơ chế · 1 đã nấu · 2 hoàn chỉnh · 9 cháy */
export type Stage = 0 | 1 | 2 | 9;

export interface Tray {
  dish: Dish;
  stage: Stage;
  stars: [number, number, number];
}

export interface PrepChip {
  label: string;
  needed: boolean;
  taken: boolean;
  shake: number;
}

export type Mini =
  | { kind: "prep"; dish: Dish; chips: PrepChip[]; added: number; need: number; mistakes: number }
  | { kind: "cook"; dish: Dish; burner: string; m: number; dir: 1 | -1; bounces: number }
  | { kind: "plate"; dish: Dish; taps: number; t: number }
  | { kind: "shake"; dish: Dish; t: number };

export interface StationDef {
  id: string;
  kind: "prep" | "stove" | "oven" | "pass" | "bar" | "trash";
  x: number;
  w: number;
}

export interface TablePos {
  x: number;
  y: number;
}

// ---------------- hạt & nút ----------------

export type ParticleKind =
  | "spark" | "steam" | "smoke" | "text" | "puff"
  | "confetti" | "heart" | "money" | "anger";

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  text?: string;
  fontSize?: number;
  rot?: number;
  vr?: number;
  tx?: number;
  ty?: number;
}

export interface Btn {
  x: number;
  y: number;
  w: number;
  h: number;
  act: () => void;
}

// ---------------- trạng thái game ----------------

export type Phase =
  | "menu"
  | "customize"
  | "dayIntro"
  | "playing"
  | "paused"
  | "dayEnd"
  | "gameover"
  | "victory";

export interface StatsPayload {
  day: number;
  money: number;
  goal: number;
  served: number;
  perfect: number;
  tuyetPham: number;
  missed: number;
  bestCombo: number;
  totalMoney: number;
  penalized: number;
  goalReached: boolean;
}
