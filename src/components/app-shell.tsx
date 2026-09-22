import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import {
  BookOpen,
  List,
  PenLine,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useTocStore } from "@/lib/toc-store";
import { BodyEditor } from "@/components/body-editor";
import { OutlinePanel } from "@/components/outline-panel";
import { PreviewPanel } from "@/components/preview-panel";
import { TopBar } from "@/components/top-bar";

type MobileTab = "indice" | "texto" | "preview";

// ─── Resize Divider ───────────────────────────────────────────────────────────
function ResizeDivider({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    e.preventDefault();

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(e.clientX - lastX.current);
      lastX.current = e.clientX;
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative z-10 w-1 shrink-0 cursor-col-resize bg-panel-border transition-colors hover:bg-accent"
      title="Arrastar para redimensionar"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
export function AppShell() {
  const hydrate = useTocStore((s) => s.hydrate);
  const [tab, setTab] = useState<MobileTab>("texto");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Panel widths (px)
  const [sidebarW, setSidebarW] = useState(280);
  const [previewW, setPreviewW] = useState(0); // 0 = flex auto
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Keyboard shortcut: Esc = exit focus mode, F11 = toggle focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) setFocusMode(false);
      if (e.key === "F11") {
        e.preventDefault();
        setFocusMode((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  const handleSidebarDrag = useCallback((dx: number) => {
    setSidebarW((w) => Math.max(180, Math.min(420, w + dx)));
  }, []);

  const handlePreviewDrag = useCallback((dx: number) => {
    setPreviewW((w) => {
      const container = containerRef.current;
      const total = container?.clientWidth ?? 1200;
      const current = w === 0 ? total * 0.42 : w;
      return Math.max(320, Math.min(total * 0.65, current - dx));
    });
  }, []);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-canvas">
      {/* Top Bar — oculta em foco */}
      {!focusMode && (
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((f) => !f)}
        />
      )}

      {/* Botão flutuante de saída do modo foco */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="fixed top-3 right-4 z-50 flex items-center gap-1.5 rounded-full border border-panel-border bg-panel/90 px-3 py-1.5 font-sans text-xs font-medium text-panel-fg shadow-lg backdrop-blur hover:border-accent hover:text-accent"
          title="Sair do Modo Foco (Esc)"
        >
          <Minimize2 className="size-3.5" />
          Sair do Foco
        </button>
      )}

      {/* Grid Principal (≥ sm) */}
      <div ref={containerRef} className="hidden min-h-0 min-w-0 flex-1 sm:flex relative">
        {/* Painel Lateral Fixo */}
        {!focusMode && (
          <>
            <div
              className="shrink-0 overflow-hidden transition-[width] duration-200"
              style={{ width: sidebarOpen ? sidebarW : 0 }}
            >
              <div style={{ width: sidebarW }} className="h-full">
                <OutlinePanel />
              </div>
            </div>
            {sidebarOpen && <ResizeDivider onDrag={handleSidebarDrag} />}

            {/* Painel Flutuante (Drawer) quando fechado */}
            {!sidebarOpen && (
              <div
                className="absolute top-0 bottom-0 left-0 z-40 flex"
                onMouseEnter={() => setSidebarHovered(true)}
                onMouseLeave={() => setSidebarHovered(false)}
              >
                <div
                  className="w-3 h-full cursor-e-resize"
                  title="Passe o mouse para revelar o sumário"
                />
                <div
                  className="h-full overflow-hidden transition-[width] duration-200 shadow-2xl border-r border-panel-border bg-panel"
                  style={{ width: sidebarHovered ? sidebarW : 0 }}
                >
                  <div style={{ width: sidebarW }} className="h-full">
                    <OutlinePanel />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Editor Central */}
        <div className="min-h-0 min-w-0 flex-1">
          <BodyEditor focusMode={focusMode} onToggleFocus={() => setFocusMode((f) => !f)} />
        </div>

        {/* Preview A4 */}
        {!focusMode && (
          <>
            <ResizeDivider onDrag={handlePreviewDrag} />
            <div
              className="min-h-0 min-w-0 shrink-0 overflow-hidden"
              style={{ width: previewW > 0 ? previewW : "42%" }}
            >
              <PreviewPanel />
            </div>
          </>
        )}
      </div>

      {/* Mobile: abas */}
      <div className="flex min-h-0 flex-1 flex-col sm:hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "indice" ? <OutlinePanel /> : null}
          {tab === "texto" ? <BodyEditor focusMode={false} onToggleFocus={() => {}} /> : null}
          {tab === "preview" ? <PreviewPanel /> : null}
        </div>
        <nav className="grid grid-cols-3 border-t border-panel-border bg-panel pb-[env(safe-area-inset-bottom)]">
          <TabBtn
            active={tab === "indice"}
            onClick={() => setTab("indice")}
            icon={<List className="size-4" />}
            label="Índice"
          />
          <TabBtn
            active={tab === "texto"}
            onClick={() => setTab("texto")}
            icon={<PenLine className="size-4" />}
            label="Texto"
          />
          <TabBtn
            active={tab === "preview"}
            onClick={() => setTab("preview")}
            icon={<BookOpen className="size-4" />}
            label="Preview A4"
          />
        </nav>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-0.5 py-2 font-sans text-[0.7rem]",
        active ? "text-accent font-semibold" : "text-panel-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
