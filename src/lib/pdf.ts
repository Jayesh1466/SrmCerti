import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont, PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import path from "path";
import { promises as fs } from "fs";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
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
  const fontBytes = await loadFontBytes(option.file);
  const embedded = await pdfDoc.embedFont(fontBytes, { subset: true });
  cache.set(option.value, embedded);
  return embedded;
}

// Font files never change at runtime; read each one from disk once.
const fontBytesCache = new Map<string, Promise<Buffer>>();
function loadFontBytes(file: string) {
  let bytes = fontBytesCache.get(file);
  if (!bytes) {
    bytes = fs.readFile(path.join(process.cwd(), "public", file));
    fontBytesCache.set(file, bytes);
  }
  return bytes;
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

// Everything except the per-student text and QR is identical across a batch, and embedding the
// background (decoding and re-compressing a large PNG) dominates generation time. So the static layer
// is rendered once into a "base" PDF and cached; each certificate loads that base (fast: the images
// are already compressed streams) and only draws its own text and QR code on top.
type StaticLayer = Pick<
  GenerateCertificateOptions,
  "backgroundUrl" | "pageWidth" | "pageHeight" | "logos" | "seals" | "signatures" | "watermark"
>;

const basePdfCache = new Map<string, Promise<Uint8Array>>();
const BASE_CACHE_LIMIT = 5;

function getBasePdf(opts: StaticLayer): Promise<Uint8Array> {
  // Only the static fields: per-student data must not end up in the key, or nothing is ever reused.
  const layer: StaticLayer = {
    backgroundUrl: opts.backgroundUrl,
    pageWidth: opts.pageWidth,
    pageHeight: opts.pageHeight,
    logos: opts.logos,
    seals: opts.seals,
    signatures: opts.signatures,
    watermark: opts.watermark,
  };
  const key = JSON.stringify(layer);
  let base = basePdfCache.get(key);
  if (!base) {
    base = renderStaticLayer(layer);
    base.catch(() => basePdfCache.delete(key));
    if (basePdfCache.size >= BASE_CACHE_LIMIT) basePdfCache.delete(basePdfCache.keys().next().value!);
    basePdfCache.set(key, base);
  }
  return base;
}

async function renderStaticLayer(opts: StaticLayer): Promise<Uint8Array> {
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

  return pdfDoc.save();
}

// Draw the QR code as vector squares: sharper in print than a PNG, and no image to encode per certificate.
function drawQrCode(page: PDFPage, text: string, rect: { x: number; y: number; width: number; height: number }) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const margin = 1;
  const cells = size + margin * 2;
  const cell = Math.min(rect.width, rect.height) / cells;
  // White quiet zone, then one SVG path containing every dark module.
  page.drawRectangle({ x: rect.x, y: rect.y, width: cell * cells, height: cell * cells, color: rgb(1, 1, 1) });
  let d = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) d += `M${col + margin} ${row + margin}h1v1h-1z`;
    }
  }
  // drawSvgPath's y-axis points down from the given origin, matching QR row order.
  page.drawSvgPath(d, { x: rect.x, y: rect.y + cell * cells, scale: cell, color: rgb(0, 0, 0), borderWidth: 0 });
}

export async function generateCertificatePdf(opts: GenerateCertificateOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(await getBasePdf(opts));
  const page = pdfDoc.getPage(0);

  // Student name field
  if (opts.studentNameField?.enabled && opts.studentNameField.position) {
    const font = await mapFont(pdfDoc, opts.studentNameField.fontFamily);
    const rect = posToRect(opts.studentNameField.position, opts.pageWidth, opts.pageHeight);
    const text = applyCaseTransform(opts.data.student_name || "", opts.studentNameField.caseTransform);
    const fontSize = opts.studentNameField.fontSize || 24;
    page.drawText(text, {
      x: rect.x,
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
    page.drawText(text, {
      x: rect.x,
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
    const pos = opts.qrConfig.position || { x: 0.85, y: 0.85, width: 0.1, height: 0.1 };
    drawQrCode(page, verifyUrl, posToRect(pos, opts.pageWidth, opts.pageHeight));
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_").replace(/_+/g, "_").slice(0, 80) || "certificate";
}

// Certificate IDs are public (they're in the QR link and open the certificate), so draw them from a
// cryptographic RNG: 10 characters from a 32-symbol alphabet without look-alikes (0/O, 1/I).
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function generateCertificateId(): string {
  const bytes = randomBytes(10);
  return "CERT-" + Array.from(bytes, (b) => ID_ALPHABET[b % 32]).join("");
}
