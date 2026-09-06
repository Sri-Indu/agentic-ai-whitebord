import type {
  DiagramData,
  DiagramEdge,
  DiagramLayout,
  DiagramNode,
  DiagramNodeType,
} from "@/lib/diagram/types";

export type Point = { x: number; y: number };

const H_GAP = 56;
const V_GAP = 64;
const FLOW_H_GAP = 120;
const FLOW_V_GAP = 120;
const MIN_PADDING = 24;

export function nodeSize(
  node: DiagramNode,
  diagramType: DiagramData["diagramType"]
): { width: number; height: number } {
  const labelWidth = Math.min(280, Math.max(160, node.label.length * 8 + 36));

  switch (node.type) {
    case "start":
    case "end":
      return { width: Math.min(200, labelWidth), height: 68 };
    case "decision":
      return { width: Math.max(188, labelWidth), height: 96 };
    case "io":
      return { width: Math.max(188, labelWidth), height: 84 };
    case "topic":
      return { width: Math.max(220, labelWidth), height: 92 };
    case "database":
      return { width: Math.max(188, labelWidth), height: 84 };
    case "client":
      return { width: Math.min(200, Math.max(168, labelWidth)), height: 76 };
    case "branch":
      return {
        width: diagramType === "mindmap" ? Math.min(200, labelWidth) : labelWidth,
        height: 66,
      };
    default:
      return { width: labelWidth, height: 72 };
  }
}

function outgoing(data: DiagramData): Map<string, DiagramEdge[]> {
  const map = new Map<string, DiagramEdge[]>();
  for (const node of data.nodes) map.set(node.id, []);
  for (const edge of data.edges) {
    const list = map.get(edge.from) ?? [];
    list.push(edge);
    map.set(edge.from, list);
  }
  return map;
}

function incoming(data: DiagramData): Map<string, DiagramEdge[]> {
  const map = new Map<string, DiagramEdge[]>();
  for (const node of data.nodes) map.set(node.id, []);
  for (const edge of data.edges) {
    const list = map.get(edge.to) ?? [];
    list.push(edge);
    map.set(edge.to, list);
  }
  return map;
}

function branchOrder(label?: string): number {
  const value = (label ?? "").trim().toLowerCase();
  if (/^(no|n|false|invalid|error|fail|denied|reject)/.test(value)) return -1;
  if (/^(yes|y|true|valid|ok|success|allow|pass)/.test(value)) return 1;
  return 0;
}

function sortedChildren(parentId: string, out: Map<string, DiagramEdge[]>): string[] {
  const edges = [...(out.get(parentId) ?? [])];
  edges.sort((a, b) => {
    const order = branchOrder(a.label) - branchOrder(b.label);
    if (order !== 0) return order;
    return a.to.localeCompare(b.to);
  });
  const ids: string[] = [];
  for (const edge of edges) {
    if (!ids.includes(edge.to) && edge.to !== parentId) ids.push(edge.to);
  }
  return ids;
}

function validGraph(data: DiagramData) {
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  const edges = data.edges.filter(
    (edge) =>
      nodeIds.has(edge.from) &&
      nodeIds.has(edge.to) &&
      edge.from !== edge.to
  );
  const outs = new Map<string, DiagramEdge[]>();
  const ins = new Map<string, DiagramEdge[]>();
  for (const node of data.nodes) {
    outs.set(node.id, []);
    ins.set(node.id, []);
  }
  for (const edge of edges) {
    outs.get(edge.from)?.push(edge);
    ins.get(edge.to)?.push(edge);
  }
  return { edges, outs, ins };
}

function undirectedComponents(ids: string[], edges: DiagramEdge[]): string[][] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const id of ids) parent.set(id, id);
  for (const edge of edges) {
    if (parent.has(edge.from) && parent.has(edge.to)) union(edge.from, edge.to);
  }

  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    const list = groups.get(root) ?? [];
    list.push(id);
    groups.set(root, list);
  }

  return [...groups.values()].sort((a, b) => b.length - a.length);
}

function pickFlowSources(
  ids: string[],
  ins: Map<string, DiagramEdge[]>,
  types: Map<string, DiagramNodeType>
): string[] {
  const idSet = new Set(ids);
  const inDegree = (id: string) =>
    (ins.get(id) ?? []).filter((edge) => idSet.has(edge.from) && edge.from !== id)
      .length;

  const starts = ids.filter((id) => types.get(id) === "start");
  if (starts.length) return starts;

  const zeros = ids.filter((id) => inDegree(id) === 0);
  if (zeros.length) return zeros;

  let min = Infinity;
  for (const id of ids) min = Math.min(min, inDegree(id));
  return ids.filter((id) => inDegree(id) === min);
}

function assignFlowRanks(
  ids: string[],
  outs: Map<string, DiagramEdge[]>,
  ins: Map<string, DiagramEdge[]>,
  types: Map<string, DiagramNodeType>
): Map<string, number> {
  const idSet = new Set(ids);
  const sources = pickFlowSources(ids, ins, types);
  const pinned = new Set(sources);
  const ranks = new Map<string, number>();

  for (const source of sources) ranks.set(source, 0);

  for (let pass = 0; pass < ids.length; pass += 1) {
    let changed = false;
    for (const from of ids) {
      const fromRank = ranks.get(from);
      if (fromRank === undefined) continue;
      for (const edge of outs.get(from) ?? []) {
        if (!idSet.has(edge.to) || edge.to === from || pinned.has(edge.to)) continue;
        const next = fromRank + 1;
        if (next >= ids.length) continue;
        const current = ranks.get(edge.to);
        if (current === undefined || current < next) {
          ranks.set(edge.to, next);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const unreached = ids.filter((id) => ranks.get(id) === undefined);
  if (unreached.length && unreached.length < ids.length) {
    const local = assignFlowRanks(unreached, outs, ins, types);
    const offset = Math.max(0, ...[...ranks.values()]) + (ranks.size ? 1 : 0);
    for (const [id, rank] of local) {
      if (!ranks.has(id)) ranks.set(id, rank + offset);
    }
  }

  const maxRank = Math.max(0, ...[...ranks.values()]);
  const hasEdges = ids.some((id) =>
    (outs.get(id) ?? []).some((edge) => idSet.has(edge.to) && edge.to !== id)
  );

  if (hasEdges && maxRank === 0) {
    const visited = new Set<string>(sources);
    const queue = [...sources];
    while (queue.length) {
      const from = queue.shift();
      if (!from) continue;
      for (const edge of outs.get(from) ?? []) {
        if (!idSet.has(edge.to) || visited.has(edge.to) || edge.to === from) continue;
        visited.add(edge.to);
        ranks.set(edge.to, (ranks.get(from) ?? 0) + 1);
        queue.push(edge.to);
      }
    }
  }

  for (const id of ids) {
    if (!ranks.has(id)) ranks.set(id, maxRank);
  }

  return ranks;
}

function primaryParent(
  id: string,
  ids: Set<string>,
  ins: Map<string, DiagramEdge[]>,
  ranks: Map<string, number>
): string | null {
  const parents = (ins.get(id) ?? [])
    .map((edge) => edge.from)
    .filter((parentId) => ids.has(parentId) && parentId !== id)
    .sort((a, b) => (ranks.get(a) ?? 0) - (ranks.get(b) ?? 0) || a.localeCompare(b));

  return parents[0] ?? null;
}

function compactRank(
  ids: string[],
  centers: Map<string, number>,
  sizes: Map<string, { width: number; height: number }>,
  gap: number
) {
  if (ids.length <= 1) return;

  const boxes = [...ids]
    .sort((a, b) => (centers.get(a) ?? 0) - (centers.get(b) ?? 0))
    .map((id) => {
      const width = sizes.get(id)?.width ?? 180;
      return { id, width, cx: centers.get(id) ?? 0 };
    });

  for (let i = 1; i < boxes.length; i += 1) {
    const prev = boxes[i - 1];
    const minCx = prev.cx + prev.width / 2 + gap + boxes[i].width / 2;
    if (boxes[i].cx < minCx) boxes[i].cx = minCx;
  }

  const minLeft = boxes[0].cx - boxes[0].width / 2;
  const maxRight =
    boxes[boxes.length - 1].cx + boxes[boxes.length - 1].width / 2;
  const currentCenter = (minLeft + maxRight) / 2;
  const desiredCenter =
    boxes.reduce((sum, box) => sum + box.cx, 0) / boxes.length;
  const shift = desiredCenter - currentCenter;

  for (const box of boxes) {
    centers.set(box.id, box.cx + shift);
  }
}

function layoutFlowComponent(
  ids: string[],
  outs: Map<string, DiagramEdge[]>,
  ins: Map<string, DiagramEdge[]>,
  sizes: Map<string, { width: number; height: number }>,
  types: Map<string, DiagramNodeType>,
  originY: number
): Map<string, Point> {
  const idSet = new Set(ids);
  const ranks = assignFlowRanks(ids, outs, ins, types);
  const treeKids = new Map<string, string[]>();
  const parentOf = new Map<string, string | null>();

  for (const id of ids) {
    const parent = primaryParent(id, idSet, ins, ranks);
    parentOf.set(id, parent);
    if (!parent) continue;
    const list = treeKids.get(parent) ?? [];
    if (!list.includes(id)) list.push(id);
    treeKids.set(parent, list);
  }

  for (const [parentId, children] of treeKids) {
    treeKids.set(
      parentId,
      sortedChildren(parentId, outs).filter((id) => children.includes(id))
    );
  }

  const subtreeWidth = new Map<string, number>();
  const measure = (id: string): number => {
    const cached = subtreeWidth.get(id);
    if (cached !== undefined) return cached;
    const kids = treeKids.get(id) ?? [];
    const width = sizes.get(id)?.width ?? 180;
    if (!kids.length) {
      subtreeWidth.set(id, width);
      return width;
    }
    const childSpan =
      kids.reduce((sum, childId) => sum + measure(childId), 0) +
      FLOW_H_GAP * (kids.length - 1);
    const next = Math.max(width, childSpan);
    subtreeWidth.set(id, next);
    return next;
  };

  const roots = ids.filter((id) => !parentOf.get(id));
  roots.forEach(measure);

  const centers = new Map<string, number>();
  const place = (id: string, left: number) => {
    const width = subtreeWidth.get(id) ?? sizes.get(id)?.width ?? 180;
    const kids = treeKids.get(id) ?? [];
    if (!kids.length) {
      centers.set(id, left + width / 2);
      return;
    }
    const childSpan =
      kids.reduce((sum, childId) => sum + (subtreeWidth.get(childId) ?? 0), 0) +
      FLOW_H_GAP * (kids.length - 1);
    let childLeft = left + Math.max(0, (width - childSpan) / 2);
    for (const childId of kids) {
      place(childId, childLeft);
      childLeft += (subtreeWidth.get(childId) ?? 0) + FLOW_H_GAP;
    }
    centers.set(id, left + width / 2);
  };

  let rootLeft = 0;
  for (const root of roots) {
    place(root, rootLeft);
    rootLeft += (subtreeWidth.get(root) ?? 0) + FLOW_H_GAP;
  }

  for (const id of ids) {
    const parents = (ins.get(id) ?? [])
      .map((edge) => edge.from)
      .filter((parentId) => idSet.has(parentId) && centers.has(parentId));
    if (parents.length > 1) {
      const avg =
        parents.reduce((sum, parentId) => sum + (centers.get(parentId) ?? 0), 0) /
        parents.length;
      centers.set(id, avg);
    } else if (parents.length === 1 && (treeKids.get(parents[0]) ?? []).length === 1) {
      centers.set(id, centers.get(parents[0]) ?? centers.get(id) ?? 0);
    }
  }

  const rankGroups = new Map<number, string[]>();
  for (const id of ids) {
    const rank = ranks.get(id) ?? 0;
    const list = rankGroups.get(rank) ?? [];
    list.push(id);
    rankGroups.set(rank, list);
  }

  const orderedRanks = [...rankGroups.keys()].sort((a, b) => a - b);
  for (const rank of orderedRanks) {
    compactRank(rankGroups.get(rank) ?? [], centers, sizes, FLOW_H_GAP);
  }

  const rankHeight = new Map<number, number>();
  for (const rank of orderedRanks) {
    const height = Math.max(
      ...(rankGroups.get(rank) ?? []).map((id) => sizes.get(id)?.height ?? 72),
      64
    );
    rankHeight.set(rank, height);
  }

  let y = originY;
  const rankTop = new Map<number, number>();
  for (const rank of orderedRanks) {
    rankTop.set(rank, y);
    y += (rankHeight.get(rank) ?? 72) + FLOW_V_GAP;
  }

  const positions = new Map<string, Point>();
  for (const id of ids) {
    const size = sizes.get(id) ?? { width: 180, height: 72 };
    const rank = ranks.get(id) ?? 0;
    const top = rankTop.get(rank) ?? originY;
    const height = rankHeight.get(rank) ?? size.height;
    const cx = centers.get(id) ?? 0;
    positions.set(id, {
      x: cx - size.width / 2,
      y: top,
    });
  }

  return positions;
}

function layoutFlowchart(data: DiagramData, layout: DiagramLayout): Map<string, Point> {
  const isLr = layout === "left-to-right";
  const sizes = new Map(
    data.nodes.map((node) => [node.id, nodeSize(node, data.diagramType)])
  );
  const { edges, outs, ins } = validGraph(data);
  const types = new Map(data.nodes.map((node) => [node.id, node.type]));
  const components = undirectedComponents(
    data.nodes.map((node) => node.id),
    edges
  );

  const positions = new Map<string, Point>();
  let originY = 0;

  for (const component of components) {
    const placed = layoutFlowComponent(component, outs, ins, sizes, types, originY);
    let maxBottom = originY;
    for (const [id, point] of placed) {
      positions.set(id, point);
      const size = sizes.get(id) ?? { width: 180, height: 72 };
      maxBottom = Math.max(maxBottom, point.y + size.height);
    }
    originY = maxBottom + FLOW_V_GAP;
  }

  if (isLr) {
    for (const node of data.nodes) {
      const point = positions.get(node.id);
      if (!point) continue;
      positions.set(node.id, { x: point.y, y: point.x });
    }
  }

  return shiftToOrigin(positions, data);
}

function layoutMindMap(data: DiagramData): Map<string, Point> {
  const sizes = new Map(
    data.nodes.map((node) => [node.id, nodeSize(node, data.diagramType)])
  );
  const outs = outgoing(data);
  const ins = incoming(data);
  const positions = new Map<string, Point>();

  const center =
    data.nodes.find((node) => node.type === "topic") ??
    data.nodes.find((node) => (ins.get(node.id)?.length ?? 0) === 0) ??
    data.nodes[0];

  const centerSize = sizes.get(center.id) ?? { width: 220, height: 92 };
  positions.set(center.id, {
    x: -centerSize.width / 2,
    y: -centerSize.height / 2,
  });

  const firstLevel = sortedChildren(center.id, outs).filter((id) => id !== center.id);
  const placed = new Set<string>([center.id, ...firstLevel]);
  const leftovers = data.nodes
    .map((node) => node.id)
    .filter((id) => !placed.has(id));
  const branches = firstLevel.length ? firstLevel : leftovers.slice(0, 8);

  const count = Math.max(branches.length, 1);
  const maxBranchWidth = Math.max(
    ...branches.map((id) => sizes.get(id)?.width ?? 180),
    180
  );
  const radius = Math.max(260, (count * (maxBranchWidth + 36)) / (2 * Math.PI) + 70);

  branches.forEach((id, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const size = sizes.get(id) ?? { width: 180, height: 66 };
    positions.set(id, {
      x: Math.cos(angle) * radius - size.width / 2,
      y: Math.sin(angle) * radius - size.height / 2,
    });

    const grandchildren = sortedChildren(id, outs).filter(
      (childId) => childId !== center.id && !positions.has(childId)
    );
    const leafCount = grandchildren.length;
    const childRadius = radius + 168 + Math.max(0, leafCount - 1) * 8;
    const spread = Math.min(0.7, 0.2 * Math.max(leafCount, 1));

    grandchildren.forEach((childId, childIndex) => {
      const childSize = sizes.get(childId) ?? { width: 170, height: 66 };
      const offset = leafCount === 1 ? 0 : (childIndex - (leafCount - 1) / 2) * spread;
      const childAngle = angle + offset;
      positions.set(childId, {
        x: Math.cos(childAngle) * childRadius - childSize.width / 2,
        y: Math.sin(childAngle) * childRadius - childSize.height / 2,
      });
    });
  });

  data.nodes.forEach((node, index) => {
    if (positions.has(node.id)) return;
    const size = sizes.get(node.id) ?? { width: 170, height: 66 };
    const angle = (Math.PI * 2 * index) / data.nodes.length;
    positions.set(node.id, {
      x: Math.cos(angle) * (radius + 240) - size.width / 2,
      y: Math.sin(angle) * (radius + 240) - size.height / 2,
    });
  });

  return normalizePositions(positions, data, sizes);
}

const ARCH_LAYERS: DiagramNodeType[][] = [
  ["client", "frontend"],
  ["api", "auth"],
  ["backend", "service", "cache", "queue"],
  ["database", "external"],
];

function architectureLayer(type: DiagramNodeType): number {
  const index = ARCH_LAYERS.findIndex((layer) => layer.includes(type));
  return index === -1 ? 2 : index;
}

export function architectureLayerGroups(data: DiagramData) {
  const buckets = new Map<number, string[]>();
  for (const node of data.nodes) {
    const layer = architectureLayer(node.type);
    const list = buckets.get(layer) ?? [];
    list.push(node.id);
    buckets.set(layer, list);
  }

  const labels = ["Client", "API", "Services", "Data & external"];
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([, ids]) => ids.length >= 2)
    .map(([layer, children]) => ({
      id: `layer-${layer}`,
      label: labels[layer] ?? "Group",
      children,
    }));
}

function layoutArchitecture(data: DiagramData): Map<string, Point> {
  const sizes = new Map(
    data.nodes.map((node) => [node.id, nodeSize(node, data.diagramType)])
  );
  const layers = new Map<number, DiagramNode[]>();

  for (const node of data.nodes) {
    const layer = architectureLayer(node.type);
    const list = layers.get(layer) ?? [];
    list.push(node);
    layers.set(layer, list);
  }

  const occupied = [...layers.keys()].sort((a, b) => a - b);
  const positions = new Map<string, Point>();
  let y = 0;

  for (const layer of occupied) {
    const row = layers.get(layer) ?? [];
    const rowHeight = Math.max(...row.map((node) => sizes.get(node.id)?.height ?? 72));
    const totalWidth =
      row.reduce((sum, node) => sum + (sizes.get(node.id)?.width ?? 200), 0) +
      H_GAP * (row.length - 1);
    let x = -totalWidth / 2;

    for (const node of row) {
      const size = sizes.get(node.id) ?? { width: 200, height: 72 };
      positions.set(node.id, {
        x,
        y: y + (rowHeight - size.height) / 2,
      });
      x += size.width + H_GAP;
    }

    y += rowHeight + V_GAP;
  }

  return normalizePositions(positions, data, sizes);
}

function shiftToOrigin(
  positions: Map<string, Point>,
  data: DiagramData
): Map<string, Point> {
  if (!positions.size) return positions;

  let minX = Infinity;
  let minY = Infinity;
  for (const node of data.nodes) {
    const point = positions.get(node.id);
    if (!point) continue;
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
  }

  const next = new Map<string, Point>();
  for (const node of data.nodes) {
    const point = positions.get(node.id) ?? { x: 0, y: 0 };
    next.set(node.id, {
      x: Math.round(point.x - minX + MIN_PADDING),
      y: Math.round(point.y - minY + MIN_PADDING),
    });
  }
  return next;
}

function normalizePositions(
  positions: Map<string, Point>,
  data: DiagramData,
  sizes: Map<string, { width: number; height: number }>
): Map<string, Point> {
  return resolveOverlaps(shiftToOrigin(positions, data), data, sizes);
}

function resolveOverlaps(
  positions: Map<string, Point>,
  data: DiagramData,
  sizes: Map<string, { width: number; height: number }>
): Map<string, Point> {
  const ids = data.nodes.map((node) => node.id);

  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = ids[i];
        const b = ids[j];
        const pa = positions.get(a);
        const pb = positions.get(b);
        const sa = sizes.get(a);
        const sb = sizes.get(b);
        if (!pa || !pb || !sa || !sb) continue;

        const ax2 = pa.x + sa.width + 16;
        const ay2 = pa.y + sa.height + 16;
        const bx2 = pb.x + sb.width + 16;
        const by2 = pb.y + sb.height + 16;
        const overlapX = Math.min(ax2, bx2) - Math.max(pa.x, pb.x);
        const overlapY = Math.min(ay2, by2) - Math.max(pa.y, pb.y);
        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const shift = overlapX / 2 + 4;
          if (pa.x <= pb.x) {
            pa.x -= shift;
            pb.x += shift;
          } else {
            pa.x += shift;
            pb.x -= shift;
          }
        } else {
          const shift = overlapY / 2 + 4;
          if (pa.y <= pb.y) {
            pa.y -= shift;
            pb.y += shift;
          } else {
            pa.y += shift;
            pb.y -= shift;
          }
        }
      }
    }
  }

  return shiftToOrigin(positions, data);
}

function inferGeneralLayout(data: DiagramData): "radial" | "architecture" | "top-to-bottom" {
  const archTypes: DiagramNodeType[] = [
    "client",
    "frontend",
    "api",
    "auth",
    "backend",
    "service",
    "database",
    "cache",
    "queue",
    "external",
  ];
  const archCount = data.nodes.filter((node) => archTypes.includes(node.type)).length;
  if (archCount >= Math.max(3, data.nodes.length * 0.45)) return "architecture";

  const outs = outgoing(data);
  const ins = incoming(data);
  const hub = data.nodes.find((node) => (outs.get(node.id)?.length ?? 0) >= 3);
  if (hub && (ins.get(hub.id)?.length ?? 0) === 0) return "radial";

  return "top-to-bottom";
}

export function layoutDiagram(data: DiagramData): Map<string, Point> {
  if (data.diagramType === "mindmap" || data.layout === "radial") {
    return layoutMindMap(data);
  }

  if (data.diagramType === "architecture") {
    return layoutArchitecture(data);
  }

  if (data.diagramType === "diagram") {
    const inferred = inferGeneralLayout(data);
    if (inferred === "radial") return layoutMindMap(data);
    if (inferred === "architecture") return layoutArchitecture(data);
    return layoutFlowchart(data, data.layout === "left-to-right" ? "left-to-right" : "top-to-bottom");
  }

  return layoutFlowchart(
    data,
    data.layout === "left-to-right" ? "left-to-right" : "top-to-bottom"
  );
}
