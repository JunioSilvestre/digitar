import { Columns2, LayoutList, Minus, Plus, Printer, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import { A4Book } from "@/components/a4-book";
import { cn } from "@/lib/cn";
import { useTocStore } from "@/lib/toc-store";

export function PreviewPanel() {
  const title = useTocStore((s) => s.title);
  const items = useTocStore((s) => s.items);
  const selectedId = useTocStore((s) => s.selectedId);
  const previewMode = useTocStore((s) => s.previewMode);
  const setPreviewMode = useTocStore((s) => s.setPreviewMode);
  const select = useTocStore((s) => s.select);
  const setPageMap = useTocStore((s) => s.setPageMap);
  const onPageMap = useCallback((map: Record<string, number>) => setPageMap(map), [setPageMap]);

  const [layoutMode, setLayoutMode] = useState<"grid" | "stack">("grid");
  const [zoom, setZoom] = useState<number | null>(null);

  const handleZoomIn = () => {
    setZoom((curr) => {
      const val = curr ?? 0.7;
      return Math.min(1.2, +(val + 0.1).toFixed(2));
    });
  };

  const handleZoomOut = () => {
    setZoom((curr) => {
      const val = curr ?? 0.7;
      return Math.max(0.35, +(val - 0.1).toFixed(2));
    });
  };

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col bg-panel">
      {/* Barra de Controle do Preview */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-panel-border px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {/* Alternador de Modo (Manuscrito / Sumário) */}
          <div className="flex rounded-md border border-panel-border p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode("manuscrito")}
              className={cn(
                "rounded-sm px-2.5 py-1 font-sans text-xs font-medium transition-colors",
                previewMode === "manuscrito"
                  ? "bg-accent text-paper"
                  : "text-panel-muted hover:text-panel-fg",
              )}
            >
              Manuscrito
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("sumario")}
              className={cn(
                "rounded-sm px-2.5 py-1 font-sans text-xs font-medium transition-colors",
                previewMode === "sumario"
                  ? "bg-accent text-paper"
                  : "text-panel-muted hover:text-panel-fg",
              )}
            >
              Sumário
            </button>
          </div>

          <div className="h-4 w-px bg-panel-border" />

          {/* Alternador de Disposição de Páginas (Lado a lado / Empilhado) */}
          <div
            className="flex rounded-md border border-panel-border p-0.5"
            title="Disposição das Páginas A4"
          >
            <button
              type="button"
              onClick={() => setLayoutMode("grid")}
              className={cn(
                "flex items-center gap-1 rounded-sm px-2 py-1 font-sans text-xs font-medium transition-colors",
                layoutMode === "grid"
                  ? "bg-panel-raised text-accent font-semibold"
                  : "text-panel-muted hover:text-panel-fg",
              )}
              title="Lado a lado (Aproveita a largura)"
            >
              <Columns2 className="size-3.5" />
              <span className="hidden xl:inline">Lado a lado</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("stack")}
              className={cn(
                "flex items-center gap-1 rounded-sm px-2 py-1 font-sans text-xs font-medium transition-colors",
                layoutMode === "stack"
                  ? "bg-panel-raised text-accent font-semibold"
                  : "text-panel-muted hover:text-panel-fg",
              )}
              title="Empilhado em coluna"
            >
              <LayoutList className="size-3.5" />
              <span className="hidden xl:inline">Coluna</span>
            </button>
          </div>
        </div>

        {/* Controles de Zoom e Impressão */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent"
            title="Diminuir Zoom"
          >
            <Minus className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoom(null)}
            className="rounded border border-panel-border px-2 py-1 font-sans text-[0.7rem] font-medium text-panel-muted hover:border-accent hover:text-accent"
            title="Redefinir Zoom Automático"
          >
            {zoom ? `${Math.round(zoom * 100)}%` : "Auto"}
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent"
            title="Aumentar Zoom"
          >
            <Plus className="size-3.5" />
          </button>

          <div className="h-4 w-px bg-panel-border" />

          <button
            type="button"
            onClick={() => window.print()}
            className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent"
            title="Imprimir"
            aria-label="Imprimir"
          >
            <Printer className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Áreas das Páginas A4 */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center font-serif text-sm italic text-panel-muted">
            Adicione capítulos à esquerda para montar o índice.
          </div>
        ) : (
          <A4Book
            title={title}
            items={items}
            mode={previewMode}
            selectedId={selectedId}
            onSelect={select}
            onPageMap={onPageMap}
            layoutMode={layoutMode}
            customScale={zoom}
          />
        )}
      </div>
    </aside>
  );
}
