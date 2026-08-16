
import { useEffect, useRef, useState } from "react";
import { Game } from "../scripts/game";

/**
 * GameMap — khung hiển thị của game.
 * Dựng canvas, khởi tạo vòng lặp game và trang trí lồng đèn SVG quanh mép màn hình.
 */
export function GameMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
      <Lantern side="left" />
      <Lantern side="right" />
    </div>
  );
}

function Lantern({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      width="64"
      height="150"
      viewBox="0 0 64 150"
      style={{
        position: "fixed",
        top: 0,
        [side]: 14,
        pointerEvents: "none",
        opacity: 0.55,
        animation: `sway-${side} 3.6s ease-in-out infinite`,
        transformOrigin: "top center",
        filter: "drop-shadow(0 0 18px rgba(255,110,50,0.5))",
      }}
    >
      <style>{`
        @keyframes sway-left { 0%,100% { transform: rotate(-4deg);} 50% { transform: rotate(4deg);} }
        @keyframes sway-right { 0%,100% { transform: rotate(4deg);} 50% { transform: rotate(-4deg);} }
      `}</style>
      <line x1="32" y1="0" x2="32" y2="30" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <rect x="24" y="28" width="16" height="6" rx="3" fill="#d9a441" />
      <ellipse cx="32" cy="70" rx="22" ry="30" fill="#d63a2e" />
      <ellipse cx="32" cy="70" rx="22" ry="30" fill="url(#glowL)" />
      <defs>
        <radialGradient id="glowL" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="rgba(255,180,110,0.75)" />
          <stop offset="100%" stopColor="rgba(194,43,30,0)" />
        </radialGradient>
      </defs>
      <path d="M32 40 v60 M20 46 q-4 24 0 48 M44 46 q4 24 0 48" stroke="rgba(140,25,15,0.5)" strokeWidth="1.2" fill="none" />
      <rect x="24" y="100" width="16" height="6" rx="3" fill="#d9a441" />
      <line x1="32" y1="106" x2="32" y2="126" stroke="#d9a441" strokeWidth="2" />
      <circle cx="32" cy="130" r="4" fill="#d9a441" />
      <line x1="32" y1="134" x2="32" y2="146" stroke="#d63a2e" strokeWidth="2" />
    </svg>
  );
}
