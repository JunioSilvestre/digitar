import {
  Bold,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Heading,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { chapterLabel, findLocated, sectionLabel } from "@/lib/toc";
import { useTocStore } from "@/lib/toc-store";

export function TopBar() {
  const title = useTocStore((s) => s.title);
  const setTitle = useTocStore((s) => s.setTitle);
  const items = useTocStore((s) => s.items);
  const selectedId = useTocStore((s) => s.selectedId);
  const addChapter = useTocStore((s) => s.addChapter);
  const addSubitem = useTocStore((s) => s.addSubitem);
  const remove = useTocStore((s) => s.remove);
  const move = useTocStore((s) => s.move);
  const promote = useTocStore((s) => s.promote);
  const demote = useTocStore((s) => s.demote);
  const reset = useTocStore((s) => s.reset);
  const previewMode = useTocStore((s) => s.previewMode);
  const setPreviewMode = useTocStore((s) => s.setPreviewMode);
  const patchSelected = useTocStore((s) => s.patchSelected);

  const loc = selectedId ? findLocated(items, selectedId) : null;
  const label = loc ? (loc.depth === 0 ? chapterLabel(loc.path[0]!) : sectionLabel(loc.path)) : null;

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    const el = document.getElementById("body-editor") as HTMLTextAreaElement | null;
    if (!el || !loc) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentText = loc.node.body;
    const selected = currentText.substring(start, end);
    const replacement = `${prefix}${selected || "texto"}${suffix}`;
    const nextText = currentText.substring(0, start) + replacement + currentText.substring(end);

    patchSelected({ body: nextText });

    setTimeout(() => {
      el.focus();
      const selLen = selected.length || 5;
      el.setSelectionRange(start + prefix.length, start + prefix.length + selLen);
    }, 10);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-panel-border bg-panel px-4 py-2.5 text-panel-fg shadow-sm">
      {/* Esquerda: Logo e Título da Obra */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-accent" />
          <span className="font-serif text-base font-bold text-panel-fg">Editor A4</span>
        </div>

        <div className="h-4 w-px bg-panel-border" />

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do Livro / Obra..."
          className="w-48 sm:w-64 rounded-md border border-panel-border bg-panel-raised px-2.5 py-1 font-serif text-sm font-semibold text-panel-fg outline-none placeholder:text-panel-muted focus:border-accent"
        />
      </div>

      {/* Centro: Ações de Estrutura (Capítulo, Seção, Mover) & Formatação */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Botões de Criação */}
        <button
          type="button"
          onClick={addChapter}
          className="flex items-center gap-1 rounded bg-accent px-2.5 py-1.5 font-sans text-xs font-semibold text-paper shadow hover:bg-accent-hover"
          title="Adicionar Novo Capítulo (Algarismo Romano)"
        >
          <Plus className="size-3.5" />
          + Capítulo
        </button>

        <button
          type="button"
          onClick={() => addSubitem()}
          className="flex items-center gap-1 rounded border border-panel-border bg-panel-raised px-2.5 py-1.5 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
          title="Adicionar Seção no Capítulo Atual"
        >
          <Plus className="size-3.5" />
          + Seção
        </button>

        <div className="mx-1 h-4 w-px bg-panel-border" />

        {/* Botões de Ação na Seleção */}
        <button
          type="button"
          disabled={!loc || loc.index === 0}
          onClick={() => loc && move(loc.node.id, -1)}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Mover para cima"
        >
          <ChevronUp className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc || loc.index === loc.siblings.length - 1}
          onClick={() => loc && move(loc.node.id, 1)}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Mover para baixo"
        >
          <ChevronDown className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc || loc.depth === 0}
          onClick={() => loc && promote(loc.node.id)}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Diminuir recuo (Promover)"
        >
          <IndentDecrease className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc || loc.index === 0}
          onClick={() => loc && demote(loc.node.id)}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Aumentar recuo (Subitem)"
        >
          <IndentIncrease className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc}
          onClick={() => loc && remove(loc.node.id)}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-red-400 hover:text-red-400 disabled:opacity-30"
          title="Apagar item selecionado"
        >
          <Trash2 className="size-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-panel-border" />

        {/* Botões de Formatação de Texto */}
        <button
          type="button"
          disabled={!loc}
          onClick={() => applyFormat("**")}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Negrito (**texto**)"
        >
          <Bold className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc}
          onClick={() => applyFormat("*")}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Itálico (*texto*)"
        >
          <Italic className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc}
          onClick={() => applyFormat("<u>", "</u>")}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Sublinhado (<u>texto</u>)"
        >
          <Underline className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc}
          onClick={() => applyFormat("### ", "")}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Subtítulo / Cabeçalho"
        >
          <Heading className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={!loc}
          onClick={() => applyFormat("- ", "")}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent disabled:opacity-30"
          title="Lista com marcadores"
        >
          <List className="size-3.5" />
        </button>
      </div>

      {/* Direita: Modo de Visualização, Imprimir, Reset */}
      <div className="flex items-center gap-2">
        <div className="flex rounded border border-panel-border p-0.5">
          <button
            type="button"
            onClick={() => setPreviewMode("manuscrito")}
            className={cn(
              "flex items-center gap-1 rounded-sm px-2.5 py-1 font-sans text-xs font-medium",
              previewMode === "manuscrito" ? "bg-accent text-paper" : "text-panel-muted hover:text-panel-fg",
            )}
          >
            <FileText className="size-3" />
            Manuscrito
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode("sumario")}
            className={cn(
              "flex items-center gap-1 rounded-sm px-2.5 py-1 font-sans text-xs font-medium",
              previewMode === "sumario" ? "bg-accent text-paper" : "text-panel-muted hover:text-panel-fg",
            )}
          >
            <List className="size-3" />
            Sumário
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent"
          title="Imprimir / Exportar PDF"
        >
          <Printer className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (window.confirm("Restaurar o exemplo original?")) reset();
          }}
          className="flex size-7 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-amber-400 hover:text-amber-400"
          title="Restaurar Exemplo"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
