/**
 * Doodle Antics — Playful Hover & Click Microinteractions
 * Assigns a random animation (wiggle, squish, pop, flip) to each .hero__doodle
 * on page load. Hover plays a subtle version, click plays a dramatic burst.
 * Layers on top of existing CSS transforms with composite: 'add'.
 */

type AnimDef = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

// Subtle hover animations
const hoverAnims: Record<string, AnimDef> = {
  wiggle: {
    keyframes: [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-8deg)', offset: 0.25 },
      { transform: 'rotate(8deg)', offset: 0.5 },
      { transform: 'rotate(-3deg)', offset: 0.75 },
      { transform: 'rotate(0deg)' },
    ],
    options: { duration: 400, easing: 'ease-in-out' },
  },
  squish: {
    keyframes: [
      { transform: 'scale(1, 1)' },
      { transform: 'scale(1.2, 0.75)', offset: 0.35 },
      { transform: 'scale(0.9, 1.1)', offset: 0.65 },
      { transform: 'scale(1, 1)' },
    ],
    options: { duration: 500, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
  pop: {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(0.8)', offset: 0.3 },
      { transform: 'scale(1.2)', offset: 0.65 },
      { transform: 'scale(1)' },
    ],
    options: { duration: 450, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
  flip: {
    keyframes: [
      { transform: 'perspective(800px) rotateY(0deg)' },
      { transform: 'perspective(800px) rotateY(15deg)', offset: 0.3 },
      { transform: 'perspective(800px) rotateY(-10deg)', offset: 0.65 },
      { transform: 'perspective(800px) rotateY(0deg)' },
    ],
    options: { duration: 500, easing: 'ease-in-out' },
  },
};

// Dramatic click burst animations
const burstAnims: Record<string, AnimDef> = {
  wiggle: {
    keyframes: [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-20deg)', offset: 0.15 },
      { transform: 'rotate(360deg)', offset: 0.7 },
      { transform: 'rotate(350deg)', offset: 0.85 },
      { transform: 'rotate(360deg)' },
    ],
    options: { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
  squish: {
    keyframes: [
      { transform: 'scale(1, 1)' },
      { transform: 'scale(1.5, 0.5)', offset: 0.2 },
      { transform: 'scale(0.7, 1.4)', offset: 0.45 },
      { transform: 'scale(1.15, 0.85)', offset: 0.7 },
      { transform: 'scale(1, 1)' },
    ],
    options: { duration: 650, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
  pop: {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(0.5)', offset: 0.2 },
      { transform: 'scale(1.4)', offset: 0.55 },
      { transform: 'scale(0.95)', offset: 0.8 },
      { transform: 'scale(1)' },
    ],
    options: { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
  flip: {
    keyframes: [
      { transform: 'perspective(800px) rotateY(0deg)' },
      { transform: 'perspective(800px) rotateY(180deg)', offset: 0.45 },
      { transform: 'perspective(800px) rotateY(340deg)', offset: 0.8 },
      { transform: 'perspective(800px) rotateY(360deg)' },
    ],
    options: { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
};

const animNames = Object.keys(hoverAnims);

let cleanup: (() => void) | null = null;

function initDoodleAntics() {
  cleanup?.();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const doodles = document.querySelectorAll<HTMLElement>('.hero__doodle');
  if (!doodles.length) return;

  const controllers: AbortController[] = [];
  const activeAnims = new WeakMap<HTMLElement, Animation>();

  function play(el: HTMLElement, anim: AnimDef) {
    const running = activeAnims.get(el);
    if (running && running.playState === 'running') {
      running.cancel();
    }

    const a = el.animate(anim.keyframes, {
      ...anim.options,
      composite: 'add',
      fill: 'none',
    });

    activeAnims.set(el, a);
    a.onfinish = () => activeAnims.delete(el);
  }

  doodles.forEach((el) => {
    const name = animNames[Math.floor(Math.random() * animNames.length)];
    const hover = hoverAnims[name];
    const burst = burstAnims[name];
    const ac = new AbortController();
    controllers.push(ac);

    el.addEventListener(
      'mouseenter',
      () => {
        if (!activeAnims.has(el)) play(el, hover);
      },
      { signal: ac.signal, passive: true },
    );

    el.addEventListener(
      'click',
      () => play(el, burst),
      { signal: ac.signal, passive: true },
    );
  });

  cleanup = () => {
    controllers.forEach((ac) => ac.abort());
    cleanup = null;
  };
}

// Run on initial load
initDoodleAntics();

// Re-run after Astro page transitions
document.addEventListener('astro:page-load', initDoodleAntics);
