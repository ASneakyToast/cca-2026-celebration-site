/**
 * export-manager.ts — Full-resolution render + PNG download trigger
 */

import type { ResolvedTemplate } from './template-manager';
import { render, preloadTemplateAssets, ensureFontsLoaded } from './canvas-renderer';
import type { Ratio } from './template-manager';

const RATIO_LABELS: Record<Ratio, string> = {
  '1:1': '1x1',
  '4:5': '4x5',
  '9:16': '9x16',
};

export interface ExportOptions {
  template: ResolvedTemplate;
  userImage: HTMLImageElement | null;
  textValues: Record<string, string>;
  ratio: Ratio;
}

/**
 * Render at full resolution (1080px wide) to an offscreen canvas and trigger download.
 */
export async function exportPNG(opts: ExportOptions): Promise<void> {
  await ensureFontsLoaded();
  await preloadTemplateAssets(opts.template);

  const canvas = document.createElement('canvas');
  render({
    canvas,
    template: opts.template,
    userImage: opts.userImage,
    textValues: opts.textValues,
    scale: 1,
  });

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('Failed to create blob')); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cca-2026-celebration-${RATIO_LABELS[opts.ratio]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      },
      'image/png',
      1.0
    );
  });
}
