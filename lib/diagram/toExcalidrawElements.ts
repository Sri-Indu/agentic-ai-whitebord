import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { DiagramData, DiagramNodeType } from "@/lib/diagram/types";
import {
  architectureLayerGroups,
  layoutDiagram,
  nodeSize,
} from "@/lib/diagram/layout";

const EXISTING_GAP = 160;
const BIND_GAP = 8;

type NodeStyle = {
  shape: "rectangle" | "diamond" | "ellipse";
  backgroundColor: string;
  strokeColor: string;
};

type Box = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function styleForNode(
  type: DiagramNodeType,
  diagramType: DiagramData["diagramType"]
): NodeStyle {
  switch (type) {
    case "start":
    case "end":
      return { shape: "ellipse", backgroundColor: "#dcfce7", strokeColor: "#15803d" };
    case "decision":
      return { shape: "diamond", backgroundColor: "#fef3c7", strokeColor: "#b45309" };
    case "io":
      return { shape: "diamond", backgroundColor: "#e0f2fe", strokeColor: "#0369a1" };
    case "topic":
      return { shape: "ellipse", backgroundColor: "#ddd6fe", strokeColor: "#6d28d9" };
    case "database":
      return { shape: "ellipse", backgroundColor: "#fce7f3", strokeColor: "#be185d" };
    case "client":
      return { shape: "ellipse", backgroundColor: "#e0f2fe", strokeColor: "#0369a1" };
    case "cache":
    case "queue":
      return { shape: "rectangle", backgroundColor: "#ffedd5", strokeColor: "#c2410c" };
    case "auth":
    case "api":
      return { shape: "rectangle", backgroundColor: "#dbeafe", strokeColor: "#1d4ed8" };
    case "frontend":
      return { shape: "rectangle", backgroundColor: "#ccfbf1", strokeColor: "#0f766e" };
    case "backend":
    case "service":
      return { shape: "rectangle", backgroundColor: "#e0e7ff", strokeColor: "#4338ca" };
    case "external":
      return { shape: "rectangle", backgroundColor: "#f1f5f9", strokeColor: "#475569" };
    case "branch":
      return {
        shape: diagramType === "mindmap" ? "ellipse" : "rectangle",
        backgroundColor: "#f3e8ff",
        strokeColor: "#7e22ce",
      };
    default:
      return { shape: "rectangle", backgroundColor: "#eef2ff", strokeColor: "#4338ca" };
  }
}

function uniquePrefix() {
  return `ai-${crypto.randomUUID().slice(0, 8)}-`;
}

function toNodeSkeletons(
  data: DiagramData,
  prefix: string
): ExcalidrawElementSkeleton[] {
  const positions = layoutDiagram(data);
  const skeletons: ExcalidrawElementSkeleton[] = [];

  for (const node of data.nodes) {
    const style = styleForNode(node.type, data.diagramType);
    const size = nodeSize(node, data.diagramType);
    const point = positions.get(node.id) ?? { x: 0, y: 0 };
    const id = `${prefix}${node.id}`;

    skeletons.push({
      id,
      type: style.shape,
      x: point.x,
      y: point.y,
      width: size.width,
      height: size.height,
      backgroundColor: style.backgroundColor,
      strokeColor: style.strokeColor,
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0,
      roundness: style.shape === "rectangle" ? { type: 3 } : null,
      label: {
        text: node.label,
        fontSize: node.type === "topic" ? 20 : 16,
        textAlign: "center",
        verticalAlign: "middle",
        strokeColor: "#0f172a",
      },
    });
  }

  const groups =
    data.groups?.length
      ? data.groups
      : data.diagramType === "architecture"
        ? architectureLayerGroups(data)
        : [];

  for (const group of groups) {
    skeletons.push({
      type: "frame",
      name: group.label,
      children: group.children.map((id) => `${prefix}${id}`),
    });
  }

  return skeletons;
}

function arrowGeometry(from: Box, to: Box): {
  x: number;
  y: number;
  points: [[number, number], [number, number]];
} {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let sx: number;
  let sy: number;
  let ex: number;
  let ey: number;

  const sideBranch =
    toCy > from.y + 8 && Math.abs(dx) > Math.max(48, from.width * 0.35);

  if (sideBranch) {
    sx = dx < 0 ? from.x : from.x + from.width;
    sy = fromCy;
    ex = toCx;
    ey = to.y;
  } else if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy >= 0) {
      sx = fromCx;
      sy = from.y + from.height;
      ex = toCx;
      ey = to.y;
    } else {
      sx = fromCx;
      sy = from.y;
      ex = toCx;
      ey = to.y + to.height;
    }
  } else if (dx >= 0) {
    sx = from.x + from.width;
    sy = fromCy;
    ex = to.x;
    ey = toCy;
  } else {
    sx = from.x;
    sy = fromCy;
    ex = to.x + to.width;
    ey = toCy;
  }

  let px = ex - sx;
  let py = ey - sy;
  if (Math.abs(px) < 1 && Math.abs(py) < 1) {
    py = 16;
  }

  return {
    x: sx,
    y: sy,
    points: [
      [0, 0],
      [px, py],
    ],
  };
}

function toArrowSkeletons(
  data: DiagramData,
  prefix: string,
  shapes: Map<string, Box>
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  data.edges.forEach((edge, index) => {
    const from = shapes.get(edge.from);
    const to = shapes.get(edge.to);
    if (!from || !to) return;

    const geometry = arrowGeometry(from, to);

    skeletons.push({
      id: `${prefix}arrow-${index}`,
      type: "arrow",
      x: geometry.x,
      y: geometry.y,
      width: Math.abs(geometry.points[1][0]),
      height: Math.abs(geometry.points[1][1]),
      points: geometry.points,
      strokeColor: "#334155",
      strokeWidth: 2,
      roughness: 0,
      opacity: 100,
      startArrowhead: null,
      endArrowhead: "arrow",
      roundness: { type: 2 },
      label: edge.label
        ? {
            text: edge.label,
            fontSize: 14,
            strokeColor: "#334155",
          }
        : undefined,
    });
  });

  return skeletons;
}

function normalizeLinearElements(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  return elements.map((element) => {
    if (element.type !== "arrow" && element.type !== "line") {
      return element;
    }

    const points = element.points;
    if (!points.length) return element;

    const [originX, originY] = points[0];
    if (originX === 0 && originY === 0) {
      return element;
    }

    const nextPoints = points.map(
      ([x, y]) => [x - originX, y - originY] as [number, number]
    );
    const xs = nextPoints.map((point) => point[0]);
    const ys = nextPoints.map((point) => point[1]);

    return {
      ...element,
      x: element.x + originX,
      y: element.y + originY,
      points: nextPoints,
      width: Math.max(0, Math.max(...xs) - Math.min(...xs)),
      height: Math.max(0, Math.max(...ys) - Math.min(...ys)),
    };
  });
}

function bindConvertedArrows(
  nodes: ExcalidrawElement[],
  arrows: ExcalidrawElement[],
  data: DiagramData,
  prefix: string
): ExcalidrawElement[] {
  const byId = new Map(
    [...nodes, ...arrows].map((element) => [
      element.id,
      {
        ...element,
        boundElements: element.boundElements ? [...element.boundElements] : [],
      } as ExcalidrawElement,
    ])
  );

  data.edges.forEach((edge, index) => {
    const arrowId = `${prefix}arrow-${index}`;
    const startId = `${prefix}${edge.from}`;
    const endId = `${prefix}${edge.to}`;
    const arrow = byId.get(arrowId);
    const start = byId.get(startId);
    const end = byId.get(endId);
    if (!arrow || arrow.type !== "arrow" || !start || !end) return;

    byId.set(arrowId, {
      ...arrow,
      startBinding: {
        elementId: startId,
        focus: 0,
        gap: BIND_GAP,
      },
      endBinding: {
        elementId: endId,
        focus: 0,
        gap: BIND_GAP,
      },
    });

    const startBound = start.boundElements ? [...start.boundElements] : [];
    if (!startBound.some((bound) => bound.id === arrowId)) {
      startBound.push({ id: arrowId, type: "arrow" });
    }
    byId.set(startId, { ...start, boundElements: startBound });

    const endBound = end.boundElements ? [...end.boundElements] : [];
    if (!endBound.some((bound) => bound.id === arrowId)) {
      endBound.push({ id: arrowId, type: "arrow" });
    }
    byId.set(endId, { ...end, boundElements: endBound });
  });

  return [...byId.values()];
}

function offsetElements(
  elements: ExcalidrawElement[],
  existing: readonly ExcalidrawElement[],
  getBounds: typeof import("@excalidraw/excalidraw").getCommonBounds
) {
  if (!existing.length) {
    return elements.map((element) => ({
      ...element,
      x: element.x + 80,
      y: element.y + 80,
    }));
  }

  const [, minY, maxX] = getBounds(existing);
  const dx = maxX + EXISTING_GAP;
  const dy = minY;

  return elements.map((element) => ({
    ...element,
    x: element.x + dx,
    y: element.y + dy,
  }));
}

export function convertDiagramDataToElements(
  data: DiagramData,
  convertToExcalidrawElements: typeof import("@excalidraw/excalidraw").convertToExcalidrawElements,
  prefix = uniquePrefix()
): ExcalidrawElement[] {
  const nodeSkeletons = toNodeSkeletons(data, prefix);
  const convertedNodes = convertToExcalidrawElements(nodeSkeletons, {
    regenerateIds: false,
  });

  const shapes = new Map<string, Box>();
  for (const node of data.nodes) {
    const element = convertedNodes.find(
      (candidate) => candidate.id === `${prefix}${node.id}`
    );
    if (!element) continue;
    shapes.set(node.id, {
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    });
  }

  const arrowSkeletons = toArrowSkeletons(data, prefix, shapes);
  const convertedArrows = normalizeLinearElements(
    convertToExcalidrawElements(arrowSkeletons, {
      regenerateIds: false,
    })
  );

  return bindConvertedArrows(convertedNodes, convertedArrows, data, prefix);
}

export async function insertDiagramIntoWhiteboard(
  api: ExcalidrawImperativeAPI,
  data: DiagramData
) {
  const {
    CaptureUpdateAction,
    convertToExcalidrawElements,
    getCommonBounds,
  } = await import("@excalidraw/excalidraw");

  const generated = offsetElements(
    convertDiagramDataToElements(data, convertToExcalidrawElements),
    api.getSceneElements(),
    getCommonBounds
  );

  const existing = api.getSceneElements();
  const selectedElementIds: Record<string, true> = {};
  for (const element of generated) {
    selectedElementIds[element.id] = true;
  }

  api.updateScene({
    elements: [...existing, ...generated],
    appState: {
      selectedElementIds,
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  api.scrollToContent(generated, {
    fitToContent: true,
    animate: true,
  });
}
