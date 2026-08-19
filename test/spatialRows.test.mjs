import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSpatialRows,
  findNearestNodeInSpatialRow
} from "../js/ui/screens/library/spatialRows.js";

function createNode(id, left, top, width = 100) {
  let layoutReads = 0;
  return {
    id,
    getBoundingClientRect() {
      layoutReads += 1;
      return { left, top, width, height: 150 };
    },
    getLayoutReads() {
      return layoutReads;
    }
  };
}

test("spatial rows measure each card only once while building", () => {
  const nodes = [
    createNode("bottom-right", 220, 210),
    createNode("top-left", 0, 0),
    createNode("bottom-left", 0, 200),
    createNode("top-right", 220, 10)
  ];

  const rows = buildSpatialRows(nodes);

  assert.deepEqual(
    rows.map((row) => row.nodes.map((node) => node.id)),
    [
      ["top-left", "top-right"],
      ["bottom-left", "bottom-right"]
    ]
  );
  assert.deepEqual(
    nodes.map((node) => node.getLayoutReads()),
    [1, 1, 1, 1]
  );
});

test("vertical navigation reuses cached centers without new layout reads", () => {
  const topLeft = createNode("top-left", 0, 0);
  const topRight = createNode("top-right", 220, 0);
  const bottomLeft = createNode("bottom-left", 20, 200);
  const bottomRight = createNode("bottom-right", 240, 200);
  const nodes = [topLeft, topRight, bottomLeft, bottomRight];
  const rows = buildSpatialRows(nodes);

  const target = findNearestNodeInSpatialRow(topRight, rows[0], rows[1]);

  assert.equal(target, bottomRight);
  assert.deepEqual(
    nodes.map((node) => node.getLayoutReads()),
    [1, 1, 1, 1]
  );
});
