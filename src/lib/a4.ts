/** A4 at 96dpi. 1mm = 96/25.4 px. */
export const MM = 96 / 25.4;
export const A4_W_PX = 210 * MM;
export const A4_H_PX = 297 * MM;
export const A4_MARGIN_PX = 10 * MM;
export const A4_FOLIO_PX = 22;
export const A4_CONTENT_W_PX = A4_W_PX - A4_MARGIN_PX * 2;
export const A4_CONTENT_H_PX = A4_H_PX - A4_MARGIN_PX * 2 - A4_FOLIO_PX;

import type { QuestionBlock } from "./toc";

export type FlowKind =
  | "toc-title"
  | "toc-kicker"
  | "toc-row"
  | "break"
  | "chapter"
  | "section"
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
};

export type LaidPage = {
  kind: "toc" | "body";
  items: FlowItem[];
};
