export function buildSpatialRows(nodes = [], tolerance = 28) {
  const rows = [];
  const measurements = Array.from(nodes).map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      node,
      top: Number(rect.top || 0),
      left: Number(rect.left || 0),
      centerX: Number(rect.left || 0) + Number(rect.width || 0) / 2
    };
  });

  measurements.forEach((measurement) => {
    const existingRow = rows.find((row) => Math.abs(row.top - measurement.top) <= tolerance);
    if (existingRow) {
      existingRow.measurements.push(measurement);
      return;
    }
    rows.push({
      top: measurement.top,
      measurements: [measurement]
    });
  });

  rows.sort((left, right) => left.top - right.top);
  return rows.map((row) => {
    row.measurements.sort((left, right) => left.left - right.left);
    return {
      top: row.top,
      nodes: row.measurements.map((measurement) => measurement.node),
      centerXByNode: new Map(
        row.measurements.map((measurement) => [measurement.node, measurement.centerX])
      )
    };
  });
}

export function findNearestNodeInSpatialRow(referenceNode, referenceRow, targetRow) {
  const nodes = targetRow?.nodes || [];
  if (!referenceNode || !nodes.length) {
    return nodes[0] || null;
  }

  let referenceCenter = referenceRow?.centerXByNode?.get(referenceNode);
  if (!Number.isFinite(referenceCenter)) {
    const rect = referenceNode.getBoundingClientRect();
    referenceCenter = Number(rect.left || 0) + Number(rect.width || 0) / 2;
  }

  let bestNode = nodes[0] || null;
  let bestDistance = Number.POSITIVE_INFINITY;
  nodes.forEach((node) => {
    let centerX = targetRow?.centerXByNode?.get(node);
    if (!Number.isFinite(centerX)) {
      const rect = node.getBoundingClientRect();
      centerX = Number(rect.left || 0) + Number(rect.width || 0) / 2;
    }
    const distance = Math.abs(centerX - referenceCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNode = node;
    }
  });
  return bestNode;
}
