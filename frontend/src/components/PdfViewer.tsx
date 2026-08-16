import { Download, ExternalLink, FileText, Minus, Plus, RotateCw } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.8;
const SCALE_STEP = 0.15;

type PdfViewerProps = {
  fileName: string;
  url: string;
  onDownload: () => void;
  onOpenOriginal: () => void;
};

export function PdfViewer({ fileName, url, onDownload, onOpenOriginal }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFitWidth, setFitWidth] = useState(true);
  const [isLoadingDocument, setLoadingDocument] = useState(true);
  const [isRenderingPage, setRenderingPage] = useState(false);
  const [error, setError] = useState("");

  const computeFitScale = useCallback(async (pdfDocument: PDFDocumentProxy, targetPageNumber: number, targetRotation: number) => {
    if (!viewportRef.current) {
      return 1;
    }

    const page = await pdfDocument.getPage(targetPageNumber);
    const viewport = page.getViewport({ rotation: targetRotation, scale: 1 });
    const availableWidth = Math.max(320, viewportRef.current.clientWidth - 48);

    return Number(Math.min(MAX_SCALE, Math.max(MIN_SCALE, availableWidth / viewport.width)).toFixed(2));
  }, []);

  useEffect(() => {
    let active = true;
    let loadedDocument: PDFDocumentProxy | null = null;
    const loadingTask = pdfjs.getDocument({ url });

    void Promise.resolve().then(() => {
      if (!active) {
        return;
      }

      setLoadingDocument(true);
      setError("");
      setDocument(null);
      setPageCount(0);
      setPageNumber(1);
      setRotation(0);
      setFitWidth(true);
    });

    void loadingTask.promise
      .then(async (nextDocument) => {
        loadedDocument = nextDocument;
        const initialScale = await computeFitScale(nextDocument, 1, 0);

        if (!active) {
          return;
        }

        setScale(initialScale);
        setDocument(nextDocument);
        setPageCount(nextDocument.numPages);
      })
      .catch(() => {
        if (active) {
          setError("Could not load this PDF preview.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDocument(false);
        }
      });

    return () => {
      active = false;
      void loadingTask.destroy();
      void loadedDocument?.cleanup();
    };
  }, [computeFitScale, url]);

  const fitToWidth = useCallback(async () => {
    if (!document) {
      return;
    }

    const nextScale = await computeFitScale(document, pageNumber, rotation);

    setScale(nextScale);
    setFitWidth(true);
  }, [computeFitScale, document, pageNumber, rotation]);

  useEffect(() => {
    if (!isFitWidth) {
      return;
    }

    const handleResize = () => {
      void fitToWidth();
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [fitToWidth, isFitWidth]);

  useEffect(() => {
    if (!document || !canvasRef.current) {
      return;
    }

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    const canvas = canvasRef.current;
    setRenderingPage(true);
    setError("");

    void document
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) {
          return;
        }

        const viewport = page.getViewport({ rotation, scale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        renderTask = page.render({
          canvas,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          viewport,
        });

        return renderTask.promise;
      })
      .catch((renderError: unknown) => {
        if (!cancelled && !(renderError instanceof Error && renderError.name === "RenderingCancelledException")) {
          setError("This PDF could not be rendered. Download it to inspect the original file.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRenderingPage(false);
        }
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber, rotation, scale]);

  const zoomOut = () => {
    setFitWidth(false);
    setScale((currentScale) => Math.max(MIN_SCALE, Number((currentScale - SCALE_STEP).toFixed(2))));
  };

  const zoomIn = () => {
    setFitWidth(false);
    setScale((currentScale) => Math.min(MAX_SCALE, Number((currentScale + SCALE_STEP).toFixed(2))));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{fileName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pageCount ? `Page ${pageNumber} of ${pageCount}` : "Preparing document"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <div className="mr-1 flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950">
            <Button
              aria-label="Previous page"
              disabled={pageNumber <= 1}
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => setPageNumber((currentPage) => Math.max(1, currentPage - 1))}
            >
              <Minus className="size-4 rotate-90" />
            </Button>
            <span className="min-w-16 px-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
              {pageNumber}/{pageCount || "-"}
            </span>
            <Button
              aria-label="Next page"
              disabled={!pageCount || pageNumber >= pageCount}
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => setPageNumber((currentPage) => Math.min(pageCount, currentPage + 1))}
            >
              <Plus className="size-4 rotate-90" />
            </Button>
          </div>

          <Button aria-label="Zoom out" disabled={scale <= MIN_SCALE} size="icon-sm" type="button" variant="outline" onClick={zoomOut}>
            <Minus className="size-4" />
          </Button>
          <Button aria-label="Fit width" size="sm" type="button" variant={isFitWidth ? "default" : "outline"} onClick={() => void fitToWidth()}>
            {Math.round(scale * 100)}%
          </Button>
          <Button aria-label="Zoom in" disabled={scale >= MAX_SCALE} size="icon-sm" type="button" variant="outline" onClick={zoomIn}>
            <Plus className="size-4" />
          </Button>
          <Button
            aria-label="Rotate page"
            size="icon-sm"
            type="button"
            variant="outline"
            onClick={() => setRotation((currentRotation) => (currentRotation + 90) % 360)}
          >
            <RotateCw className="size-4" />
          </Button>
          <Button aria-label="Open original PDF" size="icon-sm" type="button" variant="outline" onClick={onOpenOriginal}>
            <ExternalLink className="size-4" />
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={onDownload}>
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="relative flex-1 overflow-auto bg-slate-200 p-4 dark:bg-slate-950">
        {(isLoadingDocument || isRenderingPage) && (
          <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {isLoadingDocument ? "Loading PDF" : "Rendering page"}
          </div>
        )}
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">{error}</div>
        ) : (
          <div className="flex min-h-full items-start justify-center">
            <canvas
              ref={canvasRef}
              className={cn(
                "max-w-none rounded-sm bg-white shadow-lg ring-1 ring-slate-300 dark:ring-slate-800",
                isRenderingPage && "opacity-80",
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
