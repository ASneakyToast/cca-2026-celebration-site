/**
 * Celebration Kit — Orchestrator
 * Wires template manager, canvas renderer, photo input, and export together.
 */

import {
  fetchAllTemplates,
  resolveTemplate,
  type TemplateConfig,
  type Ratio,
  type ResolvedTemplate,
} from './template-manager';
import { render, ensureFontsLoaded, preloadTemplateAssets } from './canvas-renderer';
import { setupFileInput, isWebcamAvailable, createWebcamController, type WebcamController } from './photo-input';
import { exportPNG } from './export-manager';

const PREVIEW_SCALE = 0.5;
let renderTimeout: ReturnType<typeof setTimeout> | null = null;

function init() {
  const container = document.getElementById('ck-app');
  if (!container) return;

  // --- State ---
  let templates: TemplateConfig[] = [];
  let activeTemplateId = '';
  let activeRatio: Ratio = '1:1';
  let userImage: HTMLImageElement | null = null;
  let textValues: Record<string, string> = {};
  let resolved: ResolvedTemplate | null = null;
  let webcamCtrl: WebcamController | null = null;

  // --- DOM refs ---
  const canvas = container.querySelector<HTMLCanvasElement>('#ck-canvas')!;
  const templateGrid = container.querySelector<HTMLElement>('#ck-template-grid')!;
  const controlsPanel = container.querySelector<HTMLElement>('#ck-controls')!;
  const textFieldsContainer = container.querySelector<HTMLElement>('#ck-text-fields')!;
  const ratioButtons = container.querySelectorAll<HTMLButtonElement>('[data-ratio]');
  const uploadBtn = container.querySelector<HTMLButtonElement>('#ck-upload-btn')!;
  const fileInput = container.querySelector<HTMLInputElement>('#ck-file-input')!;
  const selfieBtn = container.querySelector<HTMLButtonElement>('#ck-selfie-btn')!;
  const downloadBtn = container.querySelector<HTMLButtonElement>('#ck-download-btn')!;
  const webcamModal = container.querySelector<HTMLElement>('#ck-webcam-modal')!;
  const webcamVideo = container.querySelector<HTMLVideoElement>('#ck-webcam-video')!;
  const webcamCapture = container.querySelector<HTMLButtonElement>('#ck-webcam-capture')!;
  const webcamFlip = container.querySelector<HTMLButtonElement>('#ck-webcam-flip')!;
  const webcamClose = container.querySelector<HTMLButtonElement>('#ck-webcam-close')!;
  const removePhotoBtn = container.querySelector<HTMLButtonElement>('#ck-remove-photo')!;
  const canvasWrap = container.querySelector<HTMLElement>('#ck-canvas-wrap')!;

  // --- Render ---
  function scheduleRender() {
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout = setTimeout(doRender, 16);
  }

  function doRender() {
    if (!resolved) return;
    render({
      canvas,
      template: resolved,
      userImage,
      textValues,
      scale: PREVIEW_SCALE,
    });
    // Update canvas wrapper aspect ratio for smooth sizing
    const aspect = resolved.canvasWidth / resolved.canvasHeight;
    canvasWrap.style.aspectRatio = `${aspect}`;
  }

  // --- Template selection ---
  function selectTemplate(id: string) {
    activeTemplateId = id;
    // Update picker UI
    templateGrid.querySelectorAll('.ck-thumb').forEach(el => {
      el.classList.toggle('is-active', el.getAttribute('data-template') === id);
    });
    updateResolved();
    buildTextInputs();
    scheduleRender();
  }

  function updateResolved() {
    const cfg = templates.find(t => t.id === activeTemplateId);
    if (!cfg) return;
    resolved = resolveTemplate(cfg, activeRatio);
    preloadTemplateAssets(resolved);
  }

  // --- Text field generation ---
  function buildTextInputs() {
    if (!resolved) return;
    textFieldsContainer.innerHTML = '';
    // Preserve existing values when switching templates
    const newValues: Record<string, string> = {};
    for (const field of resolved.textFields) {
      newValues[field.id] = textValues[field.id] ?? '';

      const wrapper = document.createElement('div');
      wrapper.className = 'ck-field';

      const label = document.createElement('label');
      label.className = 'ck-field__label';
      label.textContent = field.label;
      label.htmlFor = `ck-input-${field.id}`;

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `ck-input-${field.id}`;
      input.className = 'ck-field__input';
      input.placeholder = field.placeholder;
      input.maxLength = field.maxLength;
      input.value = newValues[field.id];
      input.autocomplete = 'off';

      input.addEventListener('input', () => {
        textValues[field.id] = input.value;
        scheduleRender();
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      textFieldsContainer.appendChild(wrapper);
    }
    textValues = newValues;
  }

  // --- Ratio switching ---
  ratioButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const ratio = btn.getAttribute('data-ratio') as Ratio;
      if (!ratio || ratio === activeRatio) return;
      activeRatio = ratio;
      ratioButtons.forEach(b => b.classList.toggle('is-active', b === btn));
      updateResolved();
      scheduleRender();
    });
  });

  // --- Photo upload ---
  uploadBtn.addEventListener('click', () => fileInput.click());
  setupFileInput(fileInput, img => {
    userImage = img;
    removePhotoBtn.hidden = false;
    scheduleRender();
  });

  removePhotoBtn.addEventListener('click', () => {
    userImage = null;
    removePhotoBtn.hidden = true;
    fileInput.value = '';
    scheduleRender();
  });

  // --- Webcam ---
  if (isWebcamAvailable()) {
    selfieBtn.hidden = false;
  }

  selfieBtn.addEventListener('click', async () => {
    webcamModal.hidden = false;
    webcamModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    try {
      webcamCtrl = createWebcamController(webcamVideo);
      await webcamCtrl.start();
    } catch {
      closeWebcam();
      alert('Camera access was denied. Please use the upload option instead.');
    }
  });

  function closeWebcam() {
    webcamCtrl?.stop();
    webcamCtrl = null;
    webcamModal.hidden = true;
    webcamModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  webcamClose.addEventListener('click', closeWebcam);
  webcamModal.addEventListener('click', e => {
    if (e.target === webcamModal) closeWebcam();
  });

  webcamCapture.addEventListener('click', async () => {
    if (!webcamCtrl) return;
    const img = await webcamCtrl.capture();
    userImage = img;
    removePhotoBtn.hidden = false;
    closeWebcam();
    scheduleRender();
  });

  webcamFlip.addEventListener('click', () => webcamCtrl?.flip());

  // --- Export ---
  downloadBtn.addEventListener('click', async () => {
    if (!resolved) return;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Exporting…';
    try {
      await exportPNG({ template: resolved, userImage, textValues, ratio: activeRatio });
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download PNG';
    }
  });

  // --- Keyboard: Escape closes webcam modal ---
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !webcamModal.hidden) closeWebcam();
  });

  // --- Bootstrap ---
  async function bootstrap() {
    await ensureFontsLoaded();
    templates = await fetchAllTemplates();

    // Build template picker
    templateGrid.innerHTML = '';
    for (const t of templates) {
      const btn = document.createElement('button');
      btn.className = 'ck-thumb';
      btn.setAttribute('data-template', t.id);
      btn.type = 'button';
      btn.setAttribute('aria-label', `Select template: ${t.name}`);

      const img = document.createElement('img');
      img.src = t.thumbnail;
      img.alt = t.name;
      img.loading = 'lazy';

      const name = document.createElement('span');
      name.className = 'ck-thumb__name';
      name.textContent = t.name;

      btn.appendChild(img);
      btn.appendChild(name);
      btn.addEventListener('click', () => selectTemplate(t.id));
      templateGrid.appendChild(btn);
    }

    // Show controls
    controlsPanel.hidden = false;

    // Select first template
    if (templates.length > 0) {
      selectTemplate(templates[0].id);
    }
  }

  bootstrap();
}

init();
document.addEventListener('astro:page-load', init);
