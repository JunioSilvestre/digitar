import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  A4_CONTENT_H_PX,
  A4_CONTENT_W_PX,
  A4_FOLIO_PX,
  A4_H_PX,
  A4_HEADER_PX,
  A4_MARGIN_BOTTOM_PX,
  A4_MARGIN_INNER_PX,
  A4_MARGIN_OUTER_PX,
  A4_MARGIN_TOP_PX,
  A4_W_PX,
  type FlowItem,
  type LaidPage,
} from "@/lib/a4";
import { chapterLabel, flattenNodes, sectionLabel, type TocNode } from "@/lib/toc";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de formatação de texto
// ──────────────────────────────────────────────────────────────────────────────

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

  // Markdown Subheading ### Heading
  html = html.replace(
    /^###\s+(.*)$/gm,
    '<strong style="font-size:1.05em;display:block;margin-top:0.5em;margin-bottom:0.15em;font-variant:small-caps;letter-spacing:0.03em;">$1</strong>',
  );

  // Listas com traço/marcador: - item
  html = html.replace(/^-\s+(.*)$/gm, '<span style="display:block;padding-left:1.2em;text-indent:-1em;">– $1</span>');

  return html;
}

// ──────────────────────────────────────────────────────────────────────────────
// Construção dos fluxos (TOC e Body)
// ──────────────────────────────────────────────────────────────────────────────

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
      if (depth < 2) {
        walk(node.children, path, depth + 1);
      }
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
      // Página de abertura de capítulo
      if (out.length > 0) out.push({ kind: "break" });
      out.push({
        kind: "chapter-open",
        id: loc.node.id,
        label: chapterLabel(loc.path[0]!),
        title: loc.node.title.trim() || "",
      });
    } else if (loc.depth === 1) {
      out.push({
        kind: "section",
        id: loc.node.id,
        label: sectionLabel(loc.path),
        title: loc.node.title.trim(),
      });
    } else if (loc.depth === 2) {
      out.push({
        kind: "subsection",
        id: loc.node.id,
        label: sectionLabel(loc.path),
        title: loc.node.title.trim(),
      });
    } else {
      out.push({
        kind: "subsubsection",
        id: loc.node.id,
        label: sectionLabel(loc.path),
        title: loc.node.title.trim(),
      });
    }

    if (loc.node.questionBlock) {
      out.push({
        kind: "question-block",
        id: loc.node.id,
        questionBlock: loc.node.questionBlock,
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

// ──────────────────────────────────────────────────────────────────────────────
// Medição de altura dos elementos (para paginação)
// ──────────────────────────────────────────────────────────────────────────────

function mountMeasurer(host: HTMLDivElement, item: FlowItem): HTMLElement {
  const el = document.createElement("div");
  el.style.width = `${A4_CONTENT_W_PX}px`;
  el.style.fontFamily = "'Spectral', Georgia, serif";

  if (item.kind === "toc-title") {
    el.style.cssText += `text-align:center;font-size:20px;font-weight:700;line-height:1.3;margin-bottom:4px;color:#221f1b;letter-spacing:0.01em;`;
    el.textContent = item.title ?? "";

  } else if (item.kind === "toc-kicker") {
    el.style.cssText += `text-align:center;font-size:11px;font-style:italic;color:#8a8071;margin-bottom:16px;margin-top:2px;letter-spacing:0.12em;font-family:'Inter',sans-serif;text-transform:uppercase;`;
    el.textContent = "Sumário";

  } else if (item.kind === "toc-row") {
    const depth = item.depth ?? 0;
    el.style.cssText += `display:flex;align-items:baseline;gap:4px;margin-top:${depth === 0 ? 10 : depth === 1 ? 5 : 3}px;padding-left:${depth === 0 ? 0 : depth === 1 ? 16 : 32}px;`;

    const lab = document.createElement("span");
    lab.style.cssText = `flex-shrink:0;font-family:'Inter',sans-serif;font-size:${depth === 0 ? 11 : 10}px;font-weight:${depth === 0 ? 700 : 500};color:${depth === 0 ? "#8c2f39" : "#8a8071"};white-space:nowrap;`;
    lab.textContent = item.label ?? "";

    const tit = document.createElement("span");
    tit.style.cssText = `min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:${depth === 0 ? 12 : depth === 1 ? 11 : 10}px;font-weight:${depth === 0 ? 600 : 400};color:#221f1b;`;
    tit.textContent = item.title ?? "";

    const dots = document.createElement("span");
    dots.style.cssText = `flex:1;min-width:8px;border-bottom:1px dotted #d8cfb8;position:relative;top:-3px;`;

    const pg = document.createElement("span");
    pg.style.cssText = `flex-shrink:0;min-width:24px;text-align:right;font-family:'Inter',sans-serif;font-size:11px;font-variant-numeric:tabular-nums;color:#221f1b;`;
    pg.textContent = item.page ? String(item.page) : "—";

    el.append(lab, tit, dots, pg);

  } else if (item.kind === "chapter-open") {
    // Página inteira de abertura — medimos apenas o bloco de conteúdo
    el.style.cssText += `text-align:center;padding:${A4_CONTENT_H_PX * 0.3}px 0 0;`;
    const lab = document.createElement("div");
    lab.style.cssText = `font-family:'Inter',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#8c2f39;margin-bottom:16px;`;
    lab.textContent = item.label ?? "";
    const tit = document.createElement("div");
    tit.style.cssText = `font-size:26px;font-weight:700;line-height:1.25;color:#221f1b;`;
    tit.textContent = item.title ?? "";
    el.append(lab, tit);

  } else if (item.kind === "chapter") {
    el.style.cssText += `margin-top:20px;border-top:1px solid #d8cfb8;padding-top:16px;`;
    const lab = document.createElement("div");
    lab.style.cssText = `font-family:'Inter',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#8c2f39;`;
    lab.textContent = item.label ?? "";
    el.appendChild(lab);

  } else if (item.kind === "section") {
    el.style.cssText += `margin-top:20px;`;
    const lab = document.createElement("div");
    lab.style.cssText = `font-family:'Inter',sans-serif;font-size:9px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#8a8071;margin-bottom:4px;`;
    lab.textContent = item.label ?? "";
    el.appendChild(lab);
    if (item.title) {
      const tit = document.createElement("div");
      tit.style.cssText = `font-size:17px;font-weight:700;line-height:1.3;color:#221f1b;`;
      tit.textContent = item.title;
      el.appendChild(tit);
    }

  } else if (item.kind === "subsection") {
    el.style.cssText += `margin-top:14px;`;
    const lab = document.createElement("span");
    lab.style.cssText = `font-family:'Inter',sans-serif;font-size:8.5px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#8a8071;margin-right:6px;`;
    lab.textContent = (item.label ?? "") + " ";
    if (item.title) {
      const tit = document.createElement("span");
      tit.style.cssText = `font-size:14px;font-weight:700;font-style:italic;color:#221f1b;`;
      tit.textContent = item.title;
      el.append(lab, tit);
    }

  } else if (item.kind === "subsubsection") {
    el.style.cssText += `margin-top:10px;`;
    if (item.title) {
      const tit = document.createElement("span");
      tit.style.cssText = `font-size:13px;font-weight:600;font-style:italic;color:#3a3530;`;
      tit.textContent = (item.label ? item.label + " " : "") + item.title;
      el.appendChild(tit);
    }

  } else if (item.kind === "ornament") {
    el.style.cssText += `text-align:center;color:#8a8071;margin:12px 0;font-size:13px;letter-spacing:0.4em;`;
    el.textContent = "❧";

  } else if (item.kind === "question-block" && item.questionBlock) {
    el.style.cssText += `margin-top:16px;border:1px solid #d8cfb8;border-radius:4px;background:#f5f0e4;padding:14px;`;
    const header = document.createElement("div");
    header.style.cssText = `font-family:'Inter',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8c2f39;margin-bottom:10px;`;
    header.textContent = "❓ Questão";
    const q = document.createElement("div");
    q.style.cssText = `font-size:13px;font-weight:600;line-height:1.5;color:#221f1b;margin-bottom:8px;`;
    q.textContent = item.questionBlock.question;
    const ansLabel = document.createElement("div");
    ansLabel.style.cssText = `font-family:'Inter',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#5a7a3a;margin-bottom:4px;`;
    ansLabel.textContent = "💡 Resposta";
    const ans = document.createElement("div");
    ans.style.cssText = `font-family:'Inter',sans-serif;font-size:12px;font-weight:600;color:#3a5a2a;margin-bottom:10px;`;
    ans.textContent = item.questionBlock.answer;
    const expLabel = document.createElement("div");
    expLabel.style.cssText = `font-family:'Inter',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#6a6060;margin-bottom:4px;`;
    expLabel.textContent = "📖 Explicação";
    const exp = document.createElement("div");
    exp.style.cssText = `font-size:12px;line-height:1.55;color:#3a3530;margin-bottom:10px;`;
    exp.textContent = item.questionBlock.explanation;
    if (item.questionBlock.commandExample) {
      const cmdLabel = document.createElement("div");
      cmdLabel.style.cssText = `font-family:'Inter',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#2a4a6a;margin-bottom:4px;`;
      cmdLabel.textContent = "💻 Exemplo";
      const cmd = document.createElement("pre");
      cmd.style.cssText = `font-family:'Fira Code','Courier New',monospace;font-size:10.5px;background:#1e2124;color:#d4e0f0;padding:10px 12px;border-radius:3px;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;`;
      cmd.textContent = item.questionBlock.commandExample;
      el.append(header, q, ansLabel, ans, expLabel, exp, cmdLabel, cmd);
    } else {
      el.append(header, q, ansLabel, ans, expLabel, exp);
    }

  } else {
    // Parágrafo — com indentação da primeira linha e justificado
    el.style.cssText += `font-size:14.5px;line-height:1.7;text-align:justify;color:#221f1b;text-indent:1.5em;margin-top:0;hyphens:auto;-webkit-hyphens:auto;word-break:break-word;overflow-wrap:anywhere;`;
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

    // Abertura de capítulo → página inteira própria
    if (raw.kind === "chapter-open") {
      flush();
      pages.push({ kind: "chapter-open", items: [raw] });
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

    // Section no início de página: não quebrar antes se for primeiro item
    const isBlock = raw.kind === "section" || raw.kind === "question-block";
    if (used + h > A4_CONTENT_H_PX && current.length) flush();
    // Evitar orphan: se seção for o último item de uma página, segura na próxima
    if (isBlock && used + h > A4_CONTENT_H_PX * 0.9 && current.length) flush();

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
  let bodyPageNum = tocCount;
  for (const page of bodyPacked) {
    bodyPageNum++;
    for (const it of page.items) {
      if (
        it.id &&
        (it.kind === "chapter-open" || it.kind === "chapter" || it.kind === "section" || it.kind === "subsection" || it.kind === "subsubsection") &&
        pageMap[it.id] == null
      ) {
        pageMap[it.id] = bodyPageNum;
      }
    }
  }

  const tocFinal = pack(host, tocFlow(title, items, pageMap), "toc");
  return { pages: [...tocFinal, ...bodyPacked], pageMap };
}

// ──────────────────────────────────────────────────────────────────────────────
// Componentes React de renderização
// ──────────────────────────────────────────────────────────────────────────────

function FlowView({
  item,
  selectedId,
  onSelect,
}: {
  item: FlowItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // ── TOC Title ──────────────────────────────────────────────────────────────
  if (item.kind === "toc-title") {
    return (
      <h2 className="text-center font-serif text-[20px] font-bold leading-snug text-ink tracking-[0.01em] break-words [word-break:break-word]">
        {item.title}
      </h2>
    );
  }

  // ── TOC Kicker ─────────────────────────────────────────────────────────────
  if (item.kind === "toc-kicker") {
    return (
      <p className="mb-4 mt-1 text-center font-sans text-[11px] italic text-ink-muted tracking-[0.12em] uppercase">
        Sumário
      </p>
    );
  }

  // ── TOC Row ────────────────────────────────────────────────────────────────
  if (item.kind === "toc-row") {
    const depth = item.depth ?? 0;
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "flex w-full items-baseline gap-1.5 text-left transition-colors",
          depth === 0 ? "mt-2.5 pt-0" : depth === 1 ? "mt-[5px] ml-4" : "mt-[3px] ml-8",
          selectedId === item.id && "rounded-sm bg-paper-rule/30 px-0.5",
        )}
      >
        <span
          className={cn(
            "shrink-0 font-sans tabular-nums",
            depth === 0
              ? "text-[11px] font-bold text-accent"
              : depth === 1
                ? "text-[10px] font-medium text-ink-muted"
                : "text-[9.5px] font-normal text-ink-muted/70",
          )}
        >
          {item.label}
        </span>
        <span
          className={cn(
            "min-w-0 truncate font-serif",
            depth === 0
              ? "text-[12px] font-semibold text-ink"
              : depth === 1
                ? "text-[11px] font-normal text-ink"
                : "text-[10px] font-normal text-ink-muted",
          )}
        >
          {item.title || "—"}
        </span>
        <span className="relative top-[-3px] min-w-[8px] flex-1 border-b border-dotted border-paper-rule" />
        <span className="min-w-6 shrink-0 text-right font-sans text-[11px] tabular-nums text-ink">
          {item.page ?? "—"}
        </span>
      </button>
    );
  }

  // ── Chapter Open (página de abertura) ──────────────────────────────────────
  if (item.kind === "chapter-open") {
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "w-full text-center transition-colors",
          selectedId === item.id && "rounded bg-paper-rule/10",
        )}
        style={{ paddingTop: `${A4_CONTENT_H_PX * 0.28}px` }}
      >
        {/* Linha decorativa */}
        <div className="mx-auto mb-6 h-[1px] w-16 bg-accent/50" />
        {/* Rótulo do capítulo */}
        <div className="font-sans text-[9.5px] font-bold tracking-[0.28em] text-accent uppercase mb-4">
          {item.label}
        </div>
        {/* Título do capítulo */}
        {item.title ? (
          <h2 className="font-serif text-[26px] font-bold leading-tight text-ink break-words [word-break:break-word] px-8">
            {item.title}
          </h2>
        ) : null}
        {/* Ornamento */}
        <div className="mt-8 font-serif text-[16px] text-ink-muted tracking-[0.5em]">❧</div>
        {/* Linha decorativa inferior */}
        <div className="mx-auto mt-6 h-[1px] w-16 bg-accent/50" />
      </button>
    );
  }

  // ── Section (depth=1) ──────────────────────────────────────────────────────
  if (item.kind === "section") {
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "mt-5 w-full text-left transition-colors",
          selectedId === item.id && "rounded bg-paper-rule/20 px-1",
        )}
      >
        <div className="font-sans text-[8.5px] font-bold tracking-[0.2em] text-ink-muted uppercase mb-1">
          {item.label}
        </div>
        {item.title ? (
          <h3 className="font-serif text-[17px] font-bold leading-snug text-ink break-words [word-break:break-word]">
            {item.title}
          </h3>
        ) : null}
        <div className="mt-2 h-[0.5px] w-full bg-paper-rule" />
      </button>
    );
  }

  // ── Subsection (depth=2) ───────────────────────────────────────────────────
  if (item.kind === "subsection") {
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "mt-3.5 w-full text-left transition-colors",
          selectedId === item.id && "rounded bg-paper-rule/20 px-1",
        )}
      >
        <span className="font-sans text-[8px] font-semibold tracking-[0.12em] text-ink-muted uppercase mr-1.5">
          {item.label}
        </span>
        {item.title ? (
          <span className="font-serif text-[14px] font-bold italic text-ink break-words [word-break:break-word]">
            {item.title}
          </span>
        ) : null}
      </button>
    );
  }

  // ── Sub-Subsection (depth≥3) ───────────────────────────────────────────────
  if (item.kind === "subsubsection") {
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "mt-2.5 w-full text-left transition-colors",
          selectedId === item.id && "rounded bg-paper-rule/20 px-0.5",
        )}
      >
        {item.title ? (
          <span className="font-serif text-[13px] font-semibold italic text-ink/80 break-words [word-break:break-word]">
            {item.label ? `${item.label} ` : ""}{item.title}
          </span>
        ) : null}
      </button>
    );
  }

  // ── Ornament ───────────────────────────────────────────────────────────────
  if (item.kind === "ornament") {
    return (
      <div className="my-3 text-center font-serif text-sm text-ink-muted tracking-[0.4em]">❧</div>
    );
  }

  // ── Question Block ─────────────────────────────────────────────────────────
  if (item.kind === "question-block" && item.questionBlock) {
    const qb = item.questionBlock;
    return (
      <button
        type="button"
        onClick={() => item.id && onSelect(item.id)}
        className={cn(
          "mt-4 w-full rounded border border-paper-rule bg-[#f5f0e4] text-left transition-colors hover:border-accent",
          selectedId === item.id && "ring-2 ring-accent",
        )}
      >
        {/* Header */}
        <div className="border-b border-paper-rule px-3.5 py-2">
          <span className="font-sans text-[8px] font-bold tracking-[0.18em] text-accent uppercase">
            ❓ Questão
          </span>
        </div>
        <div className="px-3.5 py-3 space-y-2.5">
          {/* Enunciado */}
          <p className="font-serif text-[13px] font-semibold leading-snug text-ink">
            {qb.question}
          </p>
          {/* Resposta */}
          <div>
            <div className="font-sans text-[7.5px] font-bold tracking-[0.15em] text-[#5a7a3a] uppercase mb-1">
              💡 Resposta
            </div>
            <p className="font-sans text-[12px] font-semibold text-[#3a5a2a]">{qb.answer}</p>
          </div>
          {/* Explicação */}
          <div>
            <div className="font-sans text-[7.5px] font-bold tracking-[0.15em] text-ink-muted uppercase mb-1">
              📖 Explicação
            </div>
            <p className="font-serif text-[12px] leading-relaxed text-ink/80">{qb.explanation}</p>
          </div>
          {/* Exemplo de Comando */}
          {qb.commandExample ? (
            <div>
              <div className="font-sans text-[7.5px] font-bold tracking-[0.15em] text-[#2a4a6a] uppercase mb-1.5">
                💻 Exemplo & Variações
              </div>
              <pre className="font-mono text-[10.5px] leading-snug bg-[#1e2124] text-[#d4e0f0] px-3 py-2.5 rounded whitespace-pre-wrap overflow-x-auto">
                {qb.commandExample}
              </pre>
            </div>
          ) : null}
        </div>
      </button>
    );
  }

  // ── Parágrafo ──────────────────────────────────────────────────────────────
  return (
    <p
      className="mt-0 font-serif text-[14.5px] leading-[1.7] text-ink text-justify [text-indent:1.5em] break-words [word-break:break-word] [overflow-wrap:anywhere] [hyphens:auto]"
      dangerouslySetInnerHTML={{ __html: parseFormattedToHtml(item.text ?? "") }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Folha A4
// ──────────────────────────────────────────────────────────────────────────────

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
  const isOdd = number % 2 !== 0;
  const paddingLeft = isOdd ? A4_MARGIN_INNER_PX : A4_MARGIN_OUTER_PX;
  const paddingRight = isOdd ? A4_MARGIN_OUTER_PX : A4_MARGIN_INNER_PX;
  const isChapterPage = page.kind === "chapter-open";

  return (
    <article
      className="a4-sheet relative bg-paper text-ink shadow-[0_20px_50px_-16px_rgba(0,0,0,.5)] transition-shadow"
      style={{
        width: A4_W_PX,
        height: A4_H_PX,
        paddingTop: A4_MARGIN_TOP_PX,
        paddingBottom: A4_MARGIN_BOTTOM_PX,
        paddingLeft,
        paddingRight,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Cabeçalho (running header) — não aparece na abertura de capítulo */}
      {!isChapterPage ? (
        <div
          className="flex items-center justify-between border-b border-paper-rule/50 pb-1 mb-2"
          style={{ height: A4_HEADER_PX }}
        >
          {isOdd ? (
            <>
              <span className="font-sans text-[8px] tabular-nums text-ink-muted">{number}</span>
              <span className="font-sans text-[8px] italic text-ink-muted tracking-[0.06em]">
                {/* número ímpar: título do capítulo corrente (preenchido dinamicamente) */}
              </span>
            </>
          ) : (
            <>
              <span className="font-sans text-[8px] italic text-ink-muted tracking-[0.06em]" />
              <span className="font-sans text-[8px] tabular-nums text-ink-muted">{number}</span>
            </>
          )}
        </div>
      ) : null}

      {/* Conteúdo principal */}
      <div
        style={{
          height: isChapterPage ? A4_H_PX - A4_MARGIN_TOP_PX - A4_MARGIN_BOTTOM_PX - A4_FOLIO_PX : A4_CONTENT_H_PX,
          overflow: "hidden",
        }}
      >
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

      {/* Fólio (número de página no rodapé) — só nas páginas body e toc */}
      {!isChapterPage ? (
        <div
          className="flex items-end justify-center"
          style={{ height: A4_FOLIO_PX }}
        >
          <span className="font-sans text-[9px] tabular-nums text-ink-muted">{number}</span>
        </div>
      ) : (
        /* Na abertura de capítulo, o fólio fica no canto externo */
        <div
          className="absolute bottom-4 font-sans text-[9px] tabular-nums text-ink-muted"
          style={{ [isOdd ? "right" : "left"]: paddingRight }}
        >
          {number}
        </div>
      )}
    </article>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal A4Book
// ──────────────────────────────────────────────────────────────────────────────

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
      {/* Div oculta de medição */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0"
        style={{ width: A4_CONTENT_W_PX, fontFamily: "'Spectral', Georgia, serif" }}
      />

      {/* Páginas */}
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
