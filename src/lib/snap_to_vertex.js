import * as Constants from '../constants';
import xtend from 'xtend';

const DEFAULT_SNAP_DISTANCE = 10;

function getSnapDistance(ctx) {
  const options = ctx.drawConfig || ctx.options || {};
  if (options.vertexSnapping !== true) return null;
  const distance = options.vertexSnappingDistance;
  return (typeof distance === 'number' && distance >= 0) ? distance : DEFAULT_SNAP_DISTANCE;
}

function toPoint(map, coordinates) {
  if (map && typeof map.project === 'function') {
    return map.project({
      lng: coordinates[0],
      lat: coordinates[1]
    });
  }

  return {
    x: coordinates[0],
    y: coordinates[1]
  };
}

function isSamePosition(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function isValidCoordinate(coordinates) {
  return Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number';
}

function isExcluded(featureId, coordPath, excluded) {
  if (!excluded || !excluded[featureId]) return false;
  return excluded[featureId].indexOf(coordPath) !== -1;
}

function buildExcludedMap(options = {}) {
  const excluded = {};
  if (options.excludeFeatureIds) {
    options.excludeFeatureIds.forEach((featureId) => {
      excluded[featureId] = true;
    });
  }
  if (options.featureId && options.excludeCoordPaths) {
    excluded[options.featureId] = options.excludeCoordPaths;
  }
  if (options.excludeCoordinates) {
    options.excludeCoordinates.forEach((coordinate) => {
      if (!excluded[coordinate.feature_id]) excluded[coordinate.feature_id] = [];
      excluded[coordinate.feature_id].push(coordinate.coord_path);
    });
  }
  return excluded;
}

function addCandidate(candidates, featureId, coordinates, coordPath, excluded, source) {
  if (!isValidCoordinate(coordinates)) return;
  if (excluded && excluded[featureId] === true) return;
  if (isExcluded(featureId, coordPath, excluded)) return;
  candidates.push({
    featureId,
    coordPath,
    coordinates,
    source
  });
}

function collectGeometryVertices(candidates, featureId, geometry, excluded, basePath = null, source = 'editable') {
  if (!geometry) return;
  const { type, coordinates } = geometry;

  if (type === Constants.geojsonTypes.POINT) {
    addCandidate(candidates, featureId, coordinates, basePath, excluded, source);
  } else if (type === Constants.geojsonTypes.LINE_STRING || type === Constants.geojsonTypes.MULTI_POINT) {
    coordinates.forEach((coordinate, index) => {
      const coordPath = basePath === null ? String(index) : `${basePath}.${index}`;
      addCandidate(candidates, featureId, coordinate, coordPath, excluded, source);
    });
  } else if (type === Constants.geojsonTypes.POLYGON || type === Constants.geojsonTypes.MULTI_LINE_STRING) {
    coordinates.forEach((line, lineIndex) => {
      line.forEach((coordinate, coordinateIndex) => {
        if (type === Constants.geojsonTypes.POLYGON && coordinateIndex === line.length - 1 && isValidCoordinate(coordinate) && isValidCoordinate(line[0]) && isSamePosition(coordinate, line[0])) return;
        const coordPath = basePath === null ? `${lineIndex}.${coordinateIndex}` : `${basePath}.${lineIndex}.${coordinateIndex}`;
        addCandidate(candidates, featureId, coordinate, coordPath, excluded, source);
      });
    });
  } else if (type === Constants.geojsonTypes.MULTI_POLYGON) {
    coordinates.forEach((polygon, polygonIndex) => {
      collectGeometryVertices(candidates, featureId, {
        type: Constants.geojsonTypes.POLYGON,
        coordinates: polygon
      }, excluded, basePath === null ? String(polygonIndex) : `${basePath}.${polygonIndex}`, source);
    });
  }
}

function getVertexCandidates(ctx, options = {}) {
  const store = ctx._ctx && ctx._ctx.store;
  if (!store || typeof store.getAll !== 'function') return [];

  const excluded = buildExcludedMap(options);
  const candidates = [];

  store.getAll().forEach((feature) => {
    collectGeometryVertices(candidates, feature.id, feature.toGeoJSON().geometry, excluded);
  });
  if (typeof store.getReferenceFeatures === 'function') {
    store.getReferenceFeatures().forEach((feature) => {
      collectGeometryVertices(candidates, feature.id, feature.geometry, excluded, null, 'reference');
    });
  }

  return candidates;
}

export function snapCoordinateToVertex(ctx, coordinates, options = {}) {
  const snapDistance = getSnapDistance(ctx);
  if (snapDistance === null) return null;

  const point = options.point || toPoint(ctx.map, coordinates);
  let closest = null;
  let closestDistanceSquared = snapDistance * snapDistance;

  getVertexCandidates(ctx, options).forEach((candidate) => {
    const candidatePoint = toPoint(ctx.map, candidate.coordinates);
    const dx = point.x - candidatePoint.x;
    const dy = point.y - candidatePoint.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared <= closestDistanceSquared) {
      closest = candidate;
      closestDistanceSquared = distanceSquared;
    }
  });

  if (!closest) return null;
  return {
    lng: closest.coordinates[0],
    lat: closest.coordinates[1],
    coordinates: closest.coordinates,
    featureId: closest.featureId,
    coordPath: closest.coordPath,
    source: closest.source
  };
}

export function snapEventToVertex(ctx, e, options = {}) {
  return snapCoordinateToVertex(ctx, [e.lngLat.lng, e.lngLat.lat], xtend(options, {
    point: e.point
  }));
}
