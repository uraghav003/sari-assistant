import { useEffect, useRef } from "react";

interface Props {
  speaking: boolean;
  typing: boolean;
}

export default function AvatarCanvas({ speaking, typing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSpeakingRef = useRef(speaking);
  const isThinkingRef = useRef(typing);

  useEffect(() => { isSpeakingRef.current = speaking; }, [speaking]);
  useEffect(() => { isThinkingRef.current = typing; }, [typing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let eyeBlink = 0;
    let blinkSpeed = 0.08;
    let nextBlinkTime = Date.now() + 2500;
    let mouthOpenness = 0;

    const particles = Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2,
      speed: 0.008 + (i % 3) * 0.004,
      radius: 130 + (i % 4) * 20,
      size: 1.5 + (i % 3),
    }));

    function animateAvatar(timestamp: number) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const isThinking = isThinkingRef.current;
      const isSpeaking = isSpeakingRef.current;

      const breathe = Math.sin(timestamp * 0.0018) * 4;
      const headY = cy + breathe;

      if (Date.now() > nextBlinkTime) {
        eyeBlink += blinkSpeed;
        if (eyeBlink >= 1) {
          blinkSpeed = -0.12;
        } else if (eyeBlink <= 0) {
          eyeBlink = 0;
          blinkSpeed = 0.08;
          nextBlinkTime = Date.now() + 2500 + Math.random() * 3000;
        }
      }

      mouthOpenness = isSpeaking ? Math.abs(Math.sin(timestamp * 0.016)) * 6 : 0;

      // Holographic Aura
      const auraGrad = ctx.createRadialGradient(cx, headY, 20, cx, headY, 170);
      auraGrad.addColorStop(0, isThinking ? "rgba(0, 255, 213, 0.18)" : "rgba(0, 255, 213, 0.05)");
      auraGrad.addColorStop(1, "transparent");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, headY, 170, 0, Math.PI * 2);
      ctx.fill();

      // Orbital Rings
      ctx.save();
      ctx.translate(cx, headY);

      ctx.save();
      ctx.rotate(0.35 + Math.sin(timestamp * 0.0006) * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, 160, 58, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isThinking ? "rgba(0, 255, 213, 0.6)" : "rgba(0, 255, 213, 0.2)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.rotate(-0.45 - Math.sin(timestamp * 0.0008) * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, 170, 48, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Orbiting Particles
      particles.forEach((p) => {
        p.angle += p.speed * (isThinking ? 2.5 : 1);
        const px = Math.cos(p.angle) * p.radius;
        const py = Math.sin(p.angle) * (p.radius * 0.35);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isThinking ? "#ffffff" : "#00ffd5";
        ctx.shadowColor = "#00ffd5";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.restore();

      // Face
      ctx.save();
      ctx.translate(cx, headY);

      ctx.beginPath();
      ctx.ellipse(0, -10, 75, 100, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-45, -18);
      ctx.quadraticCurveTo(-42, 42, -22, 68);
      ctx.quadraticCurveTo(0, 80, 22, 68);
      ctx.quadraticCurveTo(42, 42, 45, -18);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -38, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcf77";
      ctx.shadowColor = "#ffcf77";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(0, 255, 213, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-36, -18);
      ctx.quadraticCurveTo(-22, -24, -8, -18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.quadraticCurveTo(22, -24, 36, -18);
      ctx.stroke();

      const eyeHeight = Math.max(1, 6 * (1 - eyeBlink));
      ctx.strokeStyle = "#00ffd5";
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.ellipse(-22, -8, 10, eyeHeight, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (eyeBlink < 0.6) {
        ctx.beginPath();
        ctx.arc(-22, -8, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00ffd5";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.ellipse(22, -8, 10, eyeHeight, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (eyeBlink < 0.6) {
        ctx.beginPath();
        ctx.arc(22, -8, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00ffd5";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-2, 18);
      ctx.lineTo(3, 22);
      ctx.lineTo(0, 23);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      if (mouthOpenness > 0.5) {
        ctx.ellipse(0, 46, 10, mouthOpenness, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#00ffd5";
        ctx.fillStyle = "rgba(0, 255, 213, 0.25)";
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.moveTo(-12, 46);
        ctx.quadraticCurveTo(0, 50, 12, 46);
        ctx.strokeStyle = "rgba(0, 255, 213, 0.7)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      [-40, 40].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, -6, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 213, 0.8)";
        ctx.fill();
      });

      ctx.restore();
      animId = requestAnimationFrame(animateAvatar);
    }

    animId = requestAnimationFrame(animateAvatar);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={340}
      aria-hidden="true"
      style={{ width: "100%", maxWidth: 360, height: "auto" }}
    />
  );
}
