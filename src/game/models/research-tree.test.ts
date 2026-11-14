import { describe, expect, it } from "vitest";
import { RESEARCH_CATALOG } from "./research";
import {
  buildResearchTreeLayout,
  formatResearchEraRange,
  RESEARCH_TREE_NODE_HEIGHT,
  RESEARCH_TREE_NODE_WIDTH,
} from "./research-tree";

describe("research tree layout", () => {
  const layout = buildResearchTreeLayout();

  it("lays out every technology in its era column", () => {
    expect(layout.columns).toHaveLength(6);
    expect(layout.nodes).toHaveLength(RESEARCH_CATALOG.definitions.length);
    expect(new Set(layout.nodes.map((node) => node.id)).size).toBe(layout.nodes.length);

    for (const definition of RESEARCH_CATALOG.definitions) {
      const node = layout.nodesById.get(definition.id as typeof layout.nodes[number]["id"]);
      expect(node).toBeDefined();
      expect(node?.eraId).toBe(definition.eraId);
      expect(node?.width).toBe(RESEARCH_TREE_NODE_WIDTH);
      expect(node?.height).toBe(RESEARCH_TREE_NODE_HEIGHT);
    }
  });

  it("keeps columns ordered and inside the canvas", () => {
    const columns = layout.columns;
    for (let index = 1; index < columns.length; index += 1) {
      const previous = columns[index - 1]!;
      const current = columns[index]!;
      expect(current.x).toBeGreaterThan(previous.x);
    }

    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThan(0);
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it("draws one edge for every prerequisite", () => {
    const expectedEdges = RESEARCH_CATALOG.definitions.reduce(
      (total, technology) => total + technology.prerequisiteIds.length,
      0,
    );

    expect(layout.edges).toHaveLength(expectedEdges);
    expect(new Set(layout.edges.map((edge) => `${edge.fromId}-${edge.toId}`)).size)
      .toBe(layout.edges.length);
  });

  it("formats era ranges", () => {
    expect(formatResearchEraRange({ startYear: 1995, endYear: 1999 })).toBe("1995–1999");
    expect(formatResearchEraRange({ startYear: 2050, endYear: null })).toBe("2050+");
  });
});
