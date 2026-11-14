import {
  RESEARCH_CATALOG,
  RESEARCH_ERAS,
  type ResearchCategory,
  type ResearchEraId,
  type ResearchTechnologyDefinition,
  type ResearchTechnologyId,
} from "./research";

export const RESEARCH_TREE_NODE_WIDTH = 164;
export const RESEARCH_TREE_NODE_HEIGHT = 62;
export const RESEARCH_TREE_COLUMN_GAP = 26;
export const RESEARCH_TREE_ROW_GAP = 14;
export const RESEARCH_TREE_PADDING_X = 18;
export const RESEARCH_TREE_HEADER_HEIGHT = 64;
export const RESEARCH_TREE_PADDING_BOTTOM = 18;

export interface ResearchTreeColumn {
  id: ResearchEraId;
  index: number;
  x: number;
  width: number;
  startYear: number;
  endYear: number | null;
}

export interface ResearchTreeNode {
  id: ResearchTechnologyId;
  category: ResearchCategory;
  eraId: ResearchEraId;
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResearchTreeEdge {
  fromId: ResearchTechnologyId;
  toId: ResearchTechnologyId;
  path: string;
}

export interface ResearchTreeLayout {
  width: number;
  height: number;
  columns: readonly ResearchTreeColumn[];
  nodes: readonly ResearchTreeNode[];
  edges: readonly ResearchTreeEdge[];
  nodesById: ReadonlyMap<ResearchTechnologyId, ResearchTreeNode>;
}

interface ResearchEraDefinition {
  id: ResearchEraId;
  startYear: number;
  endYear: number | null;
}

export function buildResearchTreeLayout(
  definitions: readonly ResearchTechnologyDefinition[] = RESEARCH_CATALOG.definitions,
  eras: readonly ResearchEraDefinition[] = RESEARCH_ERAS,
): ResearchTreeLayout {
  const columns: ResearchTreeColumn[] = eras.map((era, index) => ({
    id: era.id,
    index,
    x: RESEARCH_TREE_PADDING_X +
      index * (RESEARCH_TREE_NODE_WIDTH + RESEARCH_TREE_COLUMN_GAP),
    width: RESEARCH_TREE_NODE_WIDTH,
    startYear: era.startYear,
    endYear: era.endYear,
  }));
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const rowsByColumn = new Map<number, number>();
  const nodes: ResearchTreeNode[] = [];

  for (const definition of definitions) {
    const column = columnById.get(definition.eraId);
    if (!column) {
      continue;
    }

    const row = rowsByColumn.get(column.index) ?? 0;
    rowsByColumn.set(column.index, row + 1);
    nodes.push({
      id: definition.id as ResearchTechnologyId,
      category: definition.category,
      eraId: definition.eraId,
      column: column.index,
      row,
      x: column.x,
      y: RESEARCH_TREE_HEADER_HEIGHT +
        row * (RESEARCH_TREE_NODE_HEIGHT + RESEARCH_TREE_ROW_GAP),
      width: RESEARCH_TREE_NODE_WIDTH,
      height: RESEARCH_TREE_NODE_HEIGHT,
    });
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges: ResearchTreeEdge[] = [];

  for (const definition of definitions) {
    const target = nodesById.get(definition.id as ResearchTechnologyId);
    if (!target) {
      continue;
    }

    for (const prerequisiteId of definition.prerequisiteIds) {
      const source = nodesById.get(prerequisiteId as ResearchTechnologyId);
      if (!source) {
        continue;
      }

      const startX = source.x + source.width;
      const startY = source.y + source.height / 2;
      const endX = target.x;
      const endY = target.y + target.height / 2;
      const bend = Math.max(24, Math.abs(endX - startX) / 2);

      edges.push({
        fromId: source.id,
        toId: target.id,
        path: `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`,
      });
    }
  }

  const tallestColumn = Math.max(0, ...rowsByColumn.values());
  const width = columns.length === 0
    ? RESEARCH_TREE_PADDING_X * 2
    : RESEARCH_TREE_PADDING_X * 2 +
      columns.length * RESEARCH_TREE_NODE_WIDTH +
      (columns.length - 1) * RESEARCH_TREE_COLUMN_GAP;
  const height = RESEARCH_TREE_HEADER_HEIGHT +
    tallestColumn * (RESEARCH_TREE_NODE_HEIGHT + RESEARCH_TREE_ROW_GAP) -
    (tallestColumn > 0 ? RESEARCH_TREE_ROW_GAP : 0) +
    RESEARCH_TREE_PADDING_BOTTOM;

  return {
    width,
    height,
    columns,
    nodes,
    edges,
    nodesById,
  };
}

export function formatResearchEraRange(
  era: Pick<ResearchEraDefinition, "startYear" | "endYear">,
): string {
  return era.endYear === null ? `${era.startYear}+` : `${era.startYear}–${era.endYear}`;
}
