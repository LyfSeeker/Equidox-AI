"use client";

import { useEffect, useRef } from "react";

export default function ParticleBackground({
  className = "fixed inset-0 pointer-events-none -z-50 bg-transparent",
  contained = false,
}: {
  className?: string;
  contained?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const resizeCanvas = () => {
      const bounds = contained ? canvas.getBoundingClientRect() : null;
      canvas.width = Math.max(
        1,
        Math.round(bounds?.width || window.innerWidth)
      );
      canvas.height = Math.max(
        1,
        Math.round(bounds?.height || window.innerHeight)
      );
      init();
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 1.5 + 0.5; // Small dots
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0) this.x = canvas!.width;
        if (this.x > canvas!.width) this.x = 0;
        if (this.y < 0) this.y = canvas!.height;
        if (this.y > canvas!.height) this.y = 0;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    const init = () => {
      particlesArray = [];
      const numberOfParticles = (canvas.width * canvas.height) / 8000;
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = contained ? new ResizeObserver(resizeCanvas) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [contained]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
    />
  );
}
