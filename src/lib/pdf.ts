import { PDFDocument, StandardFonts, rgb, PDFFont, PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import path from "path";
import { promises as fs } from "fs";
import QRCode from "qrcode";
import { readStoredFile } from "@/lib/storage";
import { substitutePlaceholders, applyCaseTransform } from "@/lib/placeholders";
import { getFontOption } from "@/lib/fonts";
import type {
  Position,
  ImageOverlay,
  SignatureOverlay,
  TextFieldConfig,
  TextBlock,
  WatermarkConfig,
  QrConfig,
} from "@/lib/types";

// Cache embedded custom fonts per PDFDocument instance (a font can only be embedded once per doc).
const customFontCache = new WeakMap<PDFDocument, Map<string, PDFFont>>();

async function mapFont(pdfDoc: PDFDocument, family?: string): Promise<PDFFont> {
  const option = getFontOption(family);

  if (!option.file) {
    if (option.value === "Times-Roman") return pdfDoc.embedFont(StandardFonts.TimesRoman);
    if (option.value === "Courier") return pdfDoc.embedFont(StandardFonts.Courier);
    return pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  let cache = customFontCache.get(pdfDoc);
  if (!cache) {
    cache = new Map();
    customFontCache.set(pdfDoc, cache);
  }
  const cached = cache.get(option.value);
  if (cached) return cached;

  pdfDoc.registerFontkit(fontkit);
  const fontPath = path.join(process.cwd(), "public", option.file);
  const fontBytes = await fs.readFile(fontPath);
  const embedded = await pdfDoc.embedFont(fontBytes, { subset: true });
  cache.set(option.value, embedded);
  return embedded;
}

function hexToRgb(hex?: string) {
  if (!hex) return rgb(0, 0, 0);
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return rgb(r, g, b);
}

// Uploaded images get unique names and are never rewritten, so their bytes can be cached by URL.
// This saves re-downloading the same background/logos for every student in a batch.
const imageBytesCache = new Map<string, Promise<Buffer>>();
const IMAGE_CACHE_LIMIT = 50;

function loadImageBytes(url: string): Promise<Buffer> {
  let bytes = imageBytesCache.get(url);
  if (!bytes) {
    bytes = readStoredFile(url);
    bytes.catch(() => imageBytesCache.delete(url));
    if (imageBytesCache.size >= IMAGE_CACHE_LIMIT) {
      imageBytesCache.delete(imageBytesCache.keys().next().value!);
    }
    imageBytesCache.set(url, bytes);
  }
  return bytes;
}

async function embedImageAuto(pdfDoc: PDFDocument, url: string): Promise<PDFImage> {
  const bytes = await loadImageBytes(url);
  // Sniff the PNG signature rather than trusting the URL's extension.
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return isPng ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes);
}

// Baseline y that sits the text's descenders on the bottom edge of the box (matches the editor preview).
function bottomBaseline(font: PDFFont, fontSize: number, rectY: number) {
  const descent = font.heightAtSize(fontSize) - font.heightAtSize(fontSize, { descender: false });
  return rectY + descent;
}

function posToRect(position: Position, pageWidth: number, pageHeight: number) {
  // Normalized coords have origin top-left; PDF origin is bottom-left.
  const width = position.width * pageWidth;
  const height = position.height * pageHeight;
  const x = position.x * pageWidth;
  const y = pageHeight - position.y * pageHeight - height;
  return { x, y, width, height };
}

export interface GenerateCertificateOptions {
  backgroundUrl: string;
  pageWidth: number;
  pageHeight: number;
  logos: ImageOverlay[];
  seals: ImageOverlay[];
  signatures: SignatureOverlay[];
  studentNameField: TextFieldConfig;
  regNumberField: TextFieldConfig;
  textBlocks: TextBlock[];
  watermark: WatermarkConfig;
  qrConfig: QrConfig;
  data: Record<string, string>; // placeholder values, includes student_name, registration_number, etc
  certificateId: string;
  verifyBaseUrl: string;
}

export async function generateCertificatePdf(opts: GenerateCertificateOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([opts.pageWidth, opts.pageHeight]);

  // Background
  const bgImage = await embedImageAuto(pdfDoc, opts.backgroundUrl);
  page.drawImage(bgImage, { x: 0, y: 0, width: opts.pageWidth, height: opts.pageHeight });

  // Watermark (drawn early, low opacity, under overlays but above background)
  if (opts.watermark?.enabled && opts.watermark.assetUrl) {
    try {
      const wmImage = await embedImageAuto(pdfDoc, opts.watermark.assetUrl);
      const pos = opts.watermark.position || { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
      const rect = posToRect(pos, opts.pageWidth, opts.pageHeight);
      page.drawImage(wmImage, { ...rect, opacity: opts.watermark.opacity ?? 0.15 });
    } catch {
      // skip missing watermark asset
    }
  }

  // Logos & seals
  for (const overlay of [...opts.logos, ...opts.seals]) {
    try {
      const img = await embedImageAuto(pdfDoc, overlay.assetUrl);
      const rect = posToRect(overlay.position, opts.pageWidth, opts.pageHeight);
      page.drawImage(img, rect);
    } catch {
      // skip missing asset
    }
  }

  // Signatures (image + name/designation text below)
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  for (const sig of opts.signatures) {
    try {
      const img = await embedImageAuto(pdfDoc, sig.assetUrl);
      const rect = posToRect(sig.position, opts.pageWidth, opts.pageHeight);
      page.drawImage(img, rect);
      const label = `${sig.name}${sig.designation ? " - " + sig.designation : ""}`;
      const fontSize = sig.fontSize || 10;
      page.drawText(label, {
        x: rect.x,
        y: rect.y - fontSize - 2,
        size: fontSize,
        font: helv,
        color: hexToRgb(sig.color || "#000000"),
      });
    } catch {
      // skip missing signature asset
    }
  }

  // Student name field
  if (opts.studentNameField?.enabled && opts.studentNameField.position) {
    const font = await mapFont(pdfDoc, opts.studentNameField.fontFamily);
    const rect = posToRect(opts.studentNameField.position, opts.pageWidth, opts.pageHeight);
    const text = applyCaseTransform(opts.data.student_name || "", opts.studentNameField.caseTransform);
    const fontSize = opts.studentNameField.fontSize || 24;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: rect.x + Math.max(0, (rect.width - textWidth) / 2),
      y: bottomBaseline(font, fontSize, rect.y),
      size: fontSize,
      font,
      color: hexToRgb(opts.studentNameField.color || "#000000"),
    });
  }

  // Registration number field
  if (opts.regNumberField?.enabled && opts.regNumberField.position) {
    const font = await mapFont(pdfDoc, opts.regNumberField.fontFamily);
    const rect = posToRect(opts.regNumberField.position, opts.pageWidth, opts.pageHeight);
    const format = opts.regNumberField.format || "{{registration_number}}";
    const text = substitutePlaceholders(format, opts.data);
    const fontSize = opts.regNumberField.fontSize || 12;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: rect.x + Math.max(0, (rect.width - textWidth) / 2),
      y: bottomBaseline(font, fontSize, rect.y),
      size: fontSize,
      font,
      color: hexToRgb(opts.regNumberField.color || "#000000"),
    });
  }

  // Dynamic text blocks
  for (const block of opts.textBlocks) {
    const font = await mapFont(pdfDoc, block.fontFamily);
    const rect = posToRect(block.position, opts.pageWidth, opts.pageHeight);
    const text = substitutePlaceholders(block.content, opts.data);
    const fontSize = block.fontSize || 14;
    let x = rect.x;
    if (block.align === "center") {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      x = rect.x + rect.width / 2 - textWidth / 2;
    } else if (block.align === "right") {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      x = rect.x + rect.width - textWidth;
    }
    page.drawText(text, {
      x,
      y: rect.y + rect.height / 2 - fontSize / 3,
      size: fontSize,
      font,
      color: hexToRgb(block.color || "#000000"),
    });
  }

  // QR code
  if (opts.qrConfig?.enabled) {
    const verifyUrl = `${opts.verifyBaseUrl}/verify/${opts.certificateId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });
    const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const pos = opts.qrConfig.position || { x: 0.85, y: 0.85, width: 0.1, height: 0.1 };
    const rect = posToRect(pos, opts.pageWidth, opts.pageHeight);
    page.drawImage(qrImage, rect);
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_").replace(/_+/g, "_").slice(0, 80) || "certificate";
}

export function generateCertificateId(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `CERT-${rand}`;
}
