import geojsonArea from '@mapbox/geojson-area';
import * as Constants from '../constants';

const DEFAULT_PRECISION = 0.0001;
const MIN_SAFE_DISTANCE_RATIO = 0.8;
const CENTER_WEIGHT = 0.75;
const SAFETY_WEIGHT = 0.25;
const INTERPOLATION_STEPS = 8;

function sqDist(a, b, p) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function pointToPolygonDist(point, polygon) {
  let inside = false;
  let minDistSq = Infinity;

  polygon.forEach((ring) => {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];

      if ((a[1] > point[1]) !== (b[1] > point[1]) &&
        (point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0])) {
        inside = !inside;
      }

      minDistSq = Math.min(minDistSq, sqDist(a, b, point));
    }
  });

  const distance = Math.sqrt(minDistSq);
  return inside ? distance : -distance;
}

function compareMax(a, b) {
  return b.max - a.max;
}

function createCell(x, y, h, polygon) {
  const d = pointToPolygonDist([x, y], polygon);
  return {
    x,
    y,
    h,
    d,
    max: d + h * Math.SQRT2
  };
}

function distance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function interpolate(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t
  ];
}

function getCentroidCell(polygon) {
  let area = 0;
  let x = 0;
  let y = 0;
  const ring = polygon[0];

  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }

  if (area === 0) return createCell(ring[0][0], ring[0][1], 0, polygon);
  return createCell(x / area, y / area, 0, polygon);
}

function getBBox(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  ring.forEach((point) => {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  });

  return { minX, minY, maxX, maxY };
}

function getBBoxCenterCell(polygon) {
  const bbox = getBBox(polygon[0]);
  return createCell(
    bbox.minX + (bbox.maxX - bbox.minX) / 2,
    bbox.minY + (bbox.maxY - bbox.minY) / 2,
    0,
    polygon
  );
}

function getCellPoint(cell) {
  return [cell.x, cell.y];
}

function getPolylabelCell(polygon, precision = DEFAULT_PRECISION) {
  if (!polygon.length || !polygon[0].length) return null;

  const bbox = getBBox(polygon[0]);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const cellSize = Math.min(width, height);

  if (cellSize === 0) return createCell(polygon[0][0][0], polygon[0][0][1], 0, polygon);

  let h = cellSize / 2;
  const cellQueue = [];

  for (let x = bbox.minX; x < bbox.maxX; x += cellSize) {
    for (let y = bbox.minY; y < bbox.maxY; y += cellSize) {
      cellQueue.push(createCell(x + h, y + h, h, polygon));
    }
  }

  let bestCell = getCentroidCell(polygon);
  const bboxCell = createCell(bbox.minX + width / 2, bbox.minY + height / 2, 0, polygon);
  if (bboxCell.d > bestCell.d) bestCell = bboxCell;

  cellQueue.sort(compareMax);

  while (cellQueue.length) {
    const cell = cellQueue.shift();
    if (cell.d > bestCell.d) bestCell = cell;
    if (cell.max - bestCell.d <= precision) continue;

    h = cell.h / 2;
    cellQueue.push(createCell(cell.x - h, cell.y - h, h, polygon));
    cellQueue.push(createCell(cell.x + h, cell.y - h, h, polygon));
    cellQueue.push(createCell(cell.x - h, cell.y + h, h, polygon));
    cellQueue.push(createCell(cell.x + h, cell.y + h, h, polygon));
    cellQueue.sort(compareMax);
  }

  return bestCell;
}

function addCandidate(candidates, seen, polygon, point) {
  const d = pointToPolygonDist(point, polygon);
  if (d <= 0) return;

  const key = `${point[0]},${point[1]}`;
  if (seen[key]) return;

  seen[key] = true;
  candidates.push({
    point,
    d
  });
}

function getVisualCenter(centroidCell, bboxCell, polylabelCell) {
  const centerCells = [centroidCell, bboxCell].filter(cell => cell && cell.d > 0);
  if (!centerCells.length) return getCellPoint(polylabelCell);

  const sum = centerCells.reduce((memo, cell) => {
    memo[0] += cell.x;
    memo[1] += cell.y;
    return memo;
  }, [0, 0]);

  return [
    sum[0] / centerCells.length,
    sum[1] / centerCells.length
  ];
}

function getCenterBiasedLabelPoint(polygon, precision = DEFAULT_PRECISION) {
  const polylabelCell = getPolylabelCell(polygon, precision);
  if (!polylabelCell) return null;

  const polylabelPoint = getCellPoint(polylabelCell);
  if (polylabelCell.d <= 0) return polylabelPoint;

  const bbox = getBBox(polygon[0]);
  const diagonal = distance([bbox.minX, bbox.minY], [bbox.maxX, bbox.maxY]);
  if (diagonal === 0) return polylabelPoint;

  const centroidCell = getCentroidCell(polygon);
  const bboxCell = getBBoxCenterCell(polygon);
  const visualCenter = getVisualCenter(centroidCell, bboxCell, polylabelCell);
  const safeDistance = polylabelCell.d * MIN_SAFE_DISTANCE_RATIO;
  const candidates = [];
  const seen = {};

  addCandidate(candidates, seen, polygon, polylabelPoint);
  addCandidate(candidates, seen, polygon, getCellPoint(centroidCell));
  addCandidate(candidates, seen, polygon, getCellPoint(bboxCell));
  addCandidate(candidates, seen, polygon, visualCenter);

  [centroidCell, bboxCell].filter(cell => cell && cell.d > 0).forEach((cell) => {
    const centerPoint = getCellPoint(cell);
    for (let step = 1; step < INTERPOLATION_STEPS; step++) {
      addCandidate(candidates, seen, polygon, interpolate(centerPoint, polylabelPoint, step / INTERPOLATION_STEPS));
    }
  });

  const safeCandidates = candidates.filter(candidate => candidate.d >= safeDistance);
  if (!safeCandidates.length) return polylabelPoint;

  safeCandidates.sort((a, b) => {
    const aCenterPenalty = distance(a.point, visualCenter) / diagonal;
    const bCenterPenalty = distance(b.point, visualCenter) / diagonal;
    const aSafetyPenalty = (polylabelCell.d - a.d) / polylabelCell.d;
    const bSafetyPenalty = (polylabelCell.d - b.d) / polylabelCell.d;

    const aScore = CENTER_WEIGHT * aCenterPenalty + SAFETY_WEIGHT * aSafetyPenalty;
    const bScore = CENTER_WEIGHT * bCenterPenalty + SAFETY_WEIGHT * bSafetyPenalty;
    return aScore - bScore;
  });

  return safeCandidates[0].point;
}

function getLargestPolygon(multiPolygon) {
  const largestPolygon = multiPolygon.reduce((largest, polygon) => {
    const area = geojsonArea.geometry({
      type: Constants.geojsonTypes.POLYGON,
      coordinates: polygon
    });
    return !largest || area > largest.area ? { area, polygon } : largest;
  }, null);

  return largestPolygon && largestPolygon.polygon;
}

function getLabelPolygon(geometry) {
  if (geometry.type === Constants.geojsonTypes.POLYGON) return geometry.coordinates;
  if (geometry.type === Constants.geojsonTypes.MULTI_POLYGON) return getLargestPolygon(geometry.coordinates);
  return null;
}

export default function createReferenceLabelFeatures(features, precision = DEFAULT_PRECISION) {
  return features.reduce((labels, feature) => {
    const name = feature.properties && feature.properties.name;
    const polygon = feature.geometry && name ? getLabelPolygon(feature.geometry) : null;
    if (!polygon) return labels;

    const coordinates = getCenterBiasedLabelPoint(polygon, precision);
    if (!coordinates) return labels;

    labels.push({
      id: `${feature.id}-label`,
      type: Constants.geojsonTypes.FEATURE,
      properties: {
        ...JSON.parse(JSON.stringify(feature.properties)),
        parent: feature.id,
        meta: 'reference-label'
      },
      geometry: {
        type: Constants.geojsonTypes.POINT,
        coordinates
      }
    });

    return labels;
  }, []);
}
