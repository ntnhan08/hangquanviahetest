// ============================================================
// food.ts — Dữ liệu món ăn, ngày chơi, khách hàng & tủ đồ
// ============================================================

import type {
  ChefLook,
  CustomerType,
  DayConfig,
  Dish,
  DishId,
  DishVisual,
  HatDef,
  ShirtDef,
} from "./types";

export const GAME_TITLE = "HÀNG QUÁN VỈA HÈ";
export const GAME_SUB = "ẨM THỰC ĐƯỜNG PHỐ VIỆT NAM";
export const STUDIO = "EYECORE LABS";

/** Khách bỏ đi vì chờ lâu bị phạt 50% giá món vào doanh thu ngày. */
export const PENALTY_RATE = 0.5;

const V = (v: DishVisual) => v;

export const DISHES: Dish[] = [
  // ---------------- MÓN ĂN ----------------
  { id: "phobo", name: "Phở Bò", category: "food", price: 42000, day: 1, cookAt: "stove", plating: "CHAN NƯỚC DÙNG", visual: V({ vessel: "bowl", base: "pho", broth: "#e8a94f", items: ["bo", "rau", "chanh"] }) },
  { id: "phoga", name: "Phở Gà", category: "food", price: 40000, day: 1, cookAt: "stove", plating: "CHAN NƯỚC DÙNG", visual: V({ vessel: "bowl", base: "pho", broth: "#edbe6a", items: ["ga", "rau", "hanh"] }) },
  { id: "comgachien", name: "Cơm Gà Chiên", category: "food", price: 42000, day: 1, cookAt: "stove", plating: "BÀY GÀ GIÒN", visual: V({ vessel: "plate", base: "rice", items: ["gachien", "dualeo", "rau"] }) },
  { id: "xoi", name: "Xôi Gà", category: "food", price: 25000, day: 1, cookAt: "stove", plating: "RẮC HÀNH PHI", visual: V({ vessel: "leaf", base: "yrice", items: ["ga", "hanh"] }) },
  { id: "goicuon", name: "Gỏi Cuốn", category: "food", price: 30000, day: 1, cookAt: "stove", plating: "CUỐN & BÀY", visual: V({ vessel: "leaf", items: ["goi", "goi", "nuocmam"] }) },
  { id: "banhmi", name: "Bánh Mì", category: "food", price: 25000, day: 1, cookAt: "oven", plating: "KẸP NHÂN", visual: V({ vessel: "loaf", items: ["cha", "dua", "rau"] }) },
  { id: "buncha", name: "Bún Chả", category: "food", price: 50000, day: 2, cookAt: "stove", plating: "RƯỚI NƯỚC MẮM", visual: V({ vessel: "tray", base: "vermi", items: ["cha", "nuocmam", "rau", "lac"] }) },
  { id: "bunbo", name: "Bún Bò Huế", category: "food", price: 50000, day: 2, cookAt: "stove", plating: "CHAN NƯỚC CAY", visual: V({ vessel: "bowl", base: "vermi", broth: "#d2452a", items: ["bo", "rau", "chanh"] }) },
  { id: "hutieu", name: "Hủ Tiếu", category: "food", price: 45000, day: 2, cookAt: "stove", plating: "CHAN NƯỚC DÙNG", visual: V({ vessel: "bowl", base: "vermi", broth: "#e8c07a", items: ["tom", "cha", "hanh"] }) },
  { id: "comtam", name: "Cơm Tấm", category: "food", price: 45000, day: 2, cookAt: "stove", plating: "BÀY SƯỜN NƯỚNG", visual: V({ vessel: "plate", base: "rice", items: ["suon", "trung", "dua", "dualeo"] }) },
  { id: "comtron", name: "Cơm Trộn", category: "food", price: 40000, day: 2, cookAt: "stove", plating: "TRỘN ĐỀU TAY", visual: V({ vessel: "bowl", bowlC: "#3a3a46", base: "rice", items: ["carot", "dualeo", "bo", "trung", "rau"] }) },
  { id: "supcua", name: "Súp Cua", category: "food", price: 45000, day: 2, cookAt: "stove", plating: "RẮC NGÒ", visual: V({ vessel: "bowl", base: "porridge", broth: "#e8b866", items: ["cua", "trung", "rau"] }) },
  { id: "bunrieu", name: "Bún Riêu", category: "food", price: 45000, day: 3, cookAt: "stove", plating: "CHAN RIÊU CUA", visual: V({ vessel: "bowl", base: "vermi", broth: "#d95330", items: ["cua", "dau", "rau"] }) },
  { id: "bundau", name: "Bún Đậu", category: "food", price: 45000, day: 3, cookAt: "stove", plating: "CHẤM MẮM TÔM", visual: V({ vessel: "tray", base: "vermi", items: ["dau", "mamtom", "rau", "dualeo"] }) },
  { id: "mitron", name: "Mì Trộn", category: "food", price: 38000, day: 3, cookAt: "stove", plating: "TRỘN SỐT", visual: V({ vessel: "plate", base: "ymen", items: ["cha", "rau", "lac", "dua"] }) },
  { id: "bokho", name: "Bò Kho", category: "food", price: 50000, day: 3, cookAt: "stove", plating: "MÚC BÒ KHO", visual: V({ vessel: "bowl", base: "pho", broth: "#a34a20", items: ["bo", "carot", "rau"] }) },
  { id: "banhbao", name: "Bánh Bao", category: "food", price: 22000, day: 3, cookAt: "oven", plating: "HẤP & BÀY", visual: V({ vessel: "tray", items: ["bao", "bao", "bao"] }) },
  { id: "banhcuon", name: "Bánh Cuốn", category: "food", price: 38000, day: 3, cookAt: "stove", plating: "RẮC HÀNH PHI", visual: V({ vessel: "plate", base: "sheet", items: ["cha", "hanh", "rau", "nuocmam"] }) },
  { id: "banhuot", name: "Bánh Ướt", category: "food", price: 35000, day: 3, cookAt: "stove", plating: "CUỐN THỊT NƯỚNG", visual: V({ vessel: "plate", base: "sheet", items: ["bo", "rau", "nuocmam"] }) },
  { id: "banhcanh", name: "Bánh Canh", category: "food", price: 40000, day: 4, cookAt: "stove", plating: "CHAN NƯỚC DÙNG", visual: V({ vessel: "bowl", base: "thick", broth: "#e8b060", items: ["tom", "hanh", "rau"] }) },
  { id: "banhcanhcua", name: "Bánh Canh Cua", category: "food", price: 50000, day: 4, cookAt: "stove", plating: "BÀY THỊT CUA", visual: V({ vessel: "bowl", base: "thick", broth: "#e8823a", items: ["cua", "tom", "hanh"] }) },
  { id: "miquang", name: "Mì Quảng", category: "food", price: 48000, day: 4, cookAt: "stove", plating: "CHAN NƯỚC VÀNG", visual: V({ vessel: "bowl", base: "ymen", broth: "#e0a437", items: ["tom", "lac", "rau", "banhtrang"] }) },
  { id: "bunthitnuong", name: "Bún Thịt Nướng", category: "food", price: 45000, day: 4, cookAt: "stove", plating: "RƯỚI NƯỚC MẮM", visual: V({ vessel: "bowl", base: "vermi", items: ["cha", "dua", "lac", "rau", "nuocmam"] }) },
  { id: "mienga", name: "Miến Gà", category: "food", price: 40000, day: 4, cookAt: "stove", plating: "CHAN NƯỚC DÙNG", visual: V({ vessel: "bowl", base: "glassN", broth: "#e8cf9a", items: ["ga", "rau", "hanh"] }) },
  { id: "chaoga", name: "Cháo Gà", category: "food", price: 35000, day: 4, cookAt: "stove", plating: "RẮC HÀNH LÁ", visual: V({ vessel: "bowl", base: "porridge", broth: "#f0e6d2", items: ["ga", "hanh", "rau"] }) },
  { id: "chaolong", name: "Cháo Lòng", category: "food", price: 38000, day: 4, cookAt: "stove", plating: "BÀY LÒNG", visual: V({ vessel: "bowl", bowlC: "#3d3428", base: "porridge", broth: "#e6d9c2", items: ["huyet", "dau", "rau"] }) },
  { id: "comnieu", name: "Cơm Niêu", category: "food", price: 45000, day: 5, cookAt: "oven", plating: "ĐẬP NIÊU ĐẤT", visual: V({ vessel: "clay", base: "rice", items: ["hanh"] }) },
  { id: "comchienhaisan", name: "Cơm Chiên Hải Sản", category: "food", price: 48000, day: 5, cookAt: "stove", plating: "XỚI CƠM CHIÊN", visual: V({ vessel: "plate", base: "fryrice", items: ["tom", "trung", "rau"] }) },
  { id: "comchay", name: "Cơm Chay", category: "food", price: 35000, day: 5, cookAt: "stove", plating: "BÀY ĐỒ CHAY", visual: V({ vessel: "leaf", base: "rice", items: ["dau", "rau", "carot"] }) },
  { id: "banhkhot", name: "Bánh Khọt", category: "food", price: 40000, day: 5, cookAt: "oven", plating: "ĐỔ BÁNH KHỌT", visual: V({ vessel: "tray", items: ["khot", "khot", "khot", "khot", "rau"] }) },

  // ---------------- NƯỚC UỐNG ----------------
  { id: "trada", name: "Trà Đá", category: "drink", price: 8000, day: 1, cookAt: "bar", plating: "LẮC & RÓT", visual: V({ vessel: "glass", drink: { liq: ["#f2e2a8", "#d8c070"], straw: "#ff4b3e" } }) },
  { id: "trachanh", name: "Trà Chanh", category: "drink", price: 12000, day: 1, cookAt: "bar", plating: "LẮC & RÓT", visual: V({ vessel: "glass", drink: { liq: ["#f0e08a", "#d4b850"], slice: "chanh", straw: "#43d97b" } }) },
  { id: "nuocmia", name: "Nước Mía", category: "drink", price: 15000, day: 1, cookAt: "bar", plating: "LẮC & RÓT", visual: V({ vessel: "glass", drink: { liq: ["#d8e8a0", "#b4cc70"], slice: "chanh", straw: "#2ec4b6" } }) },
  { id: "coca", name: "Coca Cola", category: "drink", price: 15000, day: 2, cookAt: "bar", plating: "RÓT CÓ GA", visual: V({ vessel: "glass", drink: { liq: ["#5c3317", "#2e1a0c"], bubbles: true, straw: "#ff4b3e" } }) },
  { id: "tradao", name: "Trà Đào", category: "drink", price: 20000, day: 2, cookAt: "bar", plating: "LẮC & RÓT", visual: V({ vessel: "glass", drink: { liq: ["#f0b46a", "#d89040"], slice: "dao", straw: "#ffd23f" } }) },
  { id: "cafesua", name: "Cà Phê Sữa", category: "drink", price: 22000, day: 2, cookAt: "bar", plating: "Khuấy ĐỀU", visual: V({ vessel: "glass", drink: { liq: ["#8a5a33", "#f2e8d8"], straw: "#8a5a33" } }) },
  { id: "cafeden", name: "Cà Phê Đen", category: "drink", price: 18000, day: 3, cookAt: "bar", plating: "PHA PHIN", visual: V({ vessel: "glass", drink: { liq: ["#3d2314", "#1a0e06"], straw: "#3d2314" } }) },
  { id: "matcha", name: "Matcha Latte", category: "drink", price: 28000, day: 3, cookAt: "bar", plating: "ĐÁNH BỌT", visual: V({ vessel: "glass", drink: { liq: ["#7ab854", "#f2f0e8"], foam: true, straw: "#7ab854" } }) },
  { id: "tragung", name: "Trà Gừng", category: "drink", price: 15000, day: 3, cookAt: "bar", plating: "HÃM GỪNG", visual: V({ vessel: "glass", drink: { liq: ["#e0b060", "#c08838"], slice: "gung", straw: "#c08838" } }) },
  { id: "trabidao", name: "Trà Bí Đao", category: "drink", price: 15000, day: 4, cookAt: "bar", plating: "LẮC & RÓT", visual: V({ vessel: "glass", drink: { liq: ["#8a5a33", "#5c3a1e"], straw: "#8a5a33" } }) },
  { id: "bodua", name: "Bơ Dừa", category: "drink", price: 30000, day: 4, cookAt: "bar", plating: "XAY NHUYỄN", visual: V({ vessel: "glass", drink: { liq: ["#9cc06a", "#7aa048"], thick: true, straw: "#ff8ab0" } }) },
];

const byId = new Map(DISHES.map((d) => [d.id, d]));
export function dishById(id: DishId): Dish {
  return byId.get(id)!;
}

// ---------------- ngày chơi ----------------

export const DAYS: DayConfig[] = [
  {
    day: 1, name: "Khai Trương", time: 210, tables: 3, patience: 40,
    spawnMin: 6.5, spawnMax: 9, goal: 500000, cookSpeed: 0.85, drinkChance: 0.35,
    dishIds: ["phobo", "phoga", "comgachien", "xoi", "goicuon", "banhmi"],
    drinkIds: ["trada", "trachanh", "nuocmia"],
    newIds: ["phobo", "phoga", "comgachien", "xoi", "goicuon", "banhmi", "trada", "trachanh", "nuocmia"],
    tip: "Món cầu kỳ (nhiều chấm đỏ) khách chờ lâu, nước uống thì khách giục sớm. Khách bỏ đi KHÔNG thua — chỉ bị PHẠT 50% giá món. Hết 3:30 mà không đạt mục tiêu mới thua!",
  },
  {
    day: 2, name: "Đông Khách", time: 210, tables: 4, patience: 34,
    spawnMin: 5.5, spawnMax: 7.5, goal: 800000, cookSpeed: 0.95, drinkChance: 0.45,
    dishIds: ["buncha", "bunbo", "hutieu", "comtam", "comtron", "supcua"],
    drinkIds: ["coca", "tradao", "cafesua"],
    newIds: ["buncha", "bunbo", "hutieu", "comtam", "comtron", "supcua", "coca", "tradao", "cafesua"],
    tip: "Khách ít kiên nhẫn hơn — ưu tiên khách vòng vàng/đỏ. Nước giải khát giúp kéo dài thời gian khách ngồi!",
  },
  {
    day: 3, name: "Chợ Đêm", time: 210, tables: 4, patience: 29,
    spawnMin: 5, spawnMax: 6.5, goal: 950000, cookSpeed: 1.05, drinkChance: 0.45,
    dishIds: ["bunrieu", "bundau", "mitron", "bokho", "banhbao", "banhcuon", "banhuot"],
    drinkIds: ["cafeden", "matcha", "tragung"],
    newIds: ["bunrieu", "bundau", "mitron", "bokho", "banhbao", "banhcuon", "banhuot", "cafeden", "matcha", "tragung"],
    tip: "Canh lửa trượt là CHÁY — mang đổ thùng rác rồi nấu lại. Đừng bưng đồ cháy cho khách!",
  },
  {
    day: 4, name: "Hội Ẩm Thực", time: 210, tables: 5, patience: 26,
    spawnMin: 4.5, spawnMax: 6, goal: 1150000, cookSpeed: 1.15, drinkChance: 0.5,
    dishIds: ["banhcanh", "banhcanhcua", "miquang", "bunthitnuong", "mienga", "chaoga", "chaolong"],
    drinkIds: ["trabidao", "bodua", "nuocmia"],
    newIds: ["banhcanh", "banhcanhcua", "miquang", "bunthitnuong", "mienga", "chaoga", "chaolong", "trabidao", "bodua"],
    tip: "5 bàn cùng lúc! Khách gọi nước sẽ ngồi lâu hơn sau khi ăn — tranh thủ bưng nước để ăn tiền kép.",
  },
  {
    day: 5, name: "Giờ Cao Điểm", time: 210, tables: 6, patience: 23,
    spawnMin: 4, spawnMax: 5.5, goal: 1350000, cookSpeed: 1.25, drinkChance: 0.5,
    dishIds: ["comnieu", "comchienhaisan", "comchay", "banhkhot", "phobo", "buncha", "hutieu", "bokho"],
    drinkIds: ["trada", "matcha", "coca", "tradao"],
    newIds: ["comnieu", "comchienhaisan", "comchay", "banhkhot"],
    tip: "Cả 6 bàn sáng đèn. Phục vụ khi khách còn vòng XANH để nhận tip — chuỗi combo nhân tiền tới ×2!",
  },
];

// ---------------- khách hàng ----------------

export const CUSTOMER_TYPES: CustomerType[] = [
  { id: "xichlo", name: "Chú xích lô", skin: "#e8b088", shirt: "#3f7d4e", hair: "#3a2a1e", hat: "helmet", hatColor: "#5d7a3a", patienceMul: 1, tipMul: 1 },
  { id: "vanphong", name: "Chị văn phòng", skin: "#f2c9a5", shirt: "#d94f70", hair: "#3a2a2a", hat: "none", hatColor: "#000", patienceMul: 0.82, tipMul: 1.5 },
  { id: "taybalo", name: "Anh Tây balo", skin: "#e5a07a", shirt: "#2f6fb3", hair: "#c98a3b", hat: "cap", hatColor: "#c0392b", patienceMul: 1.3, tipMul: 1.8 },
  { id: "sinhvien", name: "Cô sinh viên", skin: "#f5d0ae", shirt: "#8e5ab8", hair: "#2a2026", hat: "none", hatColor: "#000", patienceMul: 1.05, tipMul: 1.1 },
  { id: "bacu", name: "Bà cụ đầu ngõ", skin: "#e0b491", shirt: "#7a6a52", hair: "#cfcfcf", hat: "nonla", hatColor: "#d9b877", patienceMul: 1.4, tipMul: 1.2 },
];

export const HAPPY_LINES = ["Ngon bá cháy!", "Đúng vị luôn!", "Tuyệt cú mèo!", "10 điểm!", "Êm cái bụng!", "Ngon như mẹ nấu!"];
export const TIP_LINES = ["Tip cho chef nè!", "Boa mạnh luôn!", "Xứng đáng từng đồng!"];
export const DRINK_LINES = ["Nước ngon!", "Đã khát ghê!", "Mát lạnh luôn!", "Êm cổ họng!"];
export const ANGRY_LINES = ["Chờ mòn mỏi!", "Thôi tôi đi đây!", "Lâu hơn tắc đường!", "Hừ! Sang quán khác!"];
export const WRONG_LINES = ["Nhầm món rồi!", "Đâu phải món này!", "Ô kìa, nhầm rồi!"];

// ---------------- nguyên liệu sơ chế ----------------

export const VESSEL_LABEL: Record<string, string> = {
  bowl: "Tô sạch",
  plate: "Đĩa trắng",
  tray: "Mẹt tre",
  leaf: "Lá chuối",
  clay: "Niêu đất",
  loaf: "Ổ bánh mì",
};

export const BASE_LABEL: Record<string, string> = {
  pho: "Bánh phở",
  vermi: "Bún tươi",
  thick: "Sợi bánh canh",
  ymen: "Mì vàng",
  glassN: "Miến dong",
  rice: "Cơm trắng",
  yrice: "Xôi nếp",
  porridge: "Cháo trắng",
  fryrice: "Cơm chiên",
  sheet: "Bánh cuốn",
};

export const ITEM_LABEL: Record<string, string> = {
  bo: "Thịt bò",
  ga: "Thịt gà",
  gachien: "Gà chiên giòn",
  cha: "Chả nướng",
  tom: "Tôm tươi",
  cua: "Thịt cua",
  trung: "Trứng",
  xiu: "Xíu mại",
  dau: "Đậu hũ",
  rau: "Rau thơm",
  dua: "Đồ chua",
  lac: "Đậu phộng",
  chanh: "Chanh ớt",
  dualeo: "Dưa leo",
  goi: "Bánh tráng cuốn",
  suon: "Sườn nướng",
  huyet: "Lòng heo",
  hanh: "Hành lá",
  carot: "Cà rốt",
  banhtrang: "Bánh tráng",
  nuocmam: "Nước mắm",
  mamtom: "Mắm tôm",
  bao: "Bánh bao",
  khot: "Bánh khọt",
};

export const ALL_INGREDIENTS: string[] = Object.values(ITEM_LABEL);

/** Danh sách nguyên liệu cần bỏ vào đồ đựng khi sơ chế một món ăn. */
export function dishIngredients(d: Dish): string[] {
  const v = d.visual;
  const out: string[] = [];
  const vessel = VESSEL_LABEL[v.vessel];
  if (vessel) out.push(vessel);
  if (v.base) out.push(BASE_LABEL[v.base]);
  if (v.broth) out.push("Nước dùng");
  if (v.items) for (const it of v.items) out.push(ITEM_LABEL[it]);
  return out.filter((x, i) => out.indexOf(x) === i);
}

/**
 * Hệ số kiên nhẫn theo độ cầu kỳ của món.
 * Món nhiều nguyên liệu → khách thông cảm chờ lâu hơn; nước uống pha nhanh → khách giục sớm.
 */
export function dishPatienceFactor(d: Dish): number {
  if (d.category === "drink") return 0.7;
  const n = dishIngredients(d).length;
  return Math.max(0.7, Math.min(1.5, 0.7 + n * 0.11));
}

// ---------------- tủ đồ đầu bếp ----------------

export const HATS: HatDef[] = [
  { id: 0, name: "Nón Lá" },
  { id: 1, name: "Mũ Lưỡi Trai" },
  { id: 2, name: "Mũ Cối" },
  { id: 3, name: "Mũ Bảo Hiểm" },
  { id: 4, name: "Mũ Phớt" },
  { id: 5, name: "Mũ Len" },
  { id: 6, name: "Mũ Đầu Bếp" },
  { id: 7, name: "Mũ Bucket" },
  { id: 8, name: "Khăn Rằn" },
  { id: 9, name: "Băng Đô Sao" },
];

export const SHIRTS: ShirtDef[] = [
  { id: 0, name: "Áo Bà Ba Nâu", color: "#8a5a33", accent: "#5d3717" },
  { id: 1, name: "Thun Hàng Quán", color: "#c0392b", accent: "#f0cd7e" },
  { id: 2, name: "Sơ Mi Caro", color: "#b03a2e", accent: "#f2e3c2" },
  { id: 3, name: "Bà Ba Xanh Ngọc", color: "#2e8f86", accent: "#a8efe6" },
  { id: 4, name: "Khoác Da", color: "#2b2b30", accent: "#9aa0a8" },
  { id: 5, name: "Thun Sao Vàng", color: "#e8b52a", accent: "#c0392b" },
  { id: 6, name: "Sơ Mi Trắng", color: "#f2ead8", accent: "#3a4a5c" },
  { id: 7, name: "Hoodie Xám", color: "#7d8a97", accent: "#3a424c" },
  { id: 8, name: "Thun Lá Xanh", color: "#3f7d4e", accent: "#a8e05f" },
  { id: 9, name: "Áo Dài Hồng", color: "#e0789a", accent: "#f7d9e4" },
];

export const DEFAULT_LOOK: ChefLook = { hat: 0, shirt: 1 };
const LOOK_KEY = "hqv-look";

export function loadLook(): ChefLook {
  try {
    const raw = localStorage.getItem(LOOK_KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<ChefLook>;
      return {
        hat: typeof o.hat === "number" ? ((o.hat % 10) + 10) % 10 : 0,
        shirt: typeof o.shirt === "number" ? ((o.shirt % 10) + 10) % 10 : 1,
      };
    }
  } catch {
    /* bỏ qua */
  }
  return { ...DEFAULT_LOOK };
}

export function saveLook(l: ChefLook): void {
  try {
    localStorage.setItem(LOOK_KEY, JSON.stringify(l));
  } catch {
    /* bỏ qua */
  }
}
