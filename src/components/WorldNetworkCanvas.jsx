import { useEffect, useRef } from "react";


const MAP_ASPECT_RATIO = 228 / 111;
const BASE_IMAGE_URL = "/assets/company/world-network-base.png?v=20260718-1";
const GUANGZHOU = [0.736, 0.555];

const ROUTES = [
  { destination: [0.846, 0.405], arch: 0.09, speed: 0.086, delay: 0.08 },
  { destination: [0.902, 0.784], arch: 0.12, speed: 0.065, delay: 0.54 },
  { destination: [0.602, 0.53], arch: 0.1, speed: 0.074, delay: 0.28 },
  { destination: [0.515, 0.365], arch: 0.18, speed: 0.057, delay: 0.7 },
  { destination: [0.522, 0.718], arch: 0.19, speed: 0.052, delay: 0.42 },
  { destination: [0.305, 0.395], arch: 0.25, speed: 0.045, delay: 0.14 },
  { destination: [0.205, 0.448], arch: 0.3, speed: 0.041, delay: 0.62 },
  { destination: [0.315, 0.755], arch: 0.31, speed: 0.038, delay: 0.35 },
];


function quadraticPoint(start, control, end, progress) {
  const inverse = 1 - progress;
  return [
    inverse * inverse * start[0]
      + 2 * inverse * progress * control[0]
      + progress * progress * end[0],
    inverse * inverse * start[1]
      + 2 * inverse * progress * control[1]
      + progress * progress * end[1],
  ];
}


function drawGlowNode(context, x, y, radius, intensity, pulse = 0) {
  const glowRadius = radius * (3.8 + pulse * 1.5);
  const glow = context.createRadialGradient(x, y, 0, x, y, glowRadius);
  glow.addColorStop(0, `rgba(130, 236, 255, ${0.72 * intensity})`);
  glow.addColorStop(0.22, `rgba(28, 194, 247, ${0.42 * intensity})`);
  glow.addColorStop(1, "rgba(0, 132, 215, 0)");

  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, glowRadius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(77, 218, 255, ${(0.3 - pulse * 0.18) * intensity})`;
  context.lineWidth = 0.7;
  context.beginPath();
  context.arc(x, y, radius * (1.9 + pulse * 2.3), 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = `rgba(185, 247, 255, ${0.92 * intensity})`;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}


export default function WorldNetworkCanvas({ className = "" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const baseImage = new Image();
    let reducedMotion = motionPreference.matches;
    let imageReady = false;
    let visible = true;
    let frameId = 0;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;

    function resize() {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height || width / MAP_ASPECT_RATIO);
      pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);

      const nextWidth = Math.max(1, Math.round(width * pixelRatio));
      const nextHeight = Math.max(1, Math.round(height * pixelRatio));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      draw(performance.now());
    }

    function mapPoint(point, drawRect) {
      return [
        drawRect.x + point[0] * drawRect.width,
        drawRect.y + point[1] * drawRect.height,
      ];
    }

    function routeGeometry(route, drawRect) {
      const start = mapPoint(GUANGZHOU, drawRect);
      const end = mapPoint(route.destination, drawRect);
      const horizontalDistance = Math.abs(end[0] - start[0]);
      const control = [
        (start[0] + end[0]) / 2,
        Math.min(start[1], end[1])
          - drawRect.height * route.arch
          - horizontalDistance * 0.045,
      ];
      return { start, control, end };
    }

    function drawRoute(geometry, opacity) {
      const gradient = context.createLinearGradient(
        geometry.start[0],
        geometry.start[1],
        geometry.end[0],
        geometry.end[1],
      );
      gradient.addColorStop(0, `rgba(76, 223, 255, ${opacity * 0.78})`);
      gradient.addColorStop(0.48, `rgba(19, 163, 231, ${opacity})`);
      gradient.addColorStop(1, `rgba(94, 224, 255, ${opacity * 0.66})`);

      context.save();
      context.lineCap = "round";
      context.lineWidth = Math.max(0.55, width / 760);
      context.strokeStyle = gradient;
      context.shadowColor = "rgba(28, 190, 255, 0.55)";
      context.shadowBlur = Math.max(2.5, width / 120);
      context.beginPath();
      context.moveTo(geometry.start[0], geometry.start[1]);
      context.quadraticCurveTo(
        geometry.control[0],
        geometry.control[1],
        geometry.end[0],
        geometry.end[1],
      );
      context.stroke();
      context.restore();
    }

    function drawParticle(geometry, progress, intensity = 1) {
      const point = quadraticPoint(
        geometry.start,
        geometry.control,
        geometry.end,
        progress,
      );
      const radius = Math.max(0.9, width / 410);
      const glow = context.createRadialGradient(
        point[0],
        point[1],
        0,
        point[0],
        point[1],
        radius * 5.5,
      );
      glow.addColorStop(0, `rgba(221, 253, 255, ${0.98 * intensity})`);
      glow.addColorStop(0.2, `rgba(77, 222, 255, ${0.9 * intensity})`);
      glow.addColorStop(1, "rgba(0, 140, 255, 0)");

      context.fillStyle = glow;
      context.beginPath();
      context.arc(point[0], point[1], radius * 5.5, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(222, 253, 255, ${0.98 * intensity})`;
      context.beginPath();
      context.arc(point[0], point[1], radius, 0, Math.PI * 2);
      context.fill();
    }

    function draw(timestamp) {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const scale = Math.min(width / 228, height / 111);
      const drawRect = {
        width: 228 * scale,
        height: 111 * scale,
        x: (width - 228 * scale) / 2,
        y: (height - 111 * scale) / 2,
      };

      if (imageReady) {
        context.drawImage(
          baseImage,
          drawRect.x,
          drawRect.y,
          drawRect.width,
          drawRect.height,
        );
      } else {
        context.fillStyle = "#02080d";
        context.fillRect(0, 0, width, height);
      }

      const time = timestamp / 1000;
      const nodeRadius = Math.max(0.8, drawRect.width / 260);

      for (const [index, route] of ROUTES.entries()) {
        const geometry = routeGeometry(route, drawRect);
        drawRoute(geometry, reducedMotion ? 0.2 : 0.31);

        const pulse = reducedMotion
          ? 0
          : (Math.sin(time * 2.15 + index * 0.82) + 1) / 2;
        drawGlowNode(
          context,
          geometry.end[0],
          geometry.end[1],
          nodeRadius,
          0.62,
          pulse,
        );

        if (!reducedMotion) {
          const progress = (time * route.speed + route.delay) % 1;
          drawParticle(geometry, progress, 0.9);
          drawParticle(geometry, (progress + 0.58) % 1, 0.44);
        }
      }

      const source = mapPoint(GUANGZHOU, drawRect);
      const sourcePulse = reducedMotion ? 0 : (Math.sin(time * 2.6) + 1) / 2;
      drawGlowNode(context, source[0], source[1], nodeRadius * 1.25, 1, sourcePulse);
    }

    function animate(timestamp) {
      draw(timestamp);
      frameId = visible && !reducedMotion
        ? window.requestAnimationFrame(animate)
        : 0;
    }

    function restartAnimation() {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      if (visible && !reducedMotion) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        draw(performance.now());
      }
    }

    function handleMotionPreference(event) {
      reducedMotion = event.matches;
      restartAnimation();
    }

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      restartAnimation();
    }, { rootMargin: "120px" });

    baseImage.decoding = "async";
    baseImage.onload = () => {
      imageReady = true;
      restartAnimation();
    };
    baseImage.onerror = () => {
      imageReady = false;
      restartAnimation();
    };
    baseImage.src = BASE_IMAGE_URL;

    resizeObserver.observe(container);
    visibilityObserver.observe(container);
    motionPreference.addEventListener?.("change", handleMotionPreference);
    resize();
    restartAnimation();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      motionPreference.removeEventListener?.("change", handleMotionPreference);
      baseImage.onload = null;
      baseImage.onerror = null;
    };
  }, []);

  const classes = ["global-reach-map", className].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={classes}
      aria-hidden="true"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "228 / 111",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
