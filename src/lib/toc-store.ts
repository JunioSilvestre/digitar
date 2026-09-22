import { create } from "zustand";
import {
  SAMPLE_DOC,
  STORAGE_KEY,
  addChild,
  bumpUidFromTree,
  createNode,
  demoteNode,
  findLocated,
  moveSibling,
  promoteNode,
  removeNode,
  type TocDocument,
  type TocNode,
  updateNode,
} from "@/lib/toc";

type PreviewMode = "sumario" | "manuscrito";

type TocStore = {
  title: string;
  items: TocNode[];
  selectedId: string | null;
  previewMode: PreviewMode;
  hydrated: boolean;
  pageMap: Record<string, number>;
  hydrate: () => void;
  setTitle: (title: string) => void;
  select: (id: string | null) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setPageMap: (pageMap: Record<string, number>) => void;
  patchSelected: (patch: Partial<Pick<TocNode, "title" | "page" | "body">>) => void;
  patchNode: (id: string, patch: Partial<Pick<TocNode, "title" | "page" | "body">>) => void;
  addChapter: () => void;
  addSubitem: (parentId?: string) => void;
  remove: (id?: string) => void;
  move: (id: string | undefined, dir: -1 | 1) => void;
  promote: (id?: string) => void;
  demote: (id?: string) => void;
  reset: () => void;
  importDoc: (doc: TocDocument) => void;
};

function persist(state: { title: string; items: TocNode[]; selectedId: string | null }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        title: state.title,
        items: state.items,
        selectedId: state.selectedId,
      }),
    );
  } catch {
    /* ignore quota */
  }
}

function firstId(items: TocNode[]): string | null {
  if (!items.length) return null;
  return items[0]?.id ?? null;
}

export const useTocStore = create<TocStore>((set, get) => ({
  title: SAMPLE_DOC.title,
  items: SAMPLE_DOC.items,
  selectedId: SAMPLE_DOC.items[0]?.id ?? null,
  previewMode: "manuscrito",
  hydrated: false,
  pageMap: {},

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TocDocument> & { selectedId?: string | null };
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          bumpUidFromTree(parsed.items);
          const selected =
            parsed.selectedId && findLocated(parsed.items, parsed.selectedId)
              ? parsed.selectedId
              : firstId(parsed.items);
          set({
            title: typeof parsed.title === "string" ? parsed.title : SAMPLE_DOC.title,
            items: parsed.items,
            selectedId: selected,
            hydrated: true,
          });
          return;
        }
      }
    } catch {
      /* keep sample */
    }
    bumpUidFromTree(SAMPLE_DOC.items);
    set({
      title: SAMPLE_DOC.title,
      items: SAMPLE_DOC.items,
      selectedId: SAMPLE_DOC.items[0]?.id ?? null,
      hydrated: true,
    });
    persist(get());
  },

  setTitle: (title) => {
    set({ title });
    persist(get());
  },

  select: (id) => {
    set({ selectedId: id });
    persist(get());
  },

  setPreviewMode: (previewMode) => set({ previewMode }),

  setPageMap: (pageMap) => set({ pageMap }),

  patchSelected: (patch) => {
    const { selectedId, items } = get();
    if (!selectedId) return;
    const loc = findLocated(items, selectedId);
    const cleanPatch = loc && loc.depth === 0 ? { ...patch, title: "" } : patch;
    const next = updateNode(items, selectedId, cleanPatch);
    set({ items: next });
    persist(get());
  },

  patchNode: (id, patch) => {
    const items = get().items;
    const loc = findLocated(items, id);
    const cleanPatch = loc && loc.depth === 0 ? { ...patch, title: "" } : patch;
    const next = updateNode(items, id, cleanPatch);
    set({ items: next });
    persist(get());
  },

  addChapter: () => {
    const chapterNode = createNode({ title: "", body: "" });
    const sectionNode = createNode({ title: "", body: "" });
    chapterNode.children.push(sectionNode);
    const items = addChild(get().items, null, chapterNode);
    set({ items, selectedId: sectionNode.id });
    persist(get());
  },

  addSubitem: (parentId) => {
    const currentSelected = get().selectedId;
    const parent = parentId ?? currentSelected;
    let targetParent = parent;

    // Se o selecionado for uma seção (depth > 0), adiciona ao mesmo capítulo pai!
    if (targetParent) {
      const loc = findLocated(get().items, targetParent);
      if (loc && loc.depth > 0 && loc.parent) {
        targetParent = loc.parent.id;
      }
    }

    // Se não houver nenhum capítulo existente, cria um capítulo primeiro
    if (!targetParent && get().items.length === 0) {
      get().addChapter();
      return;
    }

    const actualParent = targetParent ?? (get().items[0]?.id ?? null);
    const node = createNode({ title: "", body: "" });
    const items = addChild(get().items, actualParent, node);
    set({ items, selectedId: node.id });
    persist(get());
  },

  remove: (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    const items = removeNode(get().items, targetId);
    const selectedId = get().selectedId === targetId ? firstId(items) : get().selectedId;
    set({ items, selectedId });
    persist(get());
  },

  move: (id, dir) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    set({ items: moveSibling(get().items, targetId, dir) });
    persist(get());
  },

  promote: (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    set({ items: promoteNode(get().items, targetId) });
    persist(get());
  },

  demote: (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    set({ items: demoteNode(get().items, targetId) });
    persist(get());
  },

  reset: () => {
    bumpUidFromTree(SAMPLE_DOC.items);
    set({
      title: SAMPLE_DOC.title,
      items: SAMPLE_DOC.items,
      selectedId: SAMPLE_DOC.items[0]?.id ?? null,
    });
    persist(get());
  },

  importDoc: (doc) => {
    bumpUidFromTree(doc.items);
    set({
      title: doc.title,
      items: doc.items,
      selectedId: firstId(doc.items),
    });
    persist(get());
  },
}));
