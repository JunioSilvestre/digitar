import { useEffect, useRef } from "react";
import { BookOpen, Code, HelpCircle, Plus, Trash2 } from "lucide-react";
import { chapterLabel, countWords, findLocated, sectionLabel } from "@/lib/toc";
import { useTocStore } from "@/lib/toc-store";

/** Rótulo legível do nó conforme profundidade */
function depthLabel(depth: number): string {
  if (depth === 0) return "Capítulo";
  if (depth === 1) return "Seção";
  if (depth === 2) return "Subseção";
  return "Sub-subseção";
}

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
          Escolha um capítulo ou seção no painel da esquerda para editar o título e o texto do
          manuscrito.
        </p>
      </section>
    );
  }

  const depth = loc.depth;
  const label = depth === 0 ? chapterLabel(loc.path[0]!) : sectionLabel(loc.path);
  const dLabel = depthLabel(depth);
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
      {/* Header */}
      <header className="border-b border-paper-rule px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Rótulo do nível */}
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent/10 px-2 py-0.5 font-sans text-[0.65rem] font-bold tracking-[0.15em] text-accent uppercase">
              {dLabel}
            </span>
            <span className="font-sans text-[0.7rem] font-semibold text-ink-muted tabular-nums">
              {label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {page ? (
              <span className="rounded bg-paper-rule/40 px-2 py-0.5 font-sans text-xs tabular-nums text-ink-muted">
                Pág. {page}
              </span>
            ) : null}
            {/* Botão de bloco de questão — apenas para seções/subseções */}
            {depth > 0 ? (
              <button
                type="button"
                onClick={handleToggleQuestionBlock}
                className="inline-flex items-center gap-1 rounded border border-paper-rule bg-paper-raised/60 px-2 py-0.5 font-sans text-xs font-medium text-ink hover:border-accent hover:text-accent"
                title={qb ? "Remover Bloco de Questão" : "Adicionar Bloco Questão & Comando"}
              >
                <HelpCircle className="size-3" />
                {qb ? "Remover Questão" : "+ Questão"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Campo de título — capítulo não tem título editável */}
        {depth === 0 ? (
          <div className="mt-2 flex items-center gap-3 rounded border border-paper-rule/60 bg-paper-raised/60 px-3 py-2">
            <span className="font-serif text-base font-bold text-ink">{label}</span>
            <span className="ml-auto font-sans text-[0.68rem] italic text-ink-muted">
              Identificado por Algarismo Romano — sem título editável
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={loc.node.title}
            onChange={(e) => patchSelected({ title: e.target.value })}
            placeholder={`Título da ${dLabel.toLowerCase()}...`}
            className="mt-2 w-full rounded border border-transparent bg-transparent py-1 font-serif text-lg font-semibold text-ink outline-none transition-colors hover:border-paper-rule focus:border-accent focus:bg-paper-raised focus:px-2"
          />
        )}
      </header>

      {/* Bloco de Questão & Comando (quando ativo) */}
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

          {/* Enunciado */}
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
              className="w-full rounded border border-paper-rule bg-paper p-2 font-serif text-sm text-ink outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Resposta */}
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
              className="w-full rounded border border-paper-rule bg-paper p-2 font-sans text-xs font-semibold text-ink outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Explicação */}
          <div>
            <label className="block font-sans text-[0.72rem] font-semibold text-ink-muted mb-1">
              📖 Explicação Detalhada & Fundamentação
            </label>
            <textarea
              rows={3}
              value={qb.explanation}
              onChange={(e) =>
                patchSelected({ questionBlock: { ...qb, explanation: e.target.value } })
              }
              placeholder="Explique o motivo técnico..."
              className="w-full rounded border border-paper-rule bg-paper p-2 font-serif text-xs text-ink outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Exemplo de Comando */}
          <div>
            <label className="block font-sans text-[0.72rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
              <Code className="size-3" />
              💻 Exemplo de Comando & Variações (Outras Situações)
            </label>
            <textarea
              rows={4}
              value={qb.commandExample}
              onChange={(e) =>
                patchSelected({ questionBlock: { ...qb, commandExample: e.target.value } })
              }
              placeholder="$ ls -la --sort=time # Exemplo de cenário"
              className="w-full rounded border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-slate-100 outline-none focus:border-accent resize-none"
            />
          </div>
        </div>
      ) : null}

      {/* Área principal de texto */}
      <div className="relative min-h-0 flex-1 flex flex-col">
        <label className="sr-only" htmlFor="body-editor">
          Texto de {label}
        </label>
        {depth === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center text-ink-muted gap-3">
            <BookOpen className="size-10 opacity-30" strokeWidth={1} />
            <p className="font-serif text-base italic">
              Capítulos não contêm texto direto.
            </p>
            <p className="font-sans text-sm max-w-sm">
              Adicione <strong>seções</strong> abaixo do capítulo para escrever o conteúdo.
              O capítulo recebe uma página de abertura exclusiva no manuscrito.
            </p>
            <button
              type="button"
              onClick={() => addSubitem(loc.node.id)}
              className="mt-2 inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 font-sans text-xs font-semibold text-paper shadow hover:bg-accent-hover"
            >
              <Plus className="size-3.5" />
              Adicionar Seção
            </button>
          </div>
        ) : (
          <textarea
            id="body-editor"
            ref={textareaRef}
            value={loc.node.body}
            onChange={(e) => patchSelected({ body: e.target.value })}
            placeholder={`Digite o texto de ${dLabel.toLowerCase()} aqui...\n\nUse a barra superior para **negrito**, *itálico* ou <u>sublinhado</u>.\n\nSepare parágrafos com uma linha em branco.`}
            className="min-h-0 flex-1 resize-none bg-paper px-5 py-4 font-serif text-[15px] leading-[1.75] text-ink outline-none whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] placeholder:italic placeholder:text-ink-muted/40"
          />
        )}
      </div>

      {/* Rodapé */}
      {depth > 0 ? (
        <footer className="flex items-center justify-between border-t border-paper-rule px-4 py-2.5">
          <span className="font-sans text-xs tabular-nums text-ink-muted">
            {words} {words === 1 ? "palavra" : "palavras"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleQuestionBlock}
              className="inline-flex items-center gap-1 text-xs font-medium font-sans text-ink-muted hover:text-accent"
            >
              <HelpCircle className="size-3.5" />
              {qb ? "Questão ativa" : "+ Questão/Comando"}
            </button>
            <button
              type="button"
              onClick={() => addSubitem(loc.node.id)}
              className="inline-flex items-center gap-1 text-xs font-medium font-sans text-accent hover:text-accent-hover"
            >
              <Plus className="size-3.5" />
              {depth === 1 ? "Adicionar Subseção" : "Adicionar Sub-subseção"}
            </button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
