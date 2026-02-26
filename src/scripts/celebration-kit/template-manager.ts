/**
 * template-manager.ts — Load template JSON configs, manage active state, merge ratio overrides
 */

export type Ratio = '1:1' | '4:5' | '9:16';

export interface Background {
  type: 'color' | 'gradient' | 'image';
  value?: string;
  src?: string;
  stops?: [string, number][];
  angle?: number;
}

export interface PhotoConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'circle' | 'rectangle' | 'rounded-rect';
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  objectFit: 'cover';
}

export interface TextField {
  id: string;
  label: string;
  placeholder: string;
  maxLength: number;
  x: number;
  y: number;
  maxWidth: number;
  fontFamily: 'display' | 'body' | 'mono' | 'heading';
  fontSize: number;
  fontWeight: number;
  fontStyle?: string;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing?: number;
}

export interface Overlay {
  id: string;
  type?: 'image' | 'text' | 'rect' | 'decorative-dots';
  src?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: string;
  letterSpacing?: number;
  // decorative-dots specific
  color1?: string;
  color2?: string;
  color3?: string;
  count?: number;
  region?: { x: number; y: number; width: number; height: number };
  size?: number;
}

export interface TemplateConfig {
  id: string;
  name: string;
  thumbnail: string;
  canvasWidth: number;
  supportedRatios: Ratio[];
  backgrounds: Record<string, Background>;
  photo: PhotoConfig;
  textFields: TextField[];
  overlays: Overlay[];
  ratioOverrides?: Record<string, any>;
}

export interface ResolvedTemplate {
  config: TemplateConfig;
  photo: PhotoConfig;
  textFields: TextField[];
  overlays: Overlay[];
  background: Background;
  canvasWidth: number;
  canvasHeight: number;
}

const RATIO_MULTIPLIERS: Record<Ratio, number> = {
  '1:1': 1,
  '4:5': 1350 / 1080,
  '9:16': 1920 / 1080,
};

const templateCache = new Map<string, TemplateConfig>();

export async function fetchManifest(): Promise<string[]> {
  const res = await fetch('/celebration-kit/templates.json');
  return res.json();
}

export async function fetchTemplate(id: string): Promise<TemplateConfig> {
  if (templateCache.has(id)) return templateCache.get(id)!;
  const res = await fetch(`/celebration-kit/${id}.json`);
  const config: TemplateConfig = await res.json();
  templateCache.set(id, config);
  return config;
}

export async function fetchAllTemplates(): Promise<TemplateConfig[]> {
  const ids = await fetchManifest();
  return Promise.all(ids.map(fetchTemplate));
}

/**
 * Deep-merge ratio overrides into the base template config.
 * Returns a resolved template with correct dimensions for the given ratio.
 */
export function resolveTemplate(config: TemplateConfig, ratio: Ratio): ResolvedTemplate {
  const overrides = config.ratioOverrides?.[ratio];
  const canvasWidth = config.canvasWidth;
  const canvasHeight = Math.round(canvasWidth * RATIO_MULTIPLIERS[ratio]);

  // Start with base values
  let photo = { ...config.photo };
  let textFields = config.textFields.map(f => ({ ...f }));
  let overlays = config.overlays.map(o => ({ ...o }));
  let background = config.backgrounds[ratio] ?? config.backgrounds['1:1'];

  if (overrides) {
    // Merge photo overrides
    if (overrides.photo) {
      photo = { ...photo, ...overrides.photo };
    }

    // Merge text field overrides (keyed by id)
    if (overrides.textFields) {
      textFields = textFields.map(f => {
        const fieldOverride = overrides.textFields[f.id];
        return fieldOverride ? { ...f, ...fieldOverride } : f;
      });
    }

    // Merge overlay overrides (keyed by id)
    if (overrides.overlays) {
      overlays = overlays.map(o => {
        const overlayOverride = overrides.overlays[o.id];
        return overlayOverride ? { ...o, ...overlayOverride } : o;
      });
    }
  }

  return { config, photo, textFields, overlays, background, canvasWidth, canvasHeight };
}

export function getCanvasHeight(ratio: Ratio, width: number): number {
  return Math.round(width * RATIO_MULTIPLIERS[ratio]);
}
