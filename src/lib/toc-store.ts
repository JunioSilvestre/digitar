import { create } from "zustand";
import {
  exportBackupToJson,
  importBackupFromJson,
  loadDocFromIndexedDB,
  saveDocToIndexedDB,
} from "./indexed-db";
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
  type QuestionBlock,
  type TocDocument,
  type TocNode,
  updateNode,
} from "@/lib/toc";

type PreviewMode = "sumario" | "manuscrito";
type SaveStatus = "saved" | "saving" | "error";

type TocStore = {
  title: string;
  items: TocNode[];
  selectedId: string | null;
  previewMode: PreviewMode;
  hydrated: boolean;
  saveStatus: SaveStatus;
  pageMap: Record<string, number>;
  hydrate: () => Promise<void>;
  setTitle: (title: string) => void;
  select: (id: string | null) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setPageMap: (pageMap: Record<string, number>) => void;
  patchSelected: (patch: Partial<Pick<TocNode, "title" | "page" | "body" | "questionBlock">>) => void;
  patchNode: (id: string, patch: Partial<Pick<TocNode, "title" | "page" | "body" | "questionBlock">>) => void;
  addChapter: () => void;
  addSubitem: (parentId?: string) => void;
  addQuestionBlock: (parentId?: string) => void;
  remove: (id?: string) => void;
  move: (id: string | undefined, dir: -1 | 1) => void;
  promote: (id?: string) => void;
  demote: (id?: string) => void;
  reset: () => void;
  importDoc: (doc: TocDocument) => void;
  exportBackup: () => void;
  importBackupFile: (file: File) => Promise<void>;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function triggerDebouncedPersist(set: any, get: () => TocStore) {
  set({ saveStatus: "saving" });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { title, items, selectedId } = get();
    try {
      await saveDocToIndexedDB({ title, items, selectedId });
      set({ saveStatus: "saved" });
    } catch {
      set({ saveStatus: "error" });
    }
  }, 600);
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
  saveStatus: "saved",
  pageMap: {},

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const dbDoc = await loadDocFromIndexedDB();
      if (dbDoc && Array.isArray(dbDoc.items) && dbDoc.items.length > 0) {
        bumpUidFromTree(dbDoc.items);
        const selected =
          dbDoc.selectedId && findLocated(dbDoc.items, dbDoc.selectedId)
            ? dbDoc.selectedId
            : firstId(dbDoc.items);
        set({
          title: typeof dbDoc.title === "string" ? dbDoc.title : SAMPLE_DOC.title,
          items: dbDoc.items,
          selectedId: selected,
          hydrated: true,
          saveStatus: "saved",
        });
        return;
      }
      // Fallback para localStorage
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
            saveStatus: "saved",
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
      saveStatus: "saved",
    });
    triggerDebouncedPersist(set, get);
  },

  setTitle: (title) => {
    set({ title });
    triggerDebouncedPersist(set, get);
  },

  select: (id) => {
    set({ selectedId: id });
    triggerDebouncedPersist(set, get);
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
    triggerDebouncedPersist(set, get);
  },

  patchNode: (id, patch) => {
    const items = get().items;
    const loc = findLocated(items, id);
    const cleanPatch = loc && loc.depth === 0 ? { ...patch, title: "" } : patch;
    const next = updateNode(items, id, cleanPatch);
    set({ items: next });
    triggerDebouncedPersist(set, get);
  },

  addChapter: () => {
    const chapterNode = createNode({ title: "", body: "" });
    const sectionNode = createNode({ title: "", body: "" });
    chapterNode.children.push(sectionNode);
    const items = addChild(get().items, null, chapterNode);
    set({ items, selectedId: sectionNode.id });
    triggerDebouncedPersist(set, get);
  },

  addSubitem: (parentId) => {
    const currentSelected = get().selectedId;
    const parent = parentId ?? currentSelected;
    let targetParent = parent;

    if (targetParent) {
      const loc = findLocated(get().items, targetParent);
      if (loc && loc.depth > 0 && loc.parent) {
        targetParent = loc.parent.id;
      }
    }

    if (!targetParent && get().items.length === 0) {
      get().addChapter();
      return;
    }

    const actualParent = targetParent ?? (get().items[0]?.id ?? null);
    const node = createNode({ title: "", body: "" });
    const items = addChild(get().items, actualParent, node);
    set({ items, selectedId: node.id });
    triggerDebouncedPersist(set, get);
  },

  addQuestionBlock: (parentId) => {
    const currentSelected = get().selectedId;
    const parent = parentId ?? currentSelected;
    let targetParent = parent;

    if (targetParent) {
      const loc = findLocated(get().items, targetParent);
      if (loc && loc.depth > 0 && loc.parent) {
        targetParent = loc.parent.id;
      }
    }

    if (!targetParent && get().items.length === 0) {
      get().addChapter();
    }

    const actualParent = targetParent ?? (get().items[0]?.id ?? null);
    const defaultQuestion: QuestionBlock = {
      question: "Digite o enunciado da questão ou comando aqui...",
      answer: "Digite a resposta ou comando esperado...",
      explanation: "Explique a fundamentação ou conceito técnico aqui...",
      commandExample: "$ ls -la --sort=time\n# Exemplo em outra situação / cenário",
    };
    const node = createNode({
      title: "Questão & Comando",
      body: "",
      questionBlock: defaultQuestion,
    });
    const items = addChild(get().items, actualParent, node);
    set({ items, selectedId: node.id });
    triggerDebouncedPersist(set, get);
  },

  remove: (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    const items = removeNode(get().items, targetId);
    const selectedId = get().selectedId === targetId ? firstId(items) : get().selectedId;
    set({ items, selectedId });
    triggerDebouncedPersist(set, get);
  },

  move: (id, dir) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    set({ items: moveSibling(get().items, targetId, dir) });
    triggerDebouncedPersist(set, get);
  },

  promote: (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    set({ items: promoteNode(get().items, targetId) });
    triggerDebouncedPersist(set, get);
  },

  demote: (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    set({ items: demoteNode(get().items, targetId) });
    triggerDebouncedPersist(set, get);
  },

  reset: () => {
    bumpUidFromTree(SAMPLE_DOC.items);
    set({
      title: SAMPLE_DOC.title,
      items: SAMPLE_DOC.items,
      selectedId: SAMPLE_DOC.items[0]?.id ?? null,
    });
    triggerDebouncedPersist(set, get);
  },

  importDoc: (doc) => {
    bumpUidFromTree(doc.items);
    set({
      title: doc.title,
      items: doc.items,
      selectedId: firstId(doc.items),
    });
    triggerDebouncedPersist(set, get);
  },

  exportBackup: () => {
    const { title, items } = get();
    exportBackupToJson({ title, items });
  },

  importBackupFile: async (file) => {
    try {
      const doc = await importBackupFromJson(file);
      get().importDoc(doc);
    } catch (err) {
      alert("Erro ao importar o arquivo de backup. Verifique se o arquivo JSON é válido.");
    }
  },
}));
