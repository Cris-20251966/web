
export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  alpha: number;
}

export interface GradientColor {
  id: string;
  hex: string;
  stop?: number;
}

export interface SavedGradient {
  id: string;
  name: string;
  colors: GradientColor[];
  type: GradientType;
  angle: number;
  css: string;
}

export interface AIPaletteResponse {
  theme: string;
  colors: string[];
  description: string;
}

export type GradientType = 'linear' | 'radial' | 'conic';
