import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, List, PenLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTocStore } from "@/lib/toc-store";
import { BodyEditor } from "@/components/body-editor";
import { OutlinePanel } from "@/components/outline-panel";
import { PreviewPanel } from "@/components/preview-panel";
import { TopBar } from "@/components/top-bar";

type MobileTab = "indice" | "texto" | "preview";

export function AppShell() {
  const hydrate = useTocStore((s) => s.hydrate);
  const [tab, setTab] = useState<MobileTab>("texto");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-canvas">
      {/* Top Bar no topo absoluto da tela */}
      <TopBar />

      {/* Grid Principal (Visível em telas a partir de 640px) */}
      <div className="hidden min-h-0 min-w-0 flex-1 sm:grid sm:grid-cols-[250px_minmax(320px,1fr)_minmax(420px,1.5fr)]">
        <OutlinePanel />
        <BodyEditor />
        <PreviewPanel />
      </div>

      {/* Visualização de Abas (Apenas para telas mobile menores que 640px) */}
      <div className="flex min-h-0 flex-1 flex-col sm:hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "indice" ? <OutlinePanel /> : null}
          {tab === "texto" ? <BodyEditor /> : null}
          {tab === "preview" ? <PreviewPanel /> : null}
        </div>
        <nav className="grid grid-cols-3 border-t border-panel-border bg-panel pb-[env(safe-area-inset-bottom)]">
          <TabBtn active={tab === "indice"} onClick={() => setTab("indice")} icon={<List className="size-4" />} label="Índice" />
          <TabBtn active={tab === "texto"} onClick={() => setTab("texto")} icon={<PenLine className="size-4" />} label="Texto" />
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={<BookOpen className="size-4" />} label="Preview A4" />
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
