/**
 * photo-input.ts — File upload + getUserMedia webcam capture
 * Downscales images to max 1080px on longest edge to save memory.
 */

const MAX_DIMENSION = 1080;

/**
 * Downscale an image to MAX_DIMENSION on its longest edge via offscreen canvas.
 */
function downscaleImage(img: HTMLImageElement): HTMLImageElement {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) return img;

  const scale = MAX_DIMENSION / Math.max(w, h);
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, nw, nh);

  const result = new Image();
  result.src = canvas.toDataURL('image/jpeg', 0.92);
  return result;
}

function loadImageFromDataURL(dataURL: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Handle file input change — read file, downscale, return Image element.
 */
export function setupFileInput(
  input: HTMLInputElement,
  onPhoto: (img: HTMLImageElement) => void
): void {
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const img = await loadImageFromDataURL(reader.result as string);
      const scaled = downscaleImage(img);
      // If downscaled, wait for the new src to load
      if (scaled !== img) {
        await new Promise<void>(resolve => {
          if (scaled.complete) { resolve(); return; }
          scaled.onload = () => resolve();
        });
      }
      onPhoto(scaled);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Check if webcam is available.
 */
export function isWebcamAvailable(): boolean {
  return !!(navigator.mediaDevices?.getUserMedia);
}

export interface WebcamController {
  start: () => Promise<void>;
  capture: () => Promise<HTMLImageElement>;
  flip: () => Promise<void>;
  stop: () => void;
}

/**
 * Create a webcam controller that manages video stream on a given <video> element.
 */
export function createWebcamController(video: HTMLVideoElement): WebcamController {
  let stream: MediaStream | null = null;
  let facingMode: 'user' | 'environment' = 'user';

  async function startStream() {
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1080 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  }

  return {
    start: startStream,

    async capture(): Promise<HTMLImageElement> {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const img = await loadImageFromDataURL(canvas.toDataURL('image/jpeg', 0.92));
      const scaled = downscaleImage(img);
      if (scaled !== img) {
        await new Promise<void>(resolve => {
          if (scaled.complete) { resolve(); return; }
          scaled.onload = () => resolve();
        });
      }
      return scaled;
    },

    async flip(): Promise<void> {
      facingMode = facingMode === 'user' ? 'environment' : 'user';
      await startStream();
    },

    stop() {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      video.srcObject = null;
    },
  };
}
