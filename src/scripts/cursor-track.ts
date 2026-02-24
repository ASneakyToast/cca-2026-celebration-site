/**
 * Cursor-Track Parallax System
 * Moves elements based on mouse position relative to viewport center.
 * Configurable per-element via data attributes.
 */

let cleanup: (() => void) | null = null;

function initCursorTrack() {
  // Tear down previous instance (Astro view transitions)
  cleanup?.();

  // Bail on touch-primary devices or reduced motion
  if (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const scopes = document.querySelectorAll<HTMLElement>('[data-cursor-scope]');
  if (!scopes.length) return;

  // Collect tracked elements grouped by scope
  interface TrackedElement {
    el: HTMLElement;
    strength: number;
    direction: 1 | -1; // 1 = towards, -1 = away
    max: number;
    lerp: number;
    currentX: number;
    currentY: number;
    targetX: number;
    targetY: number;
  }

  const tracked: TrackedElement[] = [];
  const visibleScopes = new Set<HTMLElement>();

  scopes.forEach((scope) => {
    scope.querySelectorAll<HTMLElement>('[data-cursor-track]').forEach((el) => {
      tracked.push({
        el,
        strength: parseFloat(el.dataset.cursorStrength ?? '0.02'),
        direction: el.dataset.cursorDirection === 'towards' ? 1 : -1,
        max: parseFloat(el.dataset.cursorMax ?? '50'),
        lerp: parseFloat(el.dataset.cursorLerp ?? '0.08'),
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
      });
    });
  });

  if (!tracked.length) return;

  // Mouse position relative to viewport center
  let mouseX = 0;
  let mouseY = 0;
  let mouseInViewport = true;

  function onMouseMove(e: MouseEvent) {
    mouseX = e.clientX - window.innerWidth / 2;
    mouseY = e.clientY - window.innerHeight / 2;
    mouseInViewport = true;
  }

  function onMouseLeave() {
    mouseInViewport = false;
  }

  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave);

  // IntersectionObserver to track which scopes are visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleScopes.add(entry.target as HTMLElement);
        } else {
          visibleScopes.delete(entry.target as HTMLElement);
        }
      });
    },
    { threshold: 0 }
  );

  scopes.forEach((scope) => observer.observe(scope));

  // Lerp animation loop
  let rafId = 0;
  const EPSILON = 0.1;

  function tick() {
    rafId = requestAnimationFrame(tick);

    if (!visibleScopes.size) return;

    let allSettled = true;

    for (const t of tracked) {
      // Check if element's scope is visible
      const scope = t.el.closest('[data-cursor-scope]') as HTMLElement | null;
      if (!scope || !visibleScopes.has(scope)) continue;

      // Compute target
      if (mouseInViewport) {
        const rawX = mouseX * t.strength * t.direction;
        const rawY = mouseY * t.strength * t.direction;
        t.targetX = Math.max(-t.max, Math.min(t.max, rawX));
        t.targetY = Math.max(-t.max, Math.min(t.max, rawY));
      } else {
        t.targetX = 0;
        t.targetY = 0;
      }

      // Lerp
      t.currentX += (t.targetX - t.currentX) * t.lerp;
      t.currentY += (t.targetY - t.currentY) * t.lerp;

      // Snap to zero when close enough
      if (Math.abs(t.currentX) < EPSILON && Math.abs(t.targetX) === 0) t.currentX = 0;
      if (Math.abs(t.currentY) < EPSILON && Math.abs(t.targetY) === 0) t.currentY = 0;

      if (t.currentX !== t.targetX || t.currentY !== t.targetY) {
        allSettled = false;
      }

      t.el.style.translate = `${t.currentX.toFixed(1)}px ${t.currentY.toFixed(1)}px`;
    }

    // If mouse left and all elements settled back to 0, we keep looping
    // but skip the transform writes (allSettled check is just for perf)
    void allSettled;
  }

  rafId = requestAnimationFrame(tick);

  // Store cleanup
  cleanup = () => {
    cancelAnimationFrame(rafId);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
    observer.disconnect();

    // Reset transforms
    for (const t of tracked) {
      t.el.style.translate = '';
    }

    cleanup = null;
  };
}

// Run on initial load
initCursorTrack();

// Re-run after Astro page transitions
document.addEventListener('astro:page-load', initCursorTrack);
