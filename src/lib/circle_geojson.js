import hat from 'hat';
import * as Constants from '../constants';

export function createCircle(center, radius, properties = {}) {
  if (!(radius > 0)) {
    throw new Error('Radius has to be greater than 0');
  }

  return {
    id: hat(),
    type: Constants.geojsonTypes.FEATURE,
    properties: {
      [Constants.properties.CIRCLE_RADIUS]: radius,
      ...properties
    },
    geometry: {
      type: Constants.geojsonTypes.POLYGON,
      coordinates: [[center, center, center, center]]
    }
  };
}

export function isCircleByTypeAndProperties(type, properties = {}) {
  return type === Constants.geojsonTypes.POLYGON &&
    typeof properties[Constants.properties.CIRCLE_RADIUS] === 'number' &&
    properties[Constants.properties.CIRCLE_RADIUS] > 0;
}

export function isCircleFeature(feature) {
  return feature &&
    isCircleByTypeAndProperties(feature.type, feature.properties);
}

export function isCircleGeoJSON(geojson) {
  return geojson &&
    geojson.geometry &&
    isCircleByTypeAndProperties(geojson.geometry.type, geojson.properties);
}

export function getCircleCenter(geojson) {
  if (!isCircleGeoJSON(geojson)) {
    throw new Error('GeoJSON is not a circle');
  }

  return geojson.geometry.coordinates[0][0];
}

export function getCircleRadius(geojson) {
  if (!isCircleGeoJSON(geojson)) {
    throw new Error('GeoJSON is not a circle');
  }

  return geojson.properties[Constants.properties.CIRCLE_RADIUS];
}
