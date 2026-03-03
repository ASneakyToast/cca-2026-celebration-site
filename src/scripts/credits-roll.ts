/**
 * Credits Roll — Hover-to-scroll controls + search
 *
 * The page is a normal long document of names. No auto-scroll.
 * Two fixed arrow buttons on the left edge auto-advance the page
 * when hovered, with an ease-in ramp to higher speed.
 */

const MIN_SPEED = 100; // px/sec — immediate on hover
const MAX_SPEED = 800; // px/sec — top speed after full ramp
const RAMP_DURATION = 4000; // ms to reach max speed
const EASE_OUT_DURATION = 400; // ms to decelerate on leave
const SEARCH_DEBOUNCE = 200;

// Starts gentle, then rockets — most of the acceleration happens in the back half
function rampCurve(t: number): number {
  return t * t * t;
}

function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

let cleanup: (() => void) | null = null;

function initCreditsRoll() {
  cleanup?.();

  const section = document.querySelector('.credits-section') as HTMLElement | null;
  if (!section) return;

  const upBtn = document.querySelector('.credits-controls__btn--up') as HTMLElement | null;
  const downBtn = document.querySelector('.credits-controls__btn--down') as HTMLElement | null;
  const searchInput = document.querySelector('.credits-search__input') as HTMLInputElement | null;
  const searchCount = document.querySelector('.credits-search__count') as HTMLElement | null;
  const names = section.querySelectorAll<HTMLElement>('.credits-name');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // AbortController for all event listeners
  const ac = new AbortController();

  // --- Hover-to-scroll engine ---
  let direction = 0; // -1 up, +1 down, 0 stopped
  let holdTime = 0;
  let lastDirection = 0; // track last direction for ramp continuity
  let animationId: number | null = null;
  let lastTimestamp: number | null = null;
  let easeOutStart: number | null = null;
  let easeOutSpeed = 0;
  let easeOutDirection = 0;

  function currentSpeed() {
    const t = Math.min(holdTime / RAMP_DURATION, 1);
    return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * rampCurve(t);
  }

  function updateBoundaryVisibility() {
    if (!upBtn || !downBtn) return;
    const atTop = window.scrollY <= 0;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
    upBtn.classList.toggle('is-hidden', atTop);
    downBtn.classList.toggle('is-hidden', atBottom);
  }

  function scrollStep(timestamp: number) {
    if (lastTimestamp !== null) {
      const dt = Math.min(timestamp - lastTimestamp, 50); // cap at 50ms

      if (direction !== 0) {
        holdTime += dt;
        window.scrollBy(0, direction * currentSpeed() * (dt / 1000));
        easeOutStart = null;
      } else if (easeOutSpeed > 0) {
        // Easing out (cubic deceleration)
        if (easeOutStart === null) easeOutStart = timestamp;
        const elapsed = timestamp - easeOutStart;
        const t = Math.min(elapsed / EASE_OUT_DURATION, 1);
        const speed = easeOutSpeed * (1 - easeOutCubic(t));
        window.scrollBy(0, easeOutDirection * speed * (dt / 1000));

        if (t >= 1) {
          easeOutSpeed = 0;
          holdTime = 0;
          lastDirection = 0;
          restoreScrollBehavior();
          updateBoundaryVisibility();
          lastTimestamp = null;
          animationId = null;
          return;
        }
      } else {
        holdTime = 0;
        lastDirection = 0;
        restoreScrollBehavior();
        updateBoundaryVisibility();
        lastTimestamp = null;
        animationId = null;
        return;
      }

      updateBoundaryVisibility();
    }

    lastTimestamp = timestamp;
    animationId = requestAnimationFrame(scrollStep);
  }

  function startScrolling(dir: number) {
    // Override smooth scrolling so scrollBy applies instantly each frame
    document.documentElement.style.scrollBehavior = 'auto';

    // If re-entering the same direction (or during ease-out of same dir),
    // keep the accumulated holdTime so the ramp continues
    if (dir !== lastDirection) {
      holdTime = 0;
    }
    direction = dir;
    lastDirection = dir;
    easeOutSpeed = 0;
    if (animationId === null) {
      lastTimestamp = null;
      animationId = requestAnimationFrame(scrollStep);
    }
  }

  function restoreScrollBehavior() {
    document.documentElement.style.scrollBehavior = '';
  }

  function stopScrolling() {
    easeOutSpeed = currentSpeed();
    easeOutDirection = direction;
    easeOutStart = null;
    direction = 0;
    // holdTime is preserved — if user re-enters same direction, ramp continues
    // Restore smooth scroll after ease-out completes (not here — wait for the rAF loop to finish)
  }

  if (!reducedMotion && upBtn && downBtn) {
    upBtn.addEventListener('mouseenter', () => startScrolling(-1), { signal: ac.signal });
    upBtn.addEventListener('mouseleave', () => stopScrolling(), { signal: ac.signal });
    downBtn.addEventListener('mouseenter', () => startScrolling(1), { signal: ac.signal });
    downBtn.addEventListener('mouseleave', () => stopScrolling(), { signal: ac.signal });

    updateBoundaryVisibility();
    window.addEventListener('scroll', updateBoundaryVisibility, { passive: true, signal: ac.signal });
  }

  // --- Search toggle ---
  const searchToggle = document.querySelector('.credits-search__toggle') as HTMLButtonElement | null;
  const searchContainer = document.querySelector('.credits-search') as HTMLElement | null;

  if (searchToggle && searchContainer && searchInput) {
    searchToggle.addEventListener('click', () => {
      const isOpen = searchContainer.classList.toggle('is-open');
      searchToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        searchInput.focus();
      } else {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
      }
    }, { signal: ac.signal });
  }

  // --- Search ---
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  if (searchInput && searchCount) {
    searchInput.addEventListener('input', () => {
      if (searchTimer !== null) clearTimeout(searchTimer);

      const query = searchInput.value.trim().toLowerCase();

      if (!query) {
        section.classList.remove('is-searching');
        names.forEach((el) => el.classList.remove('is-match'));
        searchCount.textContent = '';
        return;
      }

      section.classList.add('is-searching');

      let matchCount = 0;
      let firstMatch: HTMLElement | null = null;

      names.forEach((el) => {
        const name = el.getAttribute('data-name') || '';
        const matches = name.includes(query);
        el.classList.toggle('is-match', matches);
        if (matches) {
          matchCount++;
          if (!firstMatch) firstMatch = el;
        }
      });

      searchCount.textContent = matchCount > 0 ? `${matchCount} found` : 'No matches';

      if (firstMatch) {
        const target = firstMatch;
        searchTimer = setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, SEARCH_DEBOUNCE);
      }
    }, { signal: ac.signal });
  }

  // --- Cleanup ---
  cleanup = () => {
    ac.abort();
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (searchTimer !== null) clearTimeout(searchTimer);
    restoreScrollBehavior();
    cleanup = null;
  };

  document.addEventListener('astro:before-swap', () => cleanup?.(), { once: true });
}

document.addEventListener('astro:page-load', initCreditsRoll);
