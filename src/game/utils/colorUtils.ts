export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function luminance({ r, g, b }: RGB): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
  };
}

export function toHex({ r, g, b }: RGB): string {
  const c = (v: number) => v.toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  return toHex({
    r: Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t),
    g: Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t),
    b: Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t),
  });
}

/**
 * Average color of a canvas image. Sample every 3rd pixel for speed.
 */
export function averageColor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): RGB {
  const data = ctx.getImageData(0, 0, width, height).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 12) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

export interface ThemeColors {
  /** Average color of the page itself. */
  pageColor: string;
  /** Background color around the page: same hue as the page, clearly darker/lighter. */
  background: string;
  /** Main body color of the sharpener: high contrast against the page. */
  sharpenerBody: string;
  /** Accent color for the sharpener and aim indicator. */
  accent: string;
  /** Color for the aim indicator strokes. */
  aimColor: string;
}

export function buildTheme(page: RGB): ThemeColors {
  const lum = luminance(page);
  const BLACK: RGB = { r: 20, g: 22, b: 26 };
  const WHITE: RGB = { r: 250, g: 248, b: 242 };

  const background = lum >= 128 ? mix(page, BLACK, 0.6) : mix(page, WHITE, 0.45);

  const darkSharpener: RGB = { r: 38, g: 48, b: 60 };
  const lightSharpener: RGB = { r: 244, g: 240, b: 230 };

  const isLightPage = lum >= 128;

  return {
    pageColor: toHex(page),
    background: toHex(background),
    sharpenerBody: toHex(isLightPage ? darkSharpener : lightSharpener),
    accent: '#e0483e',
    aimColor: toHex(isLightPage ? { r: 32, g: 36, b: 42 } : { r: 245, g: 243, b: 235 }),
  };
}