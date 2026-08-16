
// ============================================================
// character.ts — Thực thể: đầu bếp & khách hàng (tạo, ngoại hình, di chuyển)
// ============================================================

import type {
  ChefState,
  Customer,
  CustomerType,
  Dish,
  PersonLook,
  TablePos,
  Vec2,
} from "./types";
import { CUSTOMER_TYPES } from "./food";
import { clamp, pick, rand } from "./utils";

// ---------------- đầu bếp ----------------

export function createChef(x: number, y: number): ChefState {
  return { x, y, target: null, dir: 1, walkT: 0, moving: false };
}

/**
 * Di chuyển đầu bếp về phía mục tiêu. Trả về true khi đã tới nơi.
 */
export function stepChefToward(
  chef: ChefState,
  speed: number,
  dt: number,
  bounds: { x0: number; y0: number; x1: number; y1: number }
): boolean {
  if (!chef.target) return false;
  const dx = chef.target.x - chef.x;
  const dy = chef.target.y - chef.y;
  const d = Math.hypot(dx, dy);
  const sp = speed * dt;
  if (d <= sp) {
    chef.x = chef.target.x;
    chef.y = chef.target.y;
    chef.target = null;
    chef.moving = false;
    return true;
  }
  chef.x = clamp(chef.x + (dx / d) * sp, bounds.x0, bounds.x1);
  chef.y = clamp(chef.y + (dy / d) * sp, bounds.y0, bounds.y1);
  if (Math.abs(dx) > 2) chef.dir = dx > 0 ? 1 : -1;
  chef.moving = true;
  return false;
}

// ---------------- khách hàng ----------------

const HAT_BY_TYPE: Record<string, number> = {
  xichlo: 2,
  vanphong: 3,
  taybalo: 1,
  sinhvien: 9,
  bacu: 0,
};

const STYLE_BY_TYPE: Record<string, number> = {
  xichlo: 0,
  vanphong: 1,
  taybalo: 0,
  sinhvien: 3,
  bacu: 2,
};

/** Tạo ngoại hình riêng cho từng khách dựa trên kiểu người + id (đa dạng mũ/áo). */
export function customerLookFor(type: CustomerType, id: number): PersonLook {
  return {
    skin: type.skin,
    hairColor: type.hair,
    hairStyle: STYLE_BY_TYPE[type.id] ?? id % 5,
    hat: HAT_BY_TYPE[type.id] ?? id % 10,
    shirt: id % 10,
    pants: "#4a3a2a",
    shoe: "#2e241a",
  };
}

/**
 * Sinh một khách hàng mới tại cửa, đi về phía bàn được chỉ định.
 */
export function spawnCustomer(
  id: number,
  table: number,
  dish: Dish,
  drink: Dish | null,
  patience: number,
  door: Vec2,
  seat: Vec2
): Customer {
  const type = pick(CUSTOMER_TYPES);
  return {
    id,
    type,
    table,
    dish,
    drink,
    gotFood: false,
    gotDrink: false,
    x: door.x,
    y: door.y,
    state: "walkin",
    happy: false,
    patience,
    maxPatience: patience,
    bobT: rand(0, 10),
    waitT: 0,
    eatT: 0,
    dialog: null,
    look: customerLookFor(type, id),
  };
}

export function seatOf(table: TablePos): Vec2 {
  return { x: table.x, y: table.y - 56 };
}

/**
 * Cập nhật trạng thái khách hàng.
 * - "full": đang chơi thật (giảm kiên nhẫn khi chờ món).
 * - false: chế độ nền (khách không bị hết kiên nhẫn).
 * Trả về "expired" nếu khách bỏ đi vì hết kiên nhẫn, "gone" nếu đã rời màn hình.
 */
export function updateCustomer(
  c: Customer,
  dt: number,
  seat: Vec2,
  door: Vec2,
  full: boolean
): "ok" | "expired" | "gone" {
  const impatient = c.state === "sit" && !c.gotFood && c.patience < c.maxPatience * 0.35;
  c.bobT += dt * (c.state === "walkin" || c.state === "leave" ? 9 : impatient ? 7 : 3);

  if (c.dialog) {
    c.dialog.t -= dt;
    if (c.dialog.t <= 0) c.dialog = null;
  }

  if (c.state === "walkin") {
    const dx = seat.x - c.x;
    const dy = seat.y - c.y;
    const d = Math.hypot(dx, dy);
    const sp = 150 * dt;
    if (d <= sp) {
      c.x = seat.x;
      c.y = seat.y;
      c.state = "sit";
    } else {
      c.x += (dx / d) * sp;
      c.y += (dy / d) * sp;
    }
    return "ok";
  }

  if (c.state === "sit") {
    if (full && !c.gotFood) {
      c.waitT += dt;
      c.patience -= dt;
      if (c.patience <= 0) return "expired";
    }
    return "ok";
  }

  if (c.state === "eat") {
    c.eatT -= dt;
    if (c.eatT <= 0) {
      c.state = "leave";
      c.happy = true;
    }
    return "ok";
  }

  // leave — đi ra cửa
  const dx = door.x - 30 - c.x;
  const dy = door.y - 20 - c.y;
  const d = Math.hypot(dx, dy);
  const sp = (c.happy ? 130 : 190) * dt;
  if (d <= sp || c.x < 40) return "gone";
  c.x += (dx / d) * sp;
  c.y += (dy / d) * sp;
  return "ok";
}
