const ARROWS = [
  'arrow-02', 'arrow-03', 'arrow-04', 'arrow-05',
  'arrow-06', 'arrow-07', 'arrow-08', 'arrow-09',
  'arrow-10', 'arrow-11', 'arrow-12', 'arrow-13',
];

function pickRandom(count: number): string[] {
  const pool = [...ARROWS];
  const picks: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

function assignArrows() {
  const els = document.querySelectorAll<HTMLImageElement>('[data-random-arrow]');

  // Group by parent section so each section gets its own random pair
  const groups = new Map<Element | null, HTMLImageElement[]>();
  els.forEach((el) => {
    const section = el.closest('section, .hero') || el.parentElement;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(el);
  });

  groups.forEach((imgs) => {
    const picks = pickRandom(imgs.length);
    imgs.forEach((img, i) => {
      img.src = `/images/scanned-graphics/arrows/${picks[i]}.svg`;
    });
  });
}

assignArrows();
document.addEventListener('astro:after-swap', assignArrows);
