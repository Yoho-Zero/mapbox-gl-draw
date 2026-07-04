import * as Constants from '../constants';
import createVertex from './create_vertex';
import createGeodesicCircle from './create_geodesic_circle';
import { destinationPoint } from './geodesy';
import { getCircleCenter, getCircleRadius, isCircleFeature } from './circle_geojson';

const CIRCLE_STEPS = 128;
const DEFAULT_HANDLE_BEARING = 45;

function isSelectedPath(selectedPaths, path) {
  return selectedPaths && selectedPaths.indexOf(path) !== -1;
}

export default function createCircleDisplayFeatures(feature, geojson, options = {}) {
  if (!isCircleFeature(feature)) return [geojson];

  const featureGeojson = feature.toGeoJSON();
  const center = getCircleCenter(featureGeojson);
  const radius = getCircleRadius(featureGeojson);
  const handleBearing = feature[Constants.properties.CIRCLE_HANDLE_BEARING] ||
    feature.properties[Constants.properties.CIRCLE_HANDLE_BEARING] ||
    DEFAULT_HANDLE_BEARING;
  const geodesicCoordinates = createGeodesicCircle(center, radius, handleBearing, CIRCLE_STEPS);
  const circleGeojson = {
    ...geojson,
    geometry: {
      ...geojson.geometry,
      coordinates: [geodesicCoordinates]
    }
  };

  if (geojson.properties.active !== Constants.activeStates.ACTIVE) {
    return [circleGeojson];
  }

  const featureId = geojson.properties.id;
  const handle = destinationPoint(center, radius, handleBearing);

  return [
    circleGeojson,
    createVertex(featureId, center, '0.0', isSelectedPath(options.selectedPaths, '0.0')),
    createVertex(featureId, handle, '0.1', isSelectedPath(options.selectedPaths, '0.1'))
  ];
}
