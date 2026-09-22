import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  A4_CONTENT_H_PX,
  A4_CONTENT_W_PX,
  A4_FOLIO_PX,
  A4_H_PX,
  A4_MARGIN_PX,
  A4_W_PX,
  type FlowItem,
  type LaidPage,
} from "@/lib/a4";
import { chapterLabel, flattenNodes, sectionLabel, type TocNode } from "@/lib/toc";

export function parseFormattedToHtml(text: string): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Restore allowed HTML formatting tags
  html = html.replace(/&lt;u&gt;/g, "<u>").replace(/&lt;\/u&gt;/g, "</u>");
  html = html.replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
  html = html.replace(/&lt;i&gt;/g, "<i>").replace(/&lt;\/i&gt;/g, "</i>");
  html = html.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
  html = html.replace(/&lt;em&gt;/g, "<em>").replace(/&lt;\/em&gt;/g, "</em>");

  // Markdown Bold **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Markdown Italic *text* -> <em>text</em>
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Markdown Subheading ### Heading -> <strong>Heading</strong>
  html = html.replace(/^###\s+(.*)$/gm, '<strong style="font-size: 1.1em; display: block; margin-top: 0.3em; margin-bottom: 0.1em;">$1</strong>');

  return html;
}

function tocFlow(title: string, items: TocNode[], pageMap: Record<string, number>): FlowItem[] {
  const out: FlowItem[] = [];
  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    out.push({ kind: "toc-title", title: trimmedTitle });
  }
  out.push({ kind: "toc-kicker", title: "Sumário" });

  const walk = (nodes: TocNode[], prefix: number[], depth: number) => {
    nodes.forEach((node, i) => {
      const path = [...prefix, i + 1];
      const label = depth === 0 ? chapterLabel(path[0]!) : sectionLabel(path);
      out.push({
        kind: "toc-row",
        id: node.id,
        depth,
        label,
        title: node.title.trim(),
        page: pageMap[node.id],
      });
      walk(node.children, path, depth + 1);
    });
  };
  walk(items, [], 0);
  return out;
}

function bodyFlow(items: TocNode[]): FlowItem[] {
  const out: FlowItem[] = [];
  const flat = flattenNodes(items);
  for (const loc of flat) {
    if (loc.depth === 0) {
      if (out.length > 0) {
        out.push({ kind: "break" });
      }
      out.push({
        kind: "chapter",
        id: loc.node.id,
        label: chapterLabel(loc.path[0]!),
      });
    } else {
      out.push({
        kind: "section",
        id: loc.node.id,
        label: sectionLabel(loc.path),
        title: loc.node.title.trim(),
      });
    }
    const body = loc.node.body.replace(/\r\n/g, "\n").trim();
    if (body) {
      for (const para of body.split(/\n{2,}/)) {
        const text = para.trim();
        if (text) out.push({ kind: "para", id: loc.node.id, text });
      }
    }
  }
  return out;
}

function mountMeasurer(host: HTMLDivElement, item: FlowItem): HTMLElement {
  const el = document.createElement("div");
  el.style.width = `${A4_CONTENT_W_PX}px`;
  if (item.kind === "toc-title") {
    el.className = "text-center font-serif text-[22px] font-bold leading-snug text-ink break-words [word-break:break-word]";
    el.textContent = item.title ?? "";
  } else if (item.kind === "toc-kicker") {
    el.className = "mb-3 mt-1 text-center font-serif text-sm italic text-ink-muted";
    el.textContent = item.title ?? "Sumário";
  } else if (item.kind === "toc-row") {
    el.className = cn(
      "flex items-baseline gap-1.5",
      item.depth === 0 ? "mt-3 pt-2" : "mt-1 ml-5",
    );
    el.innerHTML = "";
    const lab = document.createElement("span");
    lab.className =
      item.depth === 0
        ? "shrink-0 font-serif text-sm font-semibold text-accent"
        : "shrink-0 font-sans text-xs text-ink-muted";
    lab.textContent = item.label ?? "";
    const tit = document.createElement("span");
    tit.className =
      item.depth === 0
        ? "min-w-0 truncate font-serif text-sm font-semibold text-ink"
        : "min-w-0 truncate font-serif text-[13px] text-ink";
    tit.textContent = item.title ?? "";
    const dots = document.createElement("span");
    dots.className =
      "relative top-[-3px] min-w-[10px] flex-1 border-b border-dotted border-paper-rule";
    const pg = document.createElement("span");
    pg.className =
      "min-w-6 shrink-0 text-right font-sans text-[12px] tabular-nums text-ink";
    pg.textContent = item.page ? String(item.page) : "—";
    el.append(lab, tit, dots, pg);
  } else if (item.kind === "chapter") {
    el.className = "mt-5 border-t border-paper-rule pt-4 first:mt-0 first:border-t-0 first:pt-0";
    const lab = document.createElement("div");
    lab.className =
      "font-sans text-[13px] font-bold tracking-widest text-accent uppercase";
    lab.textContent = item.label ?? "";
    el.appendChild(lab);
  } else if (item.kind === "section") {
    el.className = "mt-4";
    const lab = document.createElement("div");
    lab.className = "font-sans text-[11px] font-medium tracking-wide text-ink-muted";
    lab.textContent = item.label ?? "";
    el.appendChild(lab);
    if (item.title) {
      const tit = document.createElement("div");
      tit.className = "mt-0.5 font-serif text-[16px] font-semibold text-ink break-words [word-break:break-word]";
      tit.textContent = item.title;
      el.appendChild(tit);
    }
  } else {
    el.className = "mt-2.5 whitespace-pre-wrap font-serif text-[15px] leading-[1.6] text-ink break-words [word-break:break-word] [overflow-wrap:anywhere]";
    el.innerHTML = parseFormattedToHtml(item.text ?? "");
  }
  host.appendChild(el);
  return el;
}

function measure(host: HTMLDivElement, item: FlowItem): number {
  host.replaceChildren();
  const el = mountMeasurer(host, item);
  return Math.ceil(el.getBoundingClientRect().height);
}

function splitPara(host: HTMLDivElement, item: FlowItem, maxH: number): FlowItem[] {
  const text = item.text ?? "";
  const words = text.split(/(\s+)/);
  const parts: FlowItem[] = [];
  let acc = "";
  for (const w of words) {
    const next = acc + w;
    const h = measure(host, { ...item, text: next.trimEnd() });
    if (h > maxH && acc.trim()) {
      parts.push({ ...item, text: acc.trim() });
      acc = w;
    } else {
      acc = next;
    }
  }
  if (acc.trim()) parts.push({ ...item, text: acc.trim() });
  return parts.length ? parts : [{ ...item, text: text.slice(0, 1) }];
}

function pack(host: HTMLDivElement, items: FlowItem[], kind: LaidPage["kind"]): LaidPage[] {
  const pages: LaidPage[] = [];
  let current: FlowItem[] = [];
  let used = 0;
  const flush = () => {
    if (current.length) {
      pages.push({ kind, items: current });
      current = [];
      used = 0;
    }
  };
  for (const raw of items) {
    if (raw.kind === "break") {
      flush();
      continue;
    }
    let h = measure(host, raw);
    if (h > A4_CONTENT_H_PX && raw.kind === "para") {
      const chunks = splitPara(host, raw, A4_CONTENT_H_PX);
      for (const chunk of chunks) {
        h = measure(host, chunk);
        if (used + h > A4_CONTENT_H_PX && current.length) flush();
        current.push(chunk);
        used += h;
      }
      continue;
    }
    if (used + h > A4_CONTENT_H_PX && current.length) flush();
    current.push(raw);
    used += h;
  }
  flush();
  return pages.length ? pages : [{ kind, items: [] }];
}

function layoutBook(host: HTMLDivElement, title: string, items: TocNode[]): {
  pages: LaidPage[];
  pageMap: Record<string, number>;
} {
  const tocDraft = pack(host, tocFlow(title, items, {}), "toc");
  const tocCount = Math.max(1, tocDraft.length);
  const bodyPacked = pack(host, bodyFlow(items), "body");
  const pageMap: Record<string, number> = {};
  bodyPacked.forEach((page, i) => {
    const num = tocCount + i + 1;
    for (const it of page.items) {
      if (it.id && (it.kind === "chapter" || it.kind === "section") && pageMap[it.id] == null) {
        pageMap[it.id] = num;
      }
    }
  });
  const tocFinal = pack(host, tocFlow(title, items, pageMap), "toc");
  return { pages: [...tocFinal, ...bodyPacked], pageMap };
}

function FlowView({
  item,
  selectedId,
  onSelect,
}: {
  item: FlowItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (item.kind === "toc-title") {
    return (
      <h2 className="text-center font-serif text-[22px] font-bold leading-snug text-ink break-words [word-break:break-word]">
        {item.title}
      </h2>
    );
  }
  if (item.kind === "toc-kicker") {
    return (
      <p className="mb-3 mt-1 text-center font-serif text-sm italic text-ink-muted">
        {item.title}
      </p>
    );
  }
  if (item.kind === "toc-row") {
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "flex w-full items-baseline gap-1.5 text-left transition-colors",
          item.depth === 0 ? "mt-3 pt-2" : "mt-1 ml-5",
          selectedId === item.id && "rounded-sm bg-paper-rule/30 p-0.5",
        )}
      >
        <span
          className={
            item.depth === 0
              ? "shrink-0 font-serif text-sm font-semibold text-accent"
              : "shrink-0 font-sans text-xs text-ink-muted"
          }
        >
          {item.label}
        </span>
        <span
          className={
            item.depth === 0
              ? "min-w-0 truncate font-serif text-sm font-semibold text-ink"
              : "min-w-0 truncate font-serif text-[13px] text-ink"
          }
        >
          {item.title}
        </span>
        <span className="relative top-[-3px] min-w-[10px] flex-1 border-b border-dotted border-paper-rule" />
        <span className="min-w-6 shrink-0 text-right font-sans text-[12px] tabular-nums text-ink">
          {item.page ?? "—"}
        </span>
      </button>
    );
  }
  if (item.kind === "chapter") {
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "mt-5 w-full border-t border-paper-rule pt-4 text-left first:mt-0 first:border-t-0 first:pt-0 transition-colors",
          selectedId === item.id && "rounded-sm bg-paper-rule/20 p-1",
        )}
      >
        <div className="font-sans text-[13px] font-bold tracking-widest text-accent uppercase">
          {item.label}
        </div>
      </button>
    );
  }
  if (item.kind === "section") {
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "mt-4 w-full text-left transition-colors",
          selectedId === item.id && "rounded-sm bg-paper-rule/20 p-1",
        )}
      >
        <div className="font-sans text-[11px] font-medium tracking-wide text-ink-muted">
          {item.label}
        </div>
        {item.title ? (
          <div className="mt-0.5 font-serif text-[16px] font-semibold text-ink break-words [word-break:break-word]">
            {item.title}
          </div>
        ) : null}
      </button>
    );
  }
  return (
    <p
      className="mt-2.5 whitespace-pre-wrap font-serif text-[15px] leading-[1.6] text-ink break-words [word-break:break-word] [overflow-wrap:anywhere]"
      dangerouslySetInnerHTML={{ __html: parseFormattedToHtml(item.text ?? "") }}
    />
  );
}

function A4Sheet({
  page,
  number,
  selectedId,
  onSelect,
}: {
  page: LaidPage;
  number: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <article
      className="a4-sheet relative bg-paper text-ink shadow-[0_18px_40px_-16px_rgba(0,0,0,.45)] transition-shadow"
      style={{
        width: A4_W_PX,
        height: A4_H_PX,
        padding: A4_MARGIN_PX,
        boxSizing: "border-box",
      }}
    >
      <div style={{ height: A4_CONTENT_H_PX, overflow: "hidden" }}>
        {page.items.length === 0 ? (
          <p className="pt-24 text-center font-serif text-sm italic text-ink-muted">
            Folha em branco
          </p>
        ) : (
          page.items.map((item, i) => (
            <FlowView key={i} item={item} selectedId={selectedId} onSelect={onSelect} />
          ))
        )}
      </div>
      <div
        className="flex items-end justify-center font-sans text-[11px] tabular-nums text-ink-muted"
        style={{ height: A4_FOLIO_PX }}
      >
        {number}
      </div>
    </article>
  );
}

export function A4Book({
  title,
  items,
  mode,
  selectedId,
  onSelect,
  onPageMap,
  layoutMode = "grid",
  customScale = null,
}: {
  title: string;
  items: TocNode[];
  mode: "sumario" | "manuscrito";
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPageMap: (map: Record<string, number>) => void;
  layoutMode?: "grid" | "stack";
  customScale?: number | null;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<LaidPage[]>([]);
  const [autoScale, setAutoScale] = useState(0.75);
  const pageMapRef = useRef<string>("");

  useLayoutEffect(() => {
    const host = measureRef.current;
    if (!host) return;
    const { pages: laid, pageMap } = layoutBook(host, title, items);
    setPages(laid);
    const key = JSON.stringify(pageMap);
    if (key !== pageMapRef.current) {
      pageMapRef.current = key;
      onPageMap(pageMap);
    }
  }, [title, items, onPageMap]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const target = el.parentElement ?? el;
    const apply = () => {
      const w = target.clientWidth || 800;
      let computedScale = Math.max(0.35, Math.min(1, (w - 24) / A4_W_PX));
      if (layoutMode === "grid" && w > 1100) {
        // Na visualização em grade com espaço lateral amplo, ajusta a escala para encaixar páginas lado a lado
        computedScale = Math.max(0.45, Math.min(0.75, (w - 60) / (A4_W_PX * 2)));
      }
      setAutoScale(computedScale);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(target);
    return () => ro.disconnect();
  }, [layoutMode]);

  const shown = mode === "sumario" ? pages.filter((p) => p.kind === "toc") : pages;
  const effectiveScale = customScale !== null ? customScale : autoScale;

  return (
    <div ref={wrapRef} className="w-full min-w-0">
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 font-serif"
        style={{ width: A4_CONTENT_W_PX }}
      />
      <div
        id="print-root"
        className={cn(
          "flex items-start gap-6 pb-8 transition-all",
          layoutMode === "grid" ? "flex-row flex-wrap justify-center" : "flex-col items-center",
        )}
      >
        {shown.map((page, i) => {
          const number = mode === "sumario" ? i + 1 : pages.indexOf(page) + 1;
          const currentScale = effectiveScale > 0 ? effectiveScale : 0.75;
          return (
            <div
              key={`${page.kind}-${i}`}
              style={{
                width: A4_W_PX * currentScale,
                height: A4_H_PX * currentScale,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: A4_W_PX,
                  height: A4_H_PX,
                  transform: `scale(${currentScale})`,
                  transformOrigin: "top left",
                }}
              >
                <A4Sheet
                  page={page}
                  number={number}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
