/** A4 at 96dpi. 1mm = 96/25.4 px. */
export const MM = 96 / 25.4;
export const A4_W_PX = 210 * MM;
export const A4_H_PX = 297 * MM;

/** Margens profissionais de livro: 25mm externas, 30mm interna (lombada) */
export const A4_MARGIN_TOP_PX = 25 * MM;
export const A4_MARGIN_BOTTOM_PX = 20 * MM;
export const A4_MARGIN_OUTER_PX = 22 * MM;
export const A4_MARGIN_INNER_PX = 28 * MM;
/** Legado: usado para compatibilidade onde margens iguais são necessárias */
export const A4_MARGIN_PX = 22 * MM;

export const A4_FOLIO_PX = 24;
export const A4_HEADER_PX = 20;
export const A4_CONTENT_W_PX = A4_W_PX - A4_MARGIN_OUTER_PX - A4_MARGIN_INNER_PX;
export const A4_CONTENT_H_PX =
  A4_H_PX - A4_MARGIN_TOP_PX - A4_MARGIN_BOTTOM_PX - A4_FOLIO_PX - A4_HEADER_PX;

import type { QuestionBlock } from "./toc";

export type FlowKind =
  | "toc-title"
  | "toc-kicker"
  | "toc-row"
  | "break"
  | "chapter-open" // Página dedicada de abertura de capítulo
  | "chapter" // Cabeçalho de capítulo dentro de página body
  | "section" // Seção (depth=1)
  | "subsection" // Subseção (depth=2)
  | "subsubsection" // Sub-subseção (depth≥3)
  | "ornament" // Ornamento decorativo entre seções
  | "para"
  | "question-block";

export type FlowItem = {
  kind: FlowKind;
  id?: string;
  label?: string;
  title?: string;
  depth?: number;
  text?: string;
  page?: number;
  questionBlock?: QuestionBlock;
  isOdd?: boolean; // página ímpar (recto) para margens espelhadas
};

export type LaidPage = {
  kind: "toc" | "body" | "chapter-open";
  items: FlowItem[];
  pageNum?: number;
};
