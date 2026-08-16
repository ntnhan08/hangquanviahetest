
import { useLayoutEffect, useRef, useState } from "react";
import { Game } from "../scripts/game";

/**
 * GameMap — khung hiển thị của game.
 * Dựng canvas, khởi tạo vòng lặp game và trang trí lồng đèn SVG quanh mép màn hình.
 * Phong cách: Digital Hand-drawn + Nostalgic Vietnamese Vibe + Isometric UI
 */
export function GameMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let game: Game | null = null;
    try {
      game = new Game(cv);
      (window as unknown as { __hqv: Game }).__hqv = game;
    } catch (err) {
      console.error("Không khởi tạo được game:", err);
      setFailed(true);
    }
    return () => {
      game?.destroy();
    };
  }, []);

  return (
    <div className="game-root">
      {!failed && <canvas ref={canvasRef} className="game-canvas" />}
      {failed && (
        <div className="boot-fallback">
          <div style={{ fontSize: 28 }}>HÀNG QUÁN VỈA HÈ</div>
          <small>Trình duyệt của bạn không hỗ trợ Canvas 2D để chạy game.</small>
        </div>
      )}
      {/* Decorative lanterns with hand-drawn style - positioned inside game-root for fullscreen */}
      <Lantern side="left" />
      <Lantern side="right" />
      {/* Isometric corner decorations - inside game-root for fullscreen */}
      <IsometricCorner type="top-left" />
      <IsometricCorner type="top-right" />
      <IsometricCorner type="bottom-left" />
      <IsometricCorner type="bottom-right" />
    </div>
  );
}

function Lantern({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      width="60"
      height="140"
      viewBox="0 0 72 160"
      className={`lantern lantern-${side}`}
      style={{
        position: "absolute",
        top: "0",
        [side]: "0",
        pointerEvents: "none",
        opacity: 0.5,
        animation: `sway-${side} 4s ease-in-out infinite`,
        transformOrigin: "top center",
        filter: "drop-shadow(0 0 24px rgba(255,180,80,0.6))",
        zIndex: 1000,
      }}
    >
      {/* Hand-drawn rope with slight wobble */}
      <path
        d="M36 0 Q34 15 36 30"
        stroke="rgba(139,90,43,0.6)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Lantern top cap - brass/gold */}
      <rect x="26" y="28" width="20" height="8" rx="4" fill="#d9a441" stroke="#8b5a2b" strokeWidth="1" />
      {/* Main lantern body - red lacquer */}
      <ellipse cx="36" cy="75" rx="26" ry="35" fill="#d63a2e" stroke="#8b231a" strokeWidth="1.5" />
      {/* Inner glow effect */}
      <ellipse cx="36" cy="75" rx="26" ry="35" fill="url(#glowL)" />
      {/* Hand-drawn vertical ribs */}
      <path d="M36 45 v60" stroke="rgba(100,20,15,0.4)" strokeWidth="1" fill="none" />
      <path d="M18 52 q-5 23 0 46" stroke="rgba(100,20,15,0.35)" strokeWidth="1" fill="none" />
      <path d="M54 52 q5 23 0 46" stroke="rgba(100,20,15,0.35)" strokeWidth="1" fill="none" />
      {/* Bottom cap - brass/gold */}
      <rect x="26" y="108" width="20" height="8" rx="4" fill="#d9a441" stroke="#8b5a2b" strokeWidth="1" />
      {/* Hanging tassel stem */}
      <line x1="36" y1="116" x2="36" y2="132" stroke="#d9a441" strokeWidth="2.5" />
      {/* Tassel ball */}
      <circle cx="36" cy="136" r="6" fill="#d9a441" stroke="#8b5a2b" strokeWidth="1" />
      {/* Tassel threads */}
      <line x1="36" y1="142" x2="34" y2="155" stroke="#d63a2e" strokeWidth="1.5" />
      <line x1="36" y1="142" x2="38" y2="155" stroke="#d63a2e" strokeWidth="1.5" />
      <line x1="36" y1="142" x2="36" y2="158" stroke="#d63a2e" strokeWidth="1.5" />

      <defs>
        <radialGradient id="glowL" cx="45%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,200,120,0.85)" />
          <stop offset="50%" stopColor="rgba(255,160,80,0.4)" />
          <stop offset="100%" stopColor="rgba(194,43,30,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Isometric corner decoration components for Vietnamese street vibe
function IsometricCorner({ type }: { type: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const getPosition = () => {
    switch (type) {
      case "top-left": return { top: "0", left: "0", rotate: "rotate(0deg)" };
      case "top-right": return { top: "0", right: "0", rotate: "rotate(90deg)" };
      case "bottom-left": return { bottom: "0", left: "0", rotate: "rotate(-90deg)" };
      case "bottom-right": return { bottom: "0", right: "0", rotate: "rotate(180deg)" };
    }
  };

  const pos = getPosition();

  return (
    <svg
      aria-hidden
      width="60"
      height="60"
      viewBox="0 0 80 80"
      style={{
        position: "absolute",
        ...pos,
        pointerEvents: "none",
        opacity: 0.08,
        zIndex: 9997,
      }}
      className="isometric-corner"
    >
      {/* Traditional Vietnamese pattern - simplified lotus petal motif */}
      <g transform={`${pos.rotate} translate(0,0)`}>
        {/* Outer border triangle */}
        <path d="M0 0 L80 0 L0 80 Z" fill="#9c3324" />
        {/* Inner decorative lines - isometric grid pattern */}
        <path d="M10 0 L0 10 M20 0 L0 20 M30 0 L0 30 M40 0 L0 40 M50 0 L0 50 M60 0 L0 60 M70 0 L0 70"
              stroke="#f3e3c0" strokeWidth="0.5" opacity="0.5" />
        {/* Lotus petal design */}
        <ellipse cx="25" cy="25" rx="15" ry="8" fill="#d9a441" opacity="0.6" transform="rotate(45 25 25)" />
        <ellipse cx="25" cy="25" rx="15" ry="8" fill="#3f7d5c" opacity="0.5" transform="rotate(-45 25 25)" />
        {/* Center dot */}
        <circle cx="25" cy="25" r="4" fill="#33220f" opacity="0.7" />
      </g>
    </svg>
  );
}