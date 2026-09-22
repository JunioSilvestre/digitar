import {
  Bold,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  FileText,
  Heading,
  HelpCircle,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  Loader2,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Underline,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { chapterLabel, findLocated, sectionLabel } from "@/lib/toc";
import { useTocStore } from "@/lib/toc-store";

export function TopBar({
  sidebarOpen,
  onToggleSidebar,
  focusMode,
  onToggleFocus,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}) {
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
  const saveStatus = useTocStore((s) => s.saveStatus);
  const exportBackup = useTocStore((s) => s.exportBackup);
  const importBackupFile = useTocStore((s) => s.importBackupFile);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loc = selectedId ? findLocated(items, selectedId) : null;
  const label = loc
    ? loc.depth === 0
      ? chapterLabel(loc.path[0]!)
      : sectionLabel(loc.path)
    : null;

  const handleToggleQuestionBlock = () => {
    if (!loc) return;
    if (loc.depth === 0) {
      alert(
        "Questões só podem ser adicionadas em Seções ou Subseções. Adicione uma Seção primeiro.",
      );
      return;
    }
    if (loc.node.questionBlock) {
      patchSelected({ questionBlock: undefined });
    } else {
      patchSelected({
        questionBlock: {
          question: "Digite o enunciado da questão aqui...",
          answer: "",
          explanation: "Explique a fundamentação ou conceito técnico aqui...",
          commandExample: "$ ls -la --sort=time\n# Exemplo em outra situação / cenário",
        },
      });
    }
  };

  // Breadcrumb: capítulo pai + seção atual
  const breadcrumb = (() => {
    if (!loc) return null;
    if (loc.depth === 0) {
      return (
        <span className="font-sans text-[0.72rem] font-bold text-accent">
          {chapterLabel(loc.path[0]!)}
        </span>
      );
    }
    const chapterIdx = loc.path[0]!;
    const chLabel = chapterLabel(chapterIdx);
    const secLabel = sectionLabel(loc.path);
    const nodeTitle = loc.node.title.trim();
    return (
      <span className="flex items-center gap-1 font-sans text-[0.72rem] text-panel-muted">
        <span className="font-bold text-accent">{chLabel}</span>
        <ChevronRight className="size-3 shrink-0 text-panel-muted/60" />
        <span className="font-semibold text-panel-fg">
          {secLabel}
          {nodeTitle ? ` — ${nodeTitle}` : ""}
        </span>
      </span>
    );
  })();

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importBackupFile(file);
      e.target.value = "";
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-panel-border bg-panel px-3 py-1.5 text-panel-fg shadow-sm">
      {/* Esquerda: toggle sidebar + logo + breadcrumb + save status */}
      <div className="flex items-center gap-2">
        {/* Toggle sidebar */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex size-7 shrink-0 items-center justify-center rounded border border-panel-border text-panel-muted hover:border-accent hover:text-accent"
          title={sidebarOpen ? "Recolher painel lateral" : "Expandir painel lateral"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <BookOpen className="size-4 text-accent" />
          <span className="hidden font-serif text-sm font-bold text-panel-fg xl:inline">
            Editor A4
          </span>
        </div>

        <div className="h-4 w-px bg-panel-border" />

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do Livro..."
          className="w-36 sm:w-52 rounded border border-panel-border bg-panel-raised px-2 py-1 font-serif text-sm font-semibold text-panel-fg outline-none placeholder:text-panel-muted focus:border-accent"
        />

        {/* Breadcrumb: localização atual */}
        {breadcrumb && (
          <>
            <div className="h-4 w-px bg-panel-border" />
            <div className="hidden items-center md:flex">{breadcrumb}</div>
          </>
        )}

        {/* Status de Salvamento */}
        <div
          className="flex items-center gap-1 rounded-full bg-panel-raised px-2 py-0.5 text-[0.65rem] font-medium text-panel-muted border border-panel-border"
          title="Salvo automaticamente no IndexedDB do navegador"
        >
          {saveStatus === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin text-amber-400" />
              <span>Salvando</span>
            </>
          ) : saveStatus === "error" ? (
            <>
              <span className="size-2 rounded-full bg-red-500" />
              <span className="text-red-400">Erro</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3 text-emerald-400" />
              <span className="hidden sm:inline">Salvo</span>
            </>
          )}
        </div>
      </div>

      {/* Centro: Ações de Estrutura & Formatação */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Botões de Criação */}
        <button
          type="button"
          onClick={addChapter}
          className="flex items-center gap-1 rounded bg-accent px-2.5 py-1.5 font-sans text-xs font-semibold text-paper shadow hover:bg-accent-hover"
          title="Adicionar Novo Capítulo (Algarismo Romano)"
        >
          <Plus className="size-3.5" />+ Capítulo
        </button>

        <button
          type="button"
          onClick={() => addSubitem()}
          className="flex items-center gap-1 rounded border border-panel-border bg-panel-raised px-2.5 py-1.5 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
          title="Adicionar Seção"
        >
          <Plus className="size-3.5" />+ Seção
        </button>

        <button
          type="button"
          onClick={() => useTocStore.getState().addSubSection()}
          className="flex items-center gap-1 rounded border border-panel-border bg-panel-raised px-2.5 py-1.5 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
          title="Adicionar Subseção (filha do item atual)"
        >
          <Plus className="size-3.5" />+ Subseção
        </button>

        <button
          type="button"
          onClick={handleToggleQuestionBlock}
          className="flex items-center gap-1 rounded border border-panel-border bg-panel-raised px-2.5 py-1.5 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
          title="Adicionar Bloco de Questão na Seção Atual"
        >
          <HelpCircle className="size-3.5" />+ Questão
        </button>

        <div className="mx-1 h-4 w-px bg-panel-border" />

        {/* Botões de Estrutura na Seleção */}
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

      {/* Direita: Modo Foco, Backup, Visualização, Imprimir, Reset */}
      <div className="flex items-center gap-2">
        {/* Modo Foco */}
        <button
          type="button"
          onClick={onToggleFocus}
          className={cn(
            "flex items-center gap-1 rounded border px-2 py-1 font-sans text-xs font-medium transition-colors",
            focusMode
              ? "border-accent bg-accent/10 text-accent"
              : "border-panel-border text-panel-muted hover:border-accent hover:text-accent",
          )}
          title="Modo Foco — esconde painéis laterais (F11)"
        >
          <Maximize2 className="size-3" />
          <span className="hidden xl:inline">Foco</span>
        </button>

        <div className="h-4 w-px bg-panel-border" />

        {/* Backup */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={exportBackup}
            className="flex items-center gap-1 rounded border border-panel-border bg-panel-raised px-2 py-1 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
            title="Exportar Backup (.json)"
          >
            <Download className="size-3" />
            <span className="hidden xl:inline">Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded border border-panel-border bg-panel-raised px-2 py-1 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
            title="Importar Backup (.json)"
          >
            <Upload className="size-3" />
            <span className="hidden xl:inline">Restaurar</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="h-4 w-px bg-panel-border" />

        <div className="flex rounded border border-panel-border p-0.5">
          <button
            type="button"
            onClick={() => setPreviewMode("manuscrito")}
            className={cn(
              "flex items-center gap-1 rounded-sm px-2 py-1 font-sans text-xs font-medium",
              previewMode === "manuscrito"
                ? "bg-accent text-paper"
                : "text-panel-muted hover:text-panel-fg",
            )}
          >
            <FileText className="size-3" />
            Manuscrito
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode("sumario")}
            className={cn(
              "flex items-center gap-1 rounded-sm px-2 py-1 font-sans text-xs font-medium",
              previewMode === "sumario"
                ? "bg-accent text-paper"
                : "text-panel-muted hover:text-panel-fg",
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
          title="Imprimir / PDF"
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
