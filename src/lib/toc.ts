export type QuestionBlock = {
  question: string;
  answer: string;
  explanation: string;
  commandExample: string;
};

export type TocNode = {
  id: string;
  title: string;
  page: string;
  body: string;
  questionBlock?: QuestionBlock;
  children: TocNode[];
};

export type TocDocument = {
  title: string;
  items: TocNode[];
};

export const STORAGE_KEY = "sumario-doc-v4";

let uid = 0;

export function nextId(): string {
  uid += 1;
  return `n${uid}`;
}

export function bumpUidFromTree(nodes: TocNode[]): void {
  let max = uid;
  const walk = (list: TocNode[]) => {
    for (const n of list) {
      const m = /^n(\d+)$/.exec(n.id);
      if (m) max = Math.max(max, Number(m[1]));
      walk(n.children);
    }
  };
  walk(nodes);
  uid = max;
}

export function createNode(partial?: Partial<TocNode>): TocNode {
  const { children, id, title, page, body, questionBlock } = partial ?? {};
  return {
    id: id ?? nextId(),
    title: title ?? "",
    page: page ?? "",
    body: body ?? "",
    questionBlock,
    children: children ?? [],
  };
}

export function toRoman(num: number): string {
  if (!num || num <= 0) return "I";
  const map: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = Math.floor(num);
  let res = "";
  for (const [v, s] of map) {
    while (n >= v) {
      res += s;
      n -= v;
    }
  }
  return res || "I";
}

export function chapterLabel(index: number): string {
  return `Capítulo ${toRoman(index)}`;
}

/**
 * Gera o label numérico de uma seção/subseção.
 * path = [cap, sec, subsec, ...]
 * depth=0 → Capítulo IV
 * depth=1 → 4.1
 * depth=2 → 4.1.2
 * depth≥3 → 4.1.2.1
 */
export function sectionLabel(path: number[]): string {
  if (path.length === 1) return chapterLabel(path[0]!);
  // A partir de depth 1, usa numeração decimal
  return path.join(".");
}

/** Retorna o depth de um nó a partir de seu path */
export function pathDepth(path: number[]): number {
  return path.length - 1;
}

export type LocatedNode = {
  node: TocNode;
  path: number[];
  depth: number;
  parent: TocNode | null;
  siblings: TocNode[];
  index: number;
};

export function findLocated(nodes: TocNode[], id: string): LocatedNode | null {
  const walk = (
    list: TocNode[],
    parent: TocNode | null,
    prefix: number[],
    depth: number,
  ): LocatedNode | null => {
    for (let i = 0; i < list.length; i++) {
      const node = list[i]!;
      const path = [...prefix, i + 1];
      if (node.id === id) {
        return { node, path, depth, parent, siblings: list, index: i };
      }
      const found = walk(node.children, node, path, depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(nodes, null, [], 0);
}

export function findNode(nodes: TocNode[], id: string): TocNode | null {
  return findLocated(nodes, id)?.node ?? null;
}

export function flattenNodes(nodes: TocNode[]): LocatedNode[] {
  const out: LocatedNode[] = [];
  const walk = (
    list: TocNode[],
    parent: TocNode | null,
    prefix: number[],
    depth: number,
  ) => {
    list.forEach((node, i) => {
      const path = [...prefix, i + 1];
      out.push({ node, path, depth, parent, siblings: list, index: i });
      walk(node.children, node, path, depth + 1);
    });
  };
  walk(nodes, null, [], 0);
  return out;
}

export function cloneTree(nodes: TocNode[]): TocNode[] {
  return nodes.map((n) => ({
    ...n,
    children: cloneTree(n.children),
  }));
}

export function updateNode(
  nodes: TocNode[],
  id: string,
  patch: Partial<Pick<TocNode, "title" | "page" | "body" | "questionBlock">>,
): TocNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    return { ...n, children: updateNode(n.children, id, patch) };
  });
}

export function removeNode(nodes: TocNode[], id: string): TocNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNode(n.children, id) }));
}

export function addChild(nodes: TocNode[], parentId: string | null, child: TocNode): TocNode[] {
  if (!parentId) return [...nodes, child];
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...n.children, child] };
    return { ...n, children: addChild(n.children, parentId, child) };
  });
}

export function moveSibling(nodes: TocNode[], id: string, dir: -1 | 1): TocNode[] {
  const loc = findLocated(nodes, id);
  if (!loc) return nodes;
  const ni = loc.index + dir;
  if (ni < 0 || ni >= loc.siblings.length) return nodes;

  const reorder = (list: TocNode[]): TocNode[] => {
    const idx = list.findIndex((n) => n.id === id);
    if (idx !== -1) {
      const next = [...list];
      const [item] = next.splice(idx, 1);
      next.splice(ni, 0, item!);
      return next;
    }
    return list.map((n) => ({ ...n, children: reorder(n.children) }));
  };
  return reorder(nodes);
}

export function promoteNode(nodes: TocNode[], id: string): TocNode[] {
  const loc = findLocated(nodes, id);
  if (!loc || !loc.parent) return nodes;
  const parentId = loc.parent.id;
  const item = loc.node;

  const stripped = nodes.map(function strip(n: TocNode): TocNode {
    return {
      ...n,
      children: n.children.filter((c) => c.id !== id).map(strip),
    };
  });

  const insertAfterParent = (list: TocNode[]): TocNode[] => {
    const idx = list.findIndex((n) => n.id === parentId);
    if (idx !== -1) {
      const next = [...list];
      next.splice(idx + 1, 0, item);
      return next;
    }
    return list.map((n) => ({ ...n, children: insertAfterParent(n.children) }));
  };
  return insertAfterParent(stripped);
}

export function demoteNode(nodes: TocNode[], id: string): TocNode[] {
  const loc = findLocated(nodes, id);
  if (!loc || loc.index === 0) return nodes;
  const prev = loc.siblings[loc.index - 1]!;
  const item = loc.node;

  const apply = (list: TocNode[]): TocNode[] => {
    const idx = list.findIndex((n) => n.id === id);
    if (idx > 0) {
      const next = [...list];
      next.splice(idx, 1);
      return next.map((n) =>
        n.id === prev.id ? { ...n, children: [...n.children, item] } : n,
      );
    }
    return list.map((n) => ({ ...n, children: apply(n.children) }));
  };
  return apply(nodes);
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export const SAMPLE_DOC: TocDocument = {
  title: "Fundamentos de Arquitetura de Software",
  items: [
    {
      id: "n1",
      title: "Introdução",
      page: "",
      body: "",
      children: [
        {
          id: "n2",
          title: "O que é arquitetura",
          page: "",
          body: "Arquitetura não é um diagrama bonito. É o conjunto de restrições que tornam algumas mudanças baratas e outras caras.\n\nSe uma decisão pode ser revertida em um sprint sem coordenar três times, provavelmente ainda não é arquitetura — é desenho local.\n\nO arquiteto escolhe limites: o que pode variar livremente e o que, uma vez decidido, organiza o restante do sistema. Essas escolhas aparecem no código, nas filas, nos contratos de API e até na forma como os times se falam.\n\nUma boa definição operacional: arquitetura é o conjunto de decisões que você gostaria de ter acertado cedo, porque mudar depois custa coordenação, tempo e reputação. O restante é desenho, e desenho pode — e deve — evoluir com o aprendizado do time.\n\nQuando o texto desta seção passa do rodapé da folha A4, o caderno abre a página seguinte, na sequência, com 1 cm de margem nos quatro lados. O número dessa folha volta para o sumário, à frente de cada capítulo e subitem.",
          children: [],
        },
        {
          id: "n3",
          title: "Por que o índice importa",
          page: "",
          body: "O sumário de um livro é a primeira arquitetura que o leitor vê: capítulos, seções, ordem e ênfase.\n\nEscrever o texto ligado a cada entrada força clareza. Se um subitem não tem o que dizer, talvez não mereça existir no índice.\n\nO capítulo em si não leva parágrafo: ele só nomeia o bloco. O conteúdo vive nas seções, página após página, como neste caderno.",
          children: [],
        },
      ],
    },
    {
      id: "n4",
      title: "Camadas e limites",
      page: "",
      body: "",
      children: [
        {
          id: "n5",
          title: "Domínio no centro",
          page: "",
          body: "Regras de negócio não deveriam importar Express, React ou um ORM. Elas recebem dados, decidem e devolvem intenções.\n\nO texto desta seção vive no subitem 2.1. Selecione-o à esquerda para editar. O manuscrito à direita pagina em folhas A4: o sumário termina, vira a página, e o texto segue. Quando a folha acaba, nasce a próxima, com o número no rodapé e no índice.",
          children: [],
        },
      ],
    },
  ],
};
