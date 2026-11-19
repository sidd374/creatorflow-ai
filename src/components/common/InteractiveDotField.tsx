import React, { useEffect, useRef } from 'react';

interface InteractiveDotFieldProps {
  /** Grid spacing in pixels (distance between adjacent dots) */
  dotSpacing?: number;
  /** Radius of each dot in pixels */
  dotSize?: number;
  /** Rest state opacity (0.0 to 1.0) */
  baseOpacity?: number;
  /** Radius of cursor influence in pixels */
  interactionRadius?: number;
  /** Max displacement force when cursor is closest */
  interactionStrength?: number;
  /** Spring return stiffness (0.05 to 0.3) */
  returnSpeed?: number;
  /** Optional custom CSS class */
  className?: string;
}

interface GridDot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  highlight: number;
}

export const InteractiveDotField: React.FC<InteractiveDotFieldProps> = ({
  dotSpacing = 16,
  dotSize = 1.2,
  baseOpacity = 0.13,
  interactionRadius = 90,
  interactionStrength = 22,
  returnSpeed = 0.12,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let isRunning = false;
    let dots: GridDot[] = [];
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Mouse coordinates in viewport space (-1000 = offscreen)
    let mouseX = -1000;
    let mouseY = -1000;
    let isMouseActive = false;

    // Check prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = reducedMotionQuery.matches;

    // Initialize or resize the grid
    const initGrid = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for perf

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Calculate grid columns and rows based on responsive spacing
      const currentSpacing = width < 640 ? Math.max(dotSpacing, 20) : dotSpacing;
      const cols = Math.ceil(width / currentSpacing) + 1;
      const rows = Math.ceil(height / currentSpacing) + 1;

      // Offset to center the matrix evenly
      const startX = (width - (cols - 1) * currentSpacing) / 2;
      const startY = (height - (rows - 1) * currentSpacing) / 2;

      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = startX + c * currentSpacing;
          const by = startY + r * currentSpacing;
          dots.push({
            baseX: bx,
            baseY: by,
            x: bx,
            y: by,
            vx: 0,
            vy: 0,
            targetX: bx,
            targetY: by,
            highlight: 0,
          });
        }
      }

      // Render static frame immediately
      drawFrame(true);
    };

    // Render single frame
    const drawFrame = (isStaticOnly = false) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      let totalEnergy = 0;

      // Single path batch for rest/unperturbed dots (ultra fast 60fps rendering)
      ctx.beginPath();
      const restColor = `rgba(26, 26, 26, ${baseOpacity})`;
      ctx.fillStyle = restColor;

      const excitedDots: GridDot[] = [];

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        if (!isStaticOnly && !prefersReducedMotion) {
          // Calculate distance to cursor
          let targetX = dot.baseX;
          let targetY = dot.baseY;
          let targetHighlight = 0;

          if (isMouseActive) {
            const dx = dot.baseX - mouseX;
            const dy = dot.baseY - mouseY;
            const dist = Math.hypot(dx, dy);

            if (dist < interactionRadius && dist > 0.001) {
              // Smooth quadratic force falloff
              const factor = (1 - dist / interactionRadius) * (1 - dist / interactionRadius);
              const force = factor * interactionStrength;
              const angle = Math.atan2(dy, dx);

              targetX = dot.baseX + Math.cos(angle) * force;
              targetY = dot.baseY + Math.sin(angle) * force;
              targetHighlight = factor;
            }
          }

          dot.targetX = targetX;
          dot.targetY = targetY;

          // Spring physics
          const damping = 0.78;
          const fx = (dot.targetX - dot.x) * returnSpeed;
          const fy = (dot.targetY - dot.y) * returnSpeed;

          dot.vx = (dot.vx + fx) * damping;
          dot.vy = (dot.vy + fy) * damping;

          dot.x += dot.vx;
          dot.y += dot.vy;

          // Smooth highlight fade
          dot.highlight += (targetHighlight - dot.highlight) * 0.18;

          // Measure kinetic activity
          const deltaMove = Math.abs(dot.x - dot.baseX) + Math.abs(dot.y - dot.baseY) + Math.abs(dot.vx) + Math.abs(dot.vy);
          totalEnergy += deltaMove;
        }

        if (dot.highlight > 0.05) {
          excitedDots.push(dot);
        } else {
          // Draw standard rest dot in batched path
          ctx.moveTo(dot.x + dotSize, dot.y);
          ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
        }
      }

      ctx.fill();

      // Render excited dots with dynamic gold/ink glow
      if (excitedDots.length > 0) {
        for (let j = 0; j < excitedDots.length; j++) {
          const ed = excitedDots[j];
          const radius = dotSize + ed.highlight * 0.6;
          const alpha = baseOpacity + ed.highlight * 0.45;

          ctx.beginPath();
          ctx.arc(ed.x, ed.y, radius, 0, Math.PI * 2);
          
          // Subtle warm gold glow when reacting to cursor
          ctx.fillStyle = `rgba(212, 160, 23, ${Math.min(1, alpha)})`;
          ctx.fill();
        }
      }

      ctx.restore();

      return totalEnergy;
    };

    // Animation Loop with Idle Sleep optimization
    const animate = () => {
      const energy = drawFrame(false);

      // If mouse is inactive/offscreen and all dots have settled to rest, pause RAF loop to save 100% CPU/battery
      if (!isMouseActive && energy < 0.02) {
        isRunning = false;
        animationFrameId = null;
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const wakeAnimation = () => {
      if (prefersReducedMotion) {
        drawFrame(true);
        return;
      }

      if (!isRunning) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    // Window Mouse Listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMouseActive = true;
      wakeAnimation();
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
      isMouseActive = false;
      wakeAnimation(); // Let dots smoothly return to rest
    };

    // Window Touch Listeners (Passive - never blocks scroll or gestures)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
        isMouseActive = true;
        wakeAnimation();
      }
    };

    const handleTouchEnd = () => {
      mouseX = -1000;
      mouseY = -1000;
      isMouseActive = false;
      wakeAnimation();
    };

    const handleScroll = () => {
      if (isMouseActive && !prefersReducedMotion) {
        wakeAnimation();
      }
    };

    const handleBlur = () => {
      mouseX = -1000;
      mouseY = -1000;
      isMouseActive = false;
      wakeAnimation();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          isRunning = false;
        }
      } else {
        wakeAnimation();
      }
    };

    const handleMotionPreferenceChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        isRunning = false;
        drawFrame(true);
      } else {
        wakeAnimation();
      }
    };

    initGrid();

    window.addEventListener('resize', initGrid, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('blur', handleBlur, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener('change', handleMotionPreferenceChange);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', initGrid);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (reducedMotionQuery.removeEventListener) {
        reducedMotionQuery.removeEventListener('change', handleMotionPreferenceChange);
      }
    };
  }, [dotSpacing, dotSize, baseOpacity, interactionRadius, interactionStrength, returnSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none select-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
};
