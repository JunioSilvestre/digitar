import { useEffect, useRef, useCallback } from "react";
import {
  BookOpen,
  Code,
  HelpCircle,
  Plus,
  Trash2,
  Hash,
  AlignLeft,
  Terminal,
  Lightbulb,
  BookMarked,
  Tag,
  Clock,
  Zap,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { chapterLabel, countWords, findLocated, sectionLabel } from "@/lib/toc";
import type {
  QuestionBlock,
  QuestionAlternatives,
  QuestionType,
  QuestionDifficulty,
} from "@/lib/toc";
import { useTocStore } from "@/lib/toc-store";

// ─── helpers ──────────────────────────────────────────────────────────────────

function depthLabel(depth: number): string {
  if (depth === 0) return "Capítulo";
  if (depth === 1) return "Seção";
  if (depth === 2) return "Subseção";
  return "Sub-subseção";
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  objetiva: "Objetiva (A–E)",
  dissertativa: "Dissertativa",
  pratica: "Prática / Comando",
};

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  objetiva: <Hash className="size-3.5" />,
  dissertativa: <AlignLeft className="size-3.5" />,
  pratica: <Terminal className="size-3.5" />,
};

const DIFFICULTY_CONFIG: Record<QuestionDifficulty, { label: string; color: string; bg: string }> =
  {
    facil: { label: "Fácil", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
    medio: { label: "Médio", color: "text-amber-700", bg: "bg-amber-50 border-amber-300" },
    dificil: { label: "Difícil", color: "text-red-700", bg: "bg-red-50 border-red-300" },
  };

const ALT_KEYS: (keyof QuestionAlternatives)[] = ["a", "b", "c", "d", "e"];

const EMPTY_ALTERNATIVES: QuestionAlternatives = { a: "", b: "", c: "", d: "", e: "" };

// ─── AutoGrowTextarea ─────────────────────────────────────────────────────────

/**
 * Textarea que cresce automaticamente com o conteúdo.
 * Evita scroll interno, deixando a área fluir naturalmente.
 */
function AutoGrowTextarea({
  id,
  value,
  onChange,
  placeholder,
  className,
  minRows = 2,
  spellCheck = true,
  onKeyDown,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  spellCheck?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      id={id}
      ref={ref}
      value={value}
      rows={minRows}
      spellCheck={spellCheck}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      style={{ resize: "none", overflow: "hidden" }}
    />
  );
}

// ─── QuestionBlockEditor ──────────────────────────────────────────────────────

function QuestionBlockEditor({
  qb,
  onChange,
  onRemove,
}: {
  qb: QuestionBlock;
  onChange: (patch: Partial<QuestionBlock>) => void;
  onRemove: () => void;
}) {
  // Sem handlers locais (removidos)

  return (
    <div className="border-b border-paper-rule bg-paper-raised/30 px-4 py-3 space-y-3 min-h-0">
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="size-3.5" />
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-muted hover:text-red-500 transition-colors p-0.5 rounded"
          title="Excluir Bloco de Questão"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {/* Removidos: Tipo e Dificuldade */}{" "}
      {/* ── Linha 2: Tags + Tempo estimado ───────────────────────────────── */}
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <label className="block font-sans text-[0.68rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
            <Tag className="size-3" /> Tags / Tópicos{" "}
            <span className="font-normal text-ink-muted/60">(separados por vírgula)</span>
          </label>
          <input
            type="text"
            value={qb.tags ?? ""}
            onChange={(e) => onChange({ tags: e.target.value })}
            placeholder="linux, shell, permissões..."
            className="w-full rounded border border-paper-rule bg-paper px-2 py-1 font-sans text-xs text-ink outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block font-sans text-[0.68rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
            <Clock className="size-3" /> Tipo de Prova{" "}
            <span className="font-normal text-ink-muted/60">(ex: LPIC, CompTIA)</span>
          </label>
          <input
            type="text"
            value={qb.examType ?? ""}
            onChange={(e) => onChange({ examType: e.target.value })}
            placeholder="LPIC-1"
            className="w-full rounded border border-paper-rule bg-paper px-2 py-1 font-sans text-xs text-ink outline-none focus:border-accent"
          />
        </div>
      </div>
      {/* ── Enunciado ────────────────────────────────────────────────────── */}
      <div>
        <label className="block font-sans text-[0.7rem] font-semibold text-ink-muted mb-1">
          ❓ Enunciado da Questão
        </label>
        <AutoGrowTextarea
          value={qb.question}
          minRows={2}
          onChange={(v) => onChange({ question: v })}
          placeholder="Digite o enunciado da questão..."
          className="w-full rounded border border-paper-rule bg-paper p-2 font-serif text-sm text-ink outline-none focus:border-accent"
        />
      </div>
      {/* ── Resposta / Gabarito ─────────────────── */}
      <div>
        <label className="block font-sans text-[0.7rem] font-semibold text-ink-muted mb-1">
          💡 Resposta / Gabarito Correto
        </label>
        <AutoGrowTextarea
          value={qb.answer}
          minRows={2}
          onChange={(v) => onChange({ answer: v })}
          placeholder="Digite a resposta correta..."
          className="w-full rounded border border-paper-rule bg-paper p-2 font-sans text-xs font-semibold text-ink outline-none focus:border-accent"
        />
      </div>
      {/* ── Explicação ───────────────────────────────────────────────────── */}
      <div>
        <label className="block font-sans text-[0.7rem] font-semibold text-ink-muted mb-1">
          📖 Explicação Detalhada &amp; Fundamentação
        </label>
        <AutoGrowTextarea
          value={qb.explanation}
          minRows={3}
          onChange={(v) => onChange({ explanation: v })}
          placeholder="Explique o conceito técnico por trás da resposta..."
          className="w-full rounded border border-paper-rule bg-paper p-2 font-serif text-xs text-ink outline-none focus:border-accent"
        />
      </div>
      {/* ── Exemplo de Comando ───────────────────────────────────────────── */}
      <div>
        <label className="block font-sans text-[0.7rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
          <Code className="size-3" />
          💻 Exemplo de Comando &amp; Variações
        </label>
        <AutoGrowTextarea
          value={qb.commandExample}
          minRows={3}
          onChange={(v) => onChange({ commandExample: v })}
          placeholder={"$ ls -la --sort=time\n# Exemplo em outro cenário"}
          spellCheck={false}
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-slate-100 outline-none focus:border-accent"
        />
      </div>
      {/* ── Dicas (hints) ────────────────────────────────────────────────── */}
      <div>
        <label className="block font-sans text-[0.7rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
          <Lightbulb className="size-3 text-amber-500" />
          💡 Dica(s) para o Aluno{" "}
          <span className="font-normal text-ink-muted/60">
            (sem spoiler — revela quando quiser)
          </span>
        </label>
        <AutoGrowTextarea
          value={qb.hints ?? ""}
          minRows={2}
          onChange={(v) => onChange({ hints: v })}
          placeholder="Ex.: Pense em qual flag do ls lista arquivos ocultos..."
          className="w-full rounded border border-amber-200 bg-amber-50/40 p-2 font-sans text-xs text-ink outline-none focus:border-amber-400"
        />
      </div>
      {/* ── Armadilhas / Pegadinhas ──────────────────────────────────────── */}
      <div>
        <label className="block font-sans text-[0.7rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
          <AlertTriangle className="size-3 text-red-400" />
          ⚠️ Pegadinhas / Pontos de Atenção{" "}
          <span className="font-normal text-ink-muted/60">
            (visível apenas no material do professor)
          </span>
        </label>
        <AutoGrowTextarea
          value={qb.traps ?? ""}
          minRows={2}
          onChange={(v) => onChange({ traps: v })}
          placeholder="Ex.: Alunos confundem -l com -L; atenção ao case-sensitive..."
          className="w-full rounded border border-red-200 bg-red-50/30 p-2 font-sans text-xs text-ink outline-none focus:border-red-300"
        />
      </div>
      {/* ── Referência bibliográfica ─────────────────────────────────────── */}
      <div>
        <label className="block font-sans text-[0.68rem] font-semibold text-ink-muted mb-1 flex items-center gap-1">
          <BookMarked className="size-3" />
          📚 Fonte / Referência
        </label>
        <input
          type="text"
          value={qb.reference ?? ""}
          onChange={(e) => onChange({ reference: e.target.value })}
          placeholder="Ex.: Linux Command Line, Capítulo 3 / man ls"
          className="w-full rounded border border-paper-rule bg-paper px-2 py-1 font-sans text-xs text-ink outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}

// ─── BodyEditor (componente principal) ───────────────────────────────────────

export function BodyEditor({
  focusMode = false,
  onToggleFocus,
}: {
  focusMode?: boolean;
  onToggleFocus?: () => void;
}) {
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

  // ── Atalhos de teclado na área de texto principal ─────────────────────────
  const handleBodyKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;

      // Tab → inserir 2 espaços (evita mudar foco)
      if (e.key === "Tab") {
        e.preventDefault();
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const body = el.value;
        const next = body.substring(0, start) + "  " + body.substring(end);
        patchSelected({ body: next });
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        }, 0);
        return;
      }

      // Ctrl/Cmd + B → **negrito**
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        insertWrap(el, "**", "**");
        return;
      }

      // Ctrl/Cmd + I → *itálico*
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        insertWrap(el, "*", "*");
        return;
      }

      // Ctrl/Cmd + U → <u>sublinhado</u>
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        insertWrap(el, "<u>", "</u>");
        return;
      }
    },
    [patchSelected],
  );

  /** Envolve texto selecionado com prefix/suffix e atualiza o estado */
  function insertWrap(el: HTMLTextAreaElement, prefix: string, suffix: string) {
    if (!loc) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const body = loc.node.body;
    const selected = body.substring(start, end);
    const replacement = `${prefix}${selected || "texto"}${suffix}`;
    const next = body.substring(0, start) + replacement + body.substring(end);
    patchSelected({ body: next });
    setTimeout(() => {
      el.focus();
      const selLen = selected.length || 5;
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + selLen;
    }, 10);
  }

  // ── Handlers de questão ───────────────────────────────────────────────────
  const qb = loc?.node.questionBlock;

  const handleToggleQuestionBlock = () => {
    if (qb) {
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

  const handleQuestionChange = (patch: Partial<QuestionBlock>) => {
    if (!qb) return;
    patchSelected({ questionBlock: { ...qb, ...patch } });
  };

  // ── Estado derivado ───────────────────────────────────────────────────────
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
  const chars = loc.node.body.length;

  return (
    <section
      className={`flex h-full min-h-0 flex-col bg-paper transition-all ${focusMode ? "max-w-3xl mx-auto" : ""}`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-paper-rule px-4 py-3">
        <div className="flex items-center justify-between gap-2">
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

            {depth > 0 ? (
              <button
                type="button"
                onClick={handleToggleQuestionBlock}
                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-sans text-xs font-medium transition-colors ${
                  qb
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-paper-rule bg-paper-raised/60 text-ink hover:border-accent hover:text-accent"
                }`}
                title={qb ? "Remover Bloco de Questão" : "Adicionar Bloco Questão & Comando"}
              >
                <HelpCircle className="size-3" />
                {qb ? "Questão ativa" : "+ Questão"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Campo de título */}
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
            maxLength={30}
            value={loc.node.title}
            onChange={(e) => patchSelected({ title: e.target.value })}
            placeholder={`Título da ${dLabel.toLowerCase()} (máx. 30 caracteres)...`}
            className="mt-2 w-full rounded border border-transparent bg-transparent py-1 font-serif text-lg font-semibold text-ink outline-none transition-colors hover:border-paper-rule focus:border-accent focus:bg-paper-raised focus:px-2"
            spellCheck
          />
        )}
      </header>

      {/* ── Bloco de Questão ───────────────────────────────────────────────── */}
      {qb ? (
        <div className="min-h-0 overflow-y-auto">
          <QuestionBlockEditor
            qb={qb}
            onChange={handleQuestionChange}
            onRemove={() => patchSelected({ questionBlock: undefined })}
          />
        </div>
      ) : null}

      {/* ── Área principal de texto ─────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 flex flex-col overflow-y-auto">
        <label className="sr-only" htmlFor="body-editor">
          Texto de {label}
        </label>

        {depth === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center text-ink-muted gap-3">
            <BookOpen className="size-10 opacity-30" strokeWidth={1} />
            <p className="font-serif text-base italic">
              Capítulos não contêm texto ou questões diretas.
            </p>
            <p className="font-sans text-sm max-w-sm">
              Adicione <strong>seções</strong> abaixo do capítulo para escrever o conteúdo e inserir{" "}
              <strong>questões</strong>. O capítulo recebe uma página de abertura exclusiva no
              manuscrito, sem conteúdo textual livre.
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
          <>
            {/* Dica de atalhos — barra simples, só aparece quando vazia */}
            {!loc.node.body && (
              <div className="border-b border-paper-rule/50 bg-paper-raised/40 px-5 py-2 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-sans text-[0.67rem] text-ink-muted/70 italic">
                  <kbd className="rounded bg-paper-rule/60 px-1 font-mono text-[0.65rem]">
                    Ctrl+B
                  </kbd>{" "}
                  negrito
                </span>
                <span className="font-sans text-[0.67rem] text-ink-muted/70 italic">
                  <kbd className="rounded bg-paper-rule/60 px-1 font-mono text-[0.65rem]">
                    Ctrl+I
                  </kbd>{" "}
                  itálico
                </span>
                <span className="font-sans text-[0.67rem] text-ink-muted/70 italic">
                  <kbd className="rounded bg-paper-rule/60 px-1 font-mono text-[0.65rem]">
                    Ctrl+U
                  </kbd>{" "}
                  sublinhado
                </span>
                <span className="font-sans text-[0.67rem] text-ink-muted/70 italic">
                  <kbd className="rounded bg-paper-rule/60 px-1 font-mono text-[0.65rem]">Tab</kbd>{" "}
                  recuo
                </span>
              </div>
            )}
            <textarea
              id="body-editor"
              ref={textareaRef}
              value={loc.node.body}
              onChange={(e) => patchSelected({ body: e.target.value })}
              onKeyDown={handleBodyKeyDown}
              spellCheck
              lang="pt-BR"
              placeholder={`Escreva o texto da ${dLabel.toLowerCase()} aqui...`}
              className="min-h-0 flex-1 resize-none bg-paper px-5 py-4 font-serif text-[15px] leading-[1.75] text-ink outline-none whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] placeholder:italic placeholder:text-ink-muted/40"
            />
          </>
        )}
      </div>

      {/* ── Rodapé ─────────────────────────────────────────────────────────── */}
      {depth > 0 ? (
        <footer className="flex items-center justify-between border-t border-paper-rule px-4 py-2">
          {/* Contadores */}
          <div className="flex items-center gap-3">
            <span className="font-sans text-xs tabular-nums text-ink-muted">
              {words} {words === 1 ? "palavra" : "palavras"}
            </span>
            <span className="text-ink-muted/40 text-xs">·</span>
            <span className="font-sans text-xs tabular-nums text-ink-muted">
              {chars} {chars === 1 ? "caractere" : "caracteres"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Modo Foco */}
            {onToggleFocus && (
              <button
                type="button"
                onClick={onToggleFocus}
                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-sans text-xs font-medium transition-colors ${
                  focusMode
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-paper-rule text-ink-muted hover:border-accent hover:text-accent"
                }`}
                title="Modo Foco — esconde painéis (F11)"
              >
                {focusMode ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
                {focusMode ? "Sair do Foco" : "Foco"}
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleQuestionBlock}
              className={`inline-flex items-center gap-1 text-xs font-medium font-sans transition-colors ${
                qb ? "text-accent" : "text-ink-muted hover:text-accent"
              }`}
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
