import { useEffect, useRef } from "react";
import { BookOpen, Code, HelpCircle, Plus, Trash2 } from "lucide-react";
import { chapterLabel, countWords, findLocated, sectionLabel } from "@/lib/toc";
import { useTocStore } from "@/lib/toc-store";

export function BodyEditor() {
  const items = useTocStore((s) => s.items);
  const selectedId = useTocStore((s) => s.selectedId);
  const select = useTocStore((s) => s.select);
  const patchSelected = useTocStore((s) => s.patchSelected);
  const addSubitem = useTocStore((s) => s.addSubitem);
  const addQuestionBlock = useTocStore((s) => s.addQuestionBlock);
  const pageMap = useTocStore((s) => s.pageMap);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loc = selectedId ? findLocated(items, selectedId) : null;

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      select(items[0]!.id);
    }
  }, [selectedId, items, select]);

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
  const qb = loc.node.questionBlock;

  const handleToggleQuestionBlock = () => {
    if (qb) {
      patchSelected({ questionBlock: undefined });
    } else {
      patchSelected({
        questionBlock: {
          question: "Digite o enunciado da questão ou comando aqui...",
          answer: "Digite a resposta ou comando esperado...",
          explanation: "Explique a fundamentação ou conceito técnico aqui...",
          commandExample: "$ ls -la --sort=time\n# Exemplo em outra situação / cenário",
        },
      });
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-paper">
      {/* Header com tipo de item e título */}
      <header className="border-b border-paper-rule px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-sans text-[0.7rem] font-bold tracking-widest text-accent uppercase">
            {label}
          </p>
          <div className="flex items-center gap-2">
            {page ? (
              <span className="rounded bg-paper-rule/40 px-2 py-0.5 font-sans text-xs tabular-nums text-ink-muted">
                Página {page}
              </span>
            ) : null}
            {loc.depth > 0 ? (
              <button
                type="button"
                onClick={handleToggleQuestionBlock}
                className="inline-flex items-center gap-1 rounded border border-paper-rule bg-paper-raised/60 px-2 py-0.5 font-sans text-xs font-medium text-ink hover:border-accent hover:text-accent"
                title={qb ? "Remover Bloco de Questão" : "Converter em Bloco de Questão & Comando"}
              >
                <HelpCircle className="size-3" />
                {qb ? "Remover Questão" : "+ Bloco Questão/Comando"}
              </button>
            ) : null}
          </div>
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

      {/* Formulário de Bloco Estruturado de Questão & Comando */}
      {qb ? (
        <div className="border-b border-paper-rule bg-paper-raised/30 p-4 space-y-3 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
              <HelpCircle className="size-3.5" />
              Estrutura da Questão / Comando Técnico
            </span>
            <button
              type="button"
              onClick={handleToggleQuestionBlock}
              className="text-ink-muted hover:text-red-500"
              title="Excluir Bloco de Questão"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {/* Enunciado da Questão */}
          <div>
            <label className="block font-sans text-[0.72rem] font-semibold text-ink-muted mb-1">
              ❓ Enunciado da Questão
            </label>
            <textarea
              rows={2}
              value={qb.question}
              onChange={(e) =>
                patchSelected({ questionBlock: { ...qb, question: e.target.value } })
              }
              placeholder="Digite o enunciado da questão..."
              className="w-full rounded border border-paper-rule bg-paper p-2 font-serif text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          {/* Resposta / Gabarito */}
          <div>
            <label className="block font-sans text-[0.72rem] font-semibold text-ink-muted mb-1">
              💡 Resposta / Gabarito Esperado
            </label>
            <textarea
              rows={2}
              value={qb.answer}
              onChange={(e) =>
                patchSelected({ questionBlock: { ...qb, answer: e.target.value } })
              }
              placeholder="Digite a resposta correta..."
              className="w-full rounded border border-paper-rule bg-paper p-2 font-sans text-xs font-semibold text-ink outline-none focus:border-accent"
            />
          </div>

          {/* Explicação Detalhada */}
          <div>
            <label className="block font-sans text-[0.72rem] font-semibold text-ink-muted mb-1">
              📖 Explicação Detalhada & Fundamentação
            </label>
            <textarea
              rows={2}
              value={qb.explanation}
              onChange={(e) =>
                patchSelected({ questionBlock: { ...qb, explanation: e.target.value } })
              }
              placeholder="Explique o motivo técnico..."
              className="w-full rounded border border-paper-rule bg-paper p-2 font-serif text-xs text-ink outline-none focus:border-accent"
            />
          </div>

          {/* Exemplo de Comando em Outras Situações */}
          <div>
            <label className="block font-sans text-[0.72rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
              <Code className="size-3" />
              💻 Exemplo de Comando & Variações (Outras Situações)
            </label>
            <textarea
              rows={3}
              value={qb.commandExample}
              onChange={(e) =>
                patchSelected({ questionBlock: { ...qb, commandExample: e.target.value } })
              }
              placeholder="$ ls -la --sort=time # Exemplo de cenário"
              className="w-full rounded border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-slate-100 outline-none focus:border-accent"
            />
          </div>
        </div>
      ) : null}

      {/* Área Principal de Editor de Texto Livre */}
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

        <div className="flex items-center gap-3">
          {loc.depth > 0 ? (
            <button
              type="button"
              onClick={() => addQuestionBlock(loc.node.id)}
              className="inline-flex items-center gap-1 text-xs font-medium font-sans text-accent hover:text-accent-hover"
            >
              <HelpCircle className="size-3.5" />
              + Nova Questão/Comando
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => addSubitem(loc.node.id)}
            className="inline-flex items-center gap-1 text-xs font-medium font-sans text-accent hover:text-accent-hover"
          >
            <Plus className="size-3.5" />
            {loc.depth === 0 ? "Adicionar Seção" : "Adicionar Subitem"}
          </button>
        </div>
      </footer>
    </section>
  );
}
