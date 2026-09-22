import { useEffect, useRef } from "react";
import {
  Bold,
  BookOpen,
  Heading,
  Italic,
  List,
  Plus,
  Underline,
} from "lucide-react";
import { chapterLabel, countWords, findLocated, sectionLabel } from "@/lib/toc";
import { useTocStore } from "@/lib/toc-store";

export function BodyEditor() {
  const items = useTocStore((s) => s.items);
  const selectedId = useTocStore((s) => s.selectedId);
  const select = useTocStore((s) => s.select);
  const patchSelected = useTocStore((s) => s.patchSelected);
  const addSubitem = useTocStore((s) => s.addSubitem);
  const pageMap = useTocStore((s) => s.pageMap);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loc = selectedId ? findLocated(items, selectedId) : null;

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      select(items[0]!.id);
    }
  }, [selectedId, items, select]);

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    const el = textareaRef.current;
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

  if (!loc) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center bg-canvas px-5 text-center">
        <BookOpen className="mb-3 size-8 text-ink-muted" strokeWidth={1.5} />
        <p className="max-w-xs font-serif text-lg text-ink">Selecione um item no sumário</p>
        <p className="mt-2 max-w-xs font-sans text-sm text-ink-muted">
          Escolha um capítulo ou seção no painel da esquerda para editar o título e o texto do manuscrito.
        </p>
      </section>
    );
  }

  const label = loc.depth === 0 ? chapterLabel(loc.path[0]!) : sectionLabel(loc.path);
  const page = pageMap[loc.node.id];
  const words = countWords(loc.node.body);

  return (
    <section className="flex h-full min-h-0 flex-col bg-paper">
      {/* Header com tipo de item e título */}
      <header className="border-b border-paper-rule px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-sans text-[0.7rem] font-bold tracking-widest text-accent uppercase">
            {label}
          </p>
          {page ? (
            <span className="rounded bg-paper-rule/40 px-2 py-0.5 font-sans text-xs tabular-nums text-ink-muted">
              Página {page}
            </span>
          ) : null}
        </div>
        {loc.depth === 0 ? (
          <div className="mt-1 flex items-center justify-between rounded bg-paper-raised/60 px-3 py-1.5 border border-paper-rule/60">
            <span className="font-serif text-base font-bold text-ink">
              {label}
            </span>
            <span className="font-sans text-[0.7rem] italic text-ink-muted">
              Identificado exclusivamente por Algarismos Romanos
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={loc.node.title}
            onChange={(e) => patchSelected({ title: e.target.value })}
            placeholder="Título da seção..."
            className="mt-1 w-full rounded border border-transparent bg-transparent py-1 font-serif text-lg font-semibold text-ink outline-none transition-colors hover:border-paper-rule focus:border-accent focus:bg-paper-raised focus:px-2"
          />
        )}
      </header>

      {/* Área Principal de Editor de Texto */}
      <div className="relative min-h-0 flex-1 flex flex-col">
        <label className="sr-only" htmlFor="body-editor">
          Texto de {label}
        </label>
        <textarea
          id="body-editor"
          ref={textareaRef}
          value={loc.node.body}
          onChange={(e) => patchSelected({ body: e.target.value })}
          placeholder={`Digite o texto para ${label} aqui...\n\nUse a barra superior para formatar em **negrito**, *itálico* ou <u>sublinhado</u>.`}
          className="min-h-0 flex-1 resize-none bg-paper px-4 py-4 font-serif text-base leading-relaxed text-ink outline-none whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] placeholder:italic placeholder:text-ink-muted/50"
        />
      </div>

      {/* Rodapé com contagem e ações */}
      <footer className="flex items-center justify-between border-t border-paper-rule px-4 py-2.5">
        <span className="font-sans text-xs tabular-nums text-ink-muted">
          {words} {words === 1 ? "palavra" : "palavras"}
        </span>

        <button
          type="button"
          onClick={() => addSubitem(loc.node.id)}
          className="inline-flex items-center gap-1 text-xs font-medium font-sans text-accent hover:text-accent-hover"
        >
          <Plus className="size-3.5" />
          {loc.depth === 0 ? "Adicionar Seção" : "Adicionar Subitem"}
        </button>
      </footer>
    </section>
  );
}
