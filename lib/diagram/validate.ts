import {
  DIAGRAM_TYPES,
  LAYOUTS,
  MAX_DIAGRAM_EDGES,
  MAX_DIAGRAM_NODES,
  NODE_TYPES,
  type DiagramData,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramLayout,
  type DiagramNode,
  type DiagramNodeType,
  type DiagramType,
} from "@/lib/diagram/types";

export class DiagramValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function isDiagramType(value: string): value is DiagramType {
  return (DIAGRAM_TYPES as readonly string[]).includes(value);
}

function isLayout(value: string): value is DiagramLayout {
  return (LAYOUTS as readonly string[]).includes(value);
}

function isNodeType(value: string): value is DiagramNodeType {
  return (NODE_TYPES as readonly string[]).includes(value);
}

function parseNode(value: unknown, index: number): DiagramNode {
  if (!isRecord(value)) {
    throw new DiagramValidationError(`Node ${index + 1} is invalid.`);
  }

  const id = asString(value.id);
  const label = asString(value.label);
  const rawType = asString(value.type) ?? "generic";
  const type = isNodeType(rawType) ? rawType : "generic";

  if (!id) {
    throw new DiagramValidationError(`Node ${index + 1} is missing an id.`);
  }

  if (!label) {
    throw new DiagramValidationError(`Node ${index + 1} is missing a label.`);
  }

  const node: DiagramNode = { id, label, type };
  const description = asString(value.description);
  const parentId = asString(value.parentId);

  if (description) node.description = description;
  if (parentId) node.parentId = parentId;

  return node;
}

function parseEdge(value: unknown, index: number, nodeIds: Set<string>): DiagramEdge {
  if (!isRecord(value)) {
    throw new DiagramValidationError(`Connection ${index + 1} is invalid.`);
  }

  const from = asString(value.from);
  const to = asString(value.to);

  if (!from || !to) {
    throw new DiagramValidationError(
      `Connection ${index + 1} is missing from/to references.`
    );
  }

  if (!nodeIds.has(from) || !nodeIds.has(to)) {
    throw new DiagramValidationError(
      `Connection ${index + 1} references a node that does not exist.`
    );
  }

  if (from === to) {
    throw new DiagramValidationError(
      `Connection ${index + 1} cannot connect a node to itself.`
    );
  }

  const label = asString(value.label) ?? "";
  return label ? { from, to, label } : { from, to };
}

function parseGroup(
  value: unknown,
  index: number,
  nodeIds: Set<string>
): DiagramGroup | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id) ?? `group-${index + 1}`;
  const label = asString(value.label) ?? "Group";
  const children = Array.isArray(value.children)
    ? value.children
        .map((child) => asString(child))
        .filter((child): child is string => child !== null && nodeIds.has(child))
    : [];

  if (children.length < 2) return null;

  return { id, label, children };
}

export function parseDiagramJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(payload);
  } catch {
    throw new DiagramValidationError(
      "The AI returned data that could not be parsed. Please try again."
    );
  }
}

export function validateDiagramData(
  value: unknown,
  expectedType?: DiagramType
): DiagramData {
  if (!isRecord(value)) {
    throw new DiagramValidationError("The AI returned an empty diagram.");
  }

  const diagramTypeRaw = asString(value.diagramType);
  if (!diagramTypeRaw || !isDiagramType(diagramTypeRaw)) {
    throw new DiagramValidationError("The AI returned an unsupported diagram type.");
  }

  if (expectedType && diagramTypeRaw !== expectedType) {
    throw new DiagramValidationError(
      "The generated diagram did not match the selected type. Please try again."
    );
  }

  const layoutRaw = asString(value.layout);
  const layout = layoutRaw && isLayout(layoutRaw) ? layoutRaw : undefined;

  if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
    throw new DiagramValidationError("The AI did not return any diagram nodes.");
  }

  if (value.nodes.length > MAX_DIAGRAM_NODES) {
    throw new DiagramValidationError(
      `Diagrams are limited to ${MAX_DIAGRAM_NODES} nodes. Try a simpler request.`
    );
  }

  const nodes = value.nodes.map(parseNode);
  const nodeIds = new Set(nodes.map((node) => node.id));

  if (nodeIds.size !== nodes.length) {
    throw new DiagramValidationError("The AI returned duplicate node ids.");
  }

  const rawEdges = Array.isArray(value.edges) ? value.edges : [];
  if (rawEdges.length > MAX_DIAGRAM_EDGES) {
    throw new DiagramValidationError(
      `Diagrams are limited to ${MAX_DIAGRAM_EDGES} connections. Try a simpler request.`
    );
  }

  const edges = rawEdges
    .map((edge, index) => {
      try {
        return parseEdge(edge, index, nodeIds);
      } catch {
        return null;
      }
    })
    .filter((edge): edge is DiagramEdge => edge !== null);

  const groups = Array.isArray(value.groups)
    ? value.groups
        .map((group, index) => parseGroup(group, index, nodeIds))
        .filter((group): group is DiagramGroup => group !== null)
    : undefined;

  return {
    diagramType: diagramTypeRaw,
    layout,
    nodes,
    edges,
    groups: groups?.length ? groups : undefined,
  };
}
