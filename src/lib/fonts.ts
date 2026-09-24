// The set of fonts selectable in the template wizard, shared between the
// PDF generator (server) and the browser preview (Konva canvas / CSS).
export interface FontOption {
  /** Value stored on TextFieldConfig.fontFamily / TextBlock.fontFamily */
  value: string;
  /** Label shown in the font picker */
  label: string;
  /** CSS font-family to use for the on-screen Konva/HTML preview */
  cssFamily: string;
  /** Relative path under /public to the TTF file, for PDF embedding. Omitted for pdf-lib standard fonts. */
  file?: string;
  /** Category, purely for grouping in the picker UI */
  category: "sans" | "serif" | "mono" | "display";
}

export const FONT_OPTIONS: FontOption[] = [
  { value: "Helvetica", label: "Helvetica (Sans)", cssFamily: "Helvetica, Arial, sans-serif", category: "sans" },
  { value: "Times-Roman", label: "Times New Roman", cssFamily: "'Times New Roman', Times, serif", category: "serif" },
  { value: "Courier", label: "Courier (Mono)", cssFamily: "'Courier New', Courier, monospace", category: "mono" },
  { value: "Poppins", label: "Poppins", cssFamily: "'Poppins', sans-serif", file: "/fonts/Poppins-Regular.ttf", category: "sans" },
  { value: "PlayfairDisplay", label: "Playfair Display", cssFamily: "'Playfair Display', serif", file: "/fonts/PlayfairDisplay-Regular.ttf", category: "display" },
];

export function getFontOption(value?: string): FontOption {
  return FONT_OPTIONS.find((f) => f.value === value) || FONT_OPTIONS[0];
}
