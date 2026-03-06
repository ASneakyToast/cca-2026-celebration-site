/**
 * Initializes all [data-arrow-loop] elements on the page with
 * a 3D spinning arrow cycle animation.
 *
 * Uses CSS mask-image + background-color for pixel-perfect color accuracy.
 */

const arrowIds = [
  'arrow-02', 'arrow-03', 'arrow-04', 'arrow-05', 'arrow-06',
  'arrow-07', 'arrow-08', 'arrow-09', 'arrow-10', 'arrow-11',
  'arrow-12', 'arrow-13',
];

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

type Phase = 'idle' | 'spin-in' | 'hold' | 'spin-out';

interface SlotState {
  phase: Phase;
  start: number;
  dir: number;
  axis: 'X' | 'Y';
  sizeMult: number;
}

interface LoopInstance {
  el: HTMLElement;
  slotEls: [HTMLElement, HTMLElement];
  shapeEls: [HTMLElement, HTMLElement];
  state: [SlotState, SlotState];
  cycleDuration: number;
  fadeOverlap: number;
  scaleAmount: number;
  spinDegrees: number;
  spinAxis: 'X' | 'Y' | 'random';
  sizeVariance: number;
  colors: string[];
  colorIndex: number;
  arrowIndex: number;
  startDelay: number;
  started: boolean;
}

function pickAxis(axis: 'X' | 'Y' | 'random'): 'X' | 'Y' {
  if (axis === 'random') return Math.random() < 0.5 ? 'X' : 'Y';
  return axis;
}

function kick(inst: LoopInstance, slot: 0 | 1, now: number) {
  const s = inst.state[slot];
  const arrow = arrowIds[inst.arrowIndex % arrowIds.length];
  inst.arrowIndex++;

  const color = inst.colors[inst.colorIndex % inst.colors.length];
  inst.colorIndex++;

  const shapeEl = inst.shapeEls[slot];
  const url = `/images/scanned-graphics/arrows/${arrow}.svg`;
  shapeEl.style.maskImage = `url('${url}')`;
  shapeEl.style.setProperty('-webkit-mask-image', `url('${url}')`);
  shapeEl.style.backgroundColor = color;

  s.phase = 'spin-in';
  s.start = now;
  s.dir = Math.random() < 0.5 ? -1 : 1;
  s.axis = pickAxis(inst.spinAxis);
  s.sizeMult = 1 + (Math.random() * 2 - 1) * inst.sizeVariance;
}

function updateSlot(inst: LoopInstance, slotIdx: 0 | 1, now: number) {
  const s = inst.state[slotIdx];
  const el = inst.slotEls[slotIdx];
  if (s.phase === 'idle') return;

  const elapsed = (now - s.start) / 1000;
  const spinDur = inst.cycleDuration * inst.fadeOverlap;
  const holdDur = inst.cycleDuration * (1 - inst.fadeOverlap * 2);

  if (s.phase === 'spin-in') {
    const t = Math.min(elapsed / spinDur, 1);
    const e = easeInOut(t);
    const deg = (1 - e) * inst.spinDegrees * s.dir;
    const scale = s.sizeMult * ((1 - inst.scaleAmount) + inst.scaleAmount * e);
    const opacity = Math.min(e * 2, 1);
    el.style.opacity = String(opacity);
    el.style.transform = `rotate${s.axis}(${deg}deg) scale(${scale})`;
    if (t >= 1) {
      s.phase = 'hold';
      s.start = now;
      el.style.opacity = '1';
      el.style.transform = `scale(${s.sizeMult})`;
    }
  } else if (s.phase === 'hold') {
    const t = elapsed / Math.max(holdDur, 0.1);
    const wobbleY = Math.sin(elapsed * 1.8) * 4;
    const wobbleX = Math.cos(elapsed * 1.3) * 3;
    const breathe = Math.sin(elapsed * 2) * inst.scaleAmount * 0.3;
    el.style.transform = `rotateY(${wobbleY}deg) rotateX(${wobbleX}deg) scale(${s.sizeMult * (1 + breathe)})`;
    if (t >= 1) {
      s.phase = 'spin-out';
      s.start = now;
      const next = (slotIdx === 0 ? 1 : 0) as 0 | 1;
      kick(inst, next, now);
    }
  } else if (s.phase === 'spin-out') {
    const t = Math.min(elapsed / spinDur, 1);
    const e = easeInOut(t);
    const deg = e * inst.spinDegrees * -s.dir;
    const scale = s.sizeMult * (1 + inst.scaleAmount * e * 0.5);
    const opacity = Math.max(1 - (e - 0.5) * 2, 0);
    el.style.opacity = String(opacity);
    el.style.transform = `rotate${s.axis}(${deg}deg) scale(${scale})`;
    if (t >= 1) {
      s.phase = 'idle';
      el.style.opacity = '0';
    }
  }
}

function init() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const containers = document.querySelectorAll<HTMLElement>('[data-arrow-loop]');
  if (containers.length === 0) return;

  const instances: LoopInstance[] = [];

  containers.forEach(el => {
    const slotEls = [
      el.querySelector('[data-slot="a"]') as HTMLElement,
      el.querySelector('[data-slot="b"]') as HTMLElement,
    ] as [HTMLElement, HTMLElement];
    const shapeEls = [
      el.querySelector('[data-shape="a"]') as HTMLElement,
      el.querySelector('[data-shape="b"]') as HTMLElement,
    ] as [HTMLElement, HTMLElement];

    const inst: LoopInstance = {
      el,
      slotEls,
      shapeEls,
      state: [
        { phase: 'idle', start: 0, dir: 1, axis: 'Y', sizeMult: 1 },
        { phase: 'idle', start: 0, dir: 1, axis: 'Y', sizeMult: 1 },
      ],
      cycleDuration: parseFloat(el.dataset.cycleDuration || '3'),
      fadeOverlap: parseFloat(el.dataset.fadeOverlap || '0.15'),
      scaleAmount: parseFloat(el.dataset.scaleAmount || '0.04'),
      spinDegrees: parseFloat(el.dataset.spinDegrees || '180'),
      spinAxis: (el.dataset.spinAxis || 'Y') as 'X' | 'Y' | 'random',
      sizeVariance: parseFloat(el.dataset.sizeVariance || '0.3'),
      colors: (el.dataset.colors || '#ffffff').split(','),
      colorIndex: 0,
      arrowIndex: Math.floor(Math.random() * arrowIds.length),
      startDelay: parseFloat(el.dataset.startDelay || '0'),
      started: false,
    };

    if (!reducedMotion && inst.startDelay <= 0) {
      kick(inst, 0, performance.now());
      inst.started = true;
    } else if (reducedMotion) {
      const arrow = arrowIds[inst.arrowIndex % arrowIds.length];
      const url = `/images/scanned-graphics/arrows/${arrow}.svg`;
      shapeEls[0].style.maskImage = `url('${url}')`;
      shapeEls[0].style.setProperty('-webkit-mask-image', `url('${url}')`);
      shapeEls[0].style.backgroundColor = inst.colors[0];
      slotEls[0].style.opacity = '1';
    }

    instances.push(inst);
  });

  const initTime = performance.now();

  function tick(now: number) {
    const elapsed = (now - initTime) / 1000;
    for (const inst of instances) {
      if (!inst.started && elapsed >= inst.startDelay) {
        kick(inst, 0, now);
        inst.started = true;
      }
      updateSlot(inst, 0, now);
      updateSlot(inst, 1, now);
    }
    requestAnimationFrame(tick);
  }

  if (!reducedMotion) {
    requestAnimationFrame(tick);
  }
}

// Init on load and on Astro page transitions
init();
document.addEventListener('astro:after-swap', init);
