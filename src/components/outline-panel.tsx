import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  IndentDecrease,
  IndentIncrease,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { chapterLabel, sectionLabel, type TocNode } from "@/lib/toc";
import { useTocStore } from "@/lib/toc-store";

/** Rótulo do tipo de nó conforme profundidade */
function nodeTypeLabel(depth: number): string {
  if (depth === 0) return "Cap.";
  if (depth === 1) return "Seção";
  if (depth === 2) return "Sub";
  return "Sub³";
}

function NodeBlock({
  nodes,
  depth,
  prefix,
}: {
  nodes: TocNode[];
  depth: number;
  prefix: number[];
}) {
  const selectedId = useTocStore((s) => s.selectedId);
  const select = useTocStore((s) => s.select);
  const patchNode = useTocStore((s) => s.patchNode);
  const addSubitem = useTocStore((s) => s.addSubitem);
  const remove = useTocStore((s) => s.remove);
  const move = useTocStore((s) => s.move);
  const promote = useTocStore((s) => s.promote);
  const demote = useTocStore((s) => s.demote);
  const pageMap = useTocStore((s) => s.pageMap);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Identação visual por profundidade
  const indentClass = depth === 0 ? "" : depth === 1 ? "mt-1 ml-3 border-l border-panel-border pl-2" : "mt-0.5 ml-3 border-l border-panel-border/50 pl-2";

  return (
    <ul className={cn("flex flex-col gap-1", depth > 0 && indentClass)}>
      {nodes.map((node, idx) => {
        const path = [...prefix, idx + 1];
        const label = depth === 0 ? chapterLabel(path[0]!) : sectionLabel(path);
        const selected = selectedId === node.id;
        const hasKids = node.children.length > 0;
        const isCollapsed = !!collapsed[node.id];
        const typeLabel = nodeTypeLabel(depth);

        return (
          <li key={node.id}>
            <div
              className={cn(
                "rounded-md border transition-colors duration-150",
                depth === 0 ? "px-2 py-2" : "px-1.5 py-1.5",
                selected
                  ? "border-accent bg-panel-raised"
                  : "border-panel-border bg-panel hover:border-panel-muted",
              )}
            >
              <div className="flex items-center gap-1">
                {/* Botão de colapso */}
                {hasKids ? (
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded text-panel-muted hover:text-panel-fg"
                    aria-label={isCollapsed ? "Expandir" : "Recolher"}
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [node.id]: !c[node.id] }))
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="size-7 shrink-0" />
                )}

                {/* Botão de seleção */}
                <button
                  type="button"
                  onClick={() => select(node.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    {/* Label numérico + tipo */}
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "shrink-0 font-sans font-bold tracking-wide text-accent uppercase",
                          depth === 0 ? "text-[0.7rem]" : "text-[0.62rem]",
                        )}
                      >
                        {label}
                      </span>
                      {depth > 0 && (
                        <span className="font-sans text-[0.58rem] text-panel-muted">
                          {typeLabel}
                        </span>
                      )}
                    </div>
                    {/* Número de página */}
                    <span className="font-sans text-[0.62rem] tabular-nums text-panel-muted shrink-0">
                      {pageMap[node.id] ?? ""}
                    </span>
                  </div>

                  {/* Título (só para seções/subseções) */}
                  {depth > 0 ? (
                    <div
                      className={cn(
                        "truncate font-sans",
                        depth === 1 ? "text-sm" : "text-[0.8rem]",
                        node.title.trim()
                          ? "text-panel-fg font-medium"
                          : "italic text-panel-muted/70",
                      )}
                    >
                      {node.title.trim() || `${nodeTypeLabel(depth)} sem título`}
                    </div>
                  ) : null}

                  {/* Indicador visual: capítulo com abertura própria */}
                  {depth === 0 ? (
                    <div className="font-sans text-[0.58rem] italic text-panel-muted/60 mt-0.5">
                      Página de abertura exclusiva
                    </div>
                  ) : null}
                </button>
              </div>

              {/* Painel de ações (quando selecionado) */}
              {selected ? (
                <div className="mt-1.5 flex flex-col gap-1.5 pl-8 pr-1 pb-1">
                  {/* Campo de título editável para seções */}
                  {depth > 0 ? (
                    <input
                      type="text"
                      maxLength={100}
                      value={node.title}
                      placeholder={`Título da ${nodeTypeLabel(depth).toLowerCase()}...`}
                      onChange={(e) => patchNode(node.id, { title: e.target.value })}
                      className="w-full rounded-sm border border-panel-border bg-panel-raised px-2 py-1.5 font-sans text-sm text-panel-fg outline-none placeholder:text-panel-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                    />
                  ) : null}

                  <div className="flex items-center gap-1">
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
                      <IconBtn
                        label="Mover para cima"
                        disabled={idx === 0}
                        onClick={() => move(node.id, -1)}
                      >
                        <ChevronUp className="size-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Mover para baixo"
                        disabled={idx === nodes.length - 1}
                        onClick={() => move(node.id, 1)}
                      >
                        <ChevronDown className="size-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Subir de nível (Promover)"
                        disabled={depth === 0}
                        onClick={() => promote(node.id)}
                      >
                        <IndentDecrease className="size-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Descer de nível (Subitem)"
                        disabled={idx === 0}
                        onClick={() => demote(node.id)}
                      >
                        <IndentIncrease className="size-3.5" />
                      </IconBtn>
                      <IconBtn label="Adicionar subitem" onClick={() => addSubitem(node.id)}>
                        <Plus className="size-3.5" />
                      </IconBtn>
                      <IconBtn label="Remover" danger onClick={() => remove(node.id)}>
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Filhos */}
            {hasKids && !isCollapsed ? (
              <NodeBlock nodes={node.children} depth={depth + 1} prefix={path} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-sm border border-panel-border text-panel-muted",
        "hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-panel-border disabled:hover:text-panel-muted",
        danger && "hover:border-red-400 hover:text-red-400",
      )}
    >
      {children}
    </button>
  );
}

export function OutlinePanel() {
  const items = useTocStore((s) => s.items);
  const title = useTocStore((s) => s.title);
  const setTitle = useTocStore((s) => s.setTitle);
  const addChapter = useTocStore((s) => s.addChapter);
  const addSubitem = useTocStore((s) => s.addSubitem);
  const reset = useTocStore((s) => s.reset);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-panel text-panel-fg">
      <header className="border-b border-panel-border px-4 py-4">
        <p className="mb-0.5 font-sans text-[0.65rem] font-medium tracking-[0.18em] text-panel-muted uppercase">
          Estrutura do Livro
        </p>
        <h1 className="font-serif text-lg font-semibold text-panel-fg">Sumário</h1>

        <label className="mt-3 block">
          <span className="mb-1 block font-sans text-[0.72rem] text-panel-muted">
            Título da obra
          </span>
          <input
            type="text"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Fundamentos de Linux"
            className="w-full rounded-md border border-panel-border bg-panel-raised px-3 py-2 font-sans text-sm text-panel-fg outline-none placeholder:text-panel-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          />
        </label>
      </header>

      {/* Botões de adição */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-panel-border">
        <button
          type="button"
          onClick={addChapter}
          className="flex-1 rounded bg-accent px-2 py-1.5 font-sans text-xs font-semibold text-paper shadow hover:bg-accent-hover"
          title="Adicionar Novo Capítulo (Algarismo Romano)"
        >
          + Capítulo
        </button>
        <button
          type="button"
          onClick={() => addSubitem()}
          className="flex-1 rounded border border-panel-border bg-panel-raised px-2 py-1.5 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
          title="Adicionar Seção no Capítulo Atual"
        >
          + Seção
        </button>
        <button
          type="button"
          onClick={() => addSubitem()}
          className="flex-1 rounded border border-panel-border bg-panel-raised px-2 py-1.5 font-sans text-xs font-medium text-panel-fg hover:border-accent hover:text-accent"
          title="Adicionar Subseção no Item Atual"
        >
          + Sub
        </button>
      </div>

      {/* Árvore de itens */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
        {items.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <p className="font-sans text-sm italic text-panel-muted">
              Nenhum capítulo ainda.
            </p>
            <p className="mt-1 font-sans text-xs text-panel-muted/70">
              Clique em «+ Capítulo» para começar.
            </p>
          </div>
        ) : (
          <NodeBlock nodes={items} depth={0} prefix={[]} />
        )}
      </div>

      {/* Rodapé */}
      <footer className="border-t border-panel-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[0.65rem] text-panel-muted">
            {items.length} cap. · {items.reduce((a, c) => a + c.children.length, 0)} seções
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Restaurar o exemplo e perder as alterações?")) reset();
            }}
            className="font-sans text-xs text-panel-muted underline-offset-2 hover:text-accent hover:underline"
          >
            Restaurar exemplo
          </button>
        </div>
      </footer>
    </aside>
  );
}
