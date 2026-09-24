export interface Position {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  width: number; // normalized 0-1
  height: number; // normalized 0-1
}

export interface ImageOverlay {
  id: string;
  name: string;
  assetUrl: string;
  position: Position;
}

export interface SignatureOverlay extends ImageOverlay {
  designation: string;
  showLabel?: boolean;
  fontSize?: number;
  color?: string;
}

export interface TextFieldConfig {
  enabled?: boolean;
  position: Position;
  fontFamily?: string; // Helvetica | TimesRoman | Courier
  fontSize?: number;
  color?: string; // hex
  caseTransform?: "none" | "upper" | "lower" | "title";
  format?: string; // e.g. "({{registration_number}})"
}

export interface TextBlock {
  id: string;
  content: string; // static text mixed with {{placeholders}}
  position: Position;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
}

export interface WatermarkConfig {
  enabled: boolean;
  assetUrl?: string;
  opacity?: number; // 0-1
  position?: Position;
}

export interface QrConfig {
  enabled: boolean;
  position?: Position;
}

export interface TemplateConfig {
  logos: ImageOverlay[];
  seals: ImageOverlay[];
  signatures: SignatureOverlay[];
  studentNameField: TextFieldConfig;
  regNumberField: TextFieldConfig;
  textBlocks: TextBlock[];
  watermark: WatermarkConfig;
  qrConfig: QrConfig;
}

export const DEFAULT_POSITION: Position = { x: 0.4, y: 0.4, width: 0.2, height: 0.1 };
