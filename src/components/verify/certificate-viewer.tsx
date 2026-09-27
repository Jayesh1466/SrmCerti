"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";

// Renders the first page of the certificate PDF into a canvas with pdf.js. An <iframe> would be simpler,
// but most phones (which is where QR codes get scanned) can't display PDFs inline.
export function CertificateViewer({ pdfUrl }: { pdfUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (cancelled || !canvas || !container) return;

        // Fit the container width, rendered at device pixel density so it stays sharp on phones.
        const base = page.getViewport({ scale: 1 });
        const cssScale = container.clientWidth / base.width;
        const viewport = page.getViewport({ scale: cssScale * (window.devicePixelRatio || 1) });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        await page.render({ canvas, viewport }).promise;
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        {state === "loading" && (
          <div className="flex aspect-[1.414] items-center justify-center text-sm text-slate-500">Loading certificate…</div>
        )}
        {state === "error" && (
          <div className="flex aspect-[1.414] items-center justify-center px-4 text-center text-sm text-slate-500">
            The certificate preview could not be displayed. Use the buttons below to open or download it.
          </div>
        )}
        <canvas ref={canvasRef} className={state === "ready" ? "block" : "hidden"} aria-label="Certificate" role="img" />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink size={16} /> Open full size
        </a>
        <a
          href={`${pdfUrl}?download`}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          <Download size={16} /> Download PDF
        </a>
      </div>
    </div>
  );
}
