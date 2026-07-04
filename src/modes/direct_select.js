import {noTarget, isOfMetaType, isActiveFeature, isInactiveFeature, isShiftDown} from '../lib/common_selectors';
import createSupplementaryPoints from '../lib/create_supplementary_points';
import constrainFeatureMovement from '../lib/constrain_feature_movement';
import doubleClickZoom from '../lib/double_click_zoom';
import * as Constants from '../constants';
import moveFeatures from '../lib/move_features';
import { snapCoordinateToVertex } from '../lib/snap_to_vertex';
import { getCircleCenter, isCircleFeature } from '../lib/circle_geojson';
import { distance, initialBearing } from '../lib/geodesy';
import createCircleDisplayFeatures from '../lib/create_circle_display_features';

const isVertex = isOfMetaType(Constants.meta.VERTEX);
const isMidpoint = isOfMetaType(Constants.meta.MIDPOINT);

const DirectSelect = {};

// INTERNAL FUCNTIONS

function isRectangleFeature(feature) {
  return feature.type === Constants.geojsonTypes.POLYGON &&
    feature.properties &&
    feature.properties[Constants.properties.SHAPE] === Constants.types.RECTANGLE &&
    feature.coordinates.length === 1 &&
    feature.coordinates[0].length === 4;
}

function isShapeLockedFeature(feature) {
  return isRectangleFeature(feature) || isCircleFeature(feature);
}

function getRectangleVertexIndex(coordPath) {
  const parts = coordPath.split('.');
  if (parts.length !== 2 || parts[0] !== '0') return null;

  const index = parseInt(parts[1], 10);
  if (index < 0 || index > 3) return null;

  return index;
}

function updateRectangleCoordinate(feature, coordPath, lng, lat) {
  const index = getRectangleVertexIndex(coordPath);
  if (index === null) return false;

  const opposite = feature.coordinates[0][(index + 2) % 4];

  if (index === 0) {
    feature.updateCoordinate('0.0', lng, lat);
    feature.updateCoordinate('0.1', opposite[0], lat);
    feature.updateCoordinate('0.2', opposite[0], opposite[1]);
    feature.updateCoordinate('0.3', lng, opposite[1]);
  } else if (index === 1) {
    feature.updateCoordinate('0.0', opposite[0], lat);
    feature.updateCoordinate('0.1', lng, lat);
    feature.updateCoordinate('0.2', lng, opposite[1]);
    feature.updateCoordinate('0.3', opposite[0], opposite[1]);
  } else if (index === 2) {
    feature.updateCoordinate('0.0', opposite[0], opposite[1]);
    feature.updateCoordinate('0.1', lng, opposite[1]);
    feature.updateCoordinate('0.2', lng, lat);
    feature.updateCoordinate('0.3', opposite[0], lat);
  } else {
    feature.updateCoordinate('0.0', lng, opposite[1]);
    feature.updateCoordinate('0.1', opposite[0], opposite[1]);
    feature.updateCoordinate('0.2', opposite[0], lat);
    feature.updateCoordinate('0.3', lng, lat);
  }

  return true;
}

function updateCircleCoordinate(ctx, state, e) {
  const geojson = state.feature.toGeoJSON();
  const center = getCircleCenter(geojson);
  const snap = snapCoordinateToVertex(ctx, [e.lngLat.lng, e.lngLat.lat], {
    point: e.point,
    excludeFeatureIds: [state.featureId]
  });
  const handle = snap ? [snap.lng, snap.lat] : [e.lngLat.lng, e.lngLat.lat];
  const radius = distance(center, handle);
  const handleBearing = initialBearing(center, handle);

  state.feature.properties[Constants.properties.CIRCLE_RADIUS] = radius;
  state.feature[Constants.properties.CIRCLE_HANDLE_BEARING] = handleBearing;
  state.feature.changed();
}

DirectSelect.fireUpdate = function() {
  this.map.fire(Constants.events.UPDATE, {
    action: Constants.updateActions.CHANGE_COORDINATES,
    features: this.getSelected().map(f => f.toGeoJSON())
  });
};

DirectSelect.fireActionable = function(state) {
  this.setActionableState({
    combineFeatures: false,
    uncombineFeatures: false,
    trash: state.selectedCoordPaths.length > 0 && !isShapeLockedFeature(state.feature)
  });
};

DirectSelect.startDragging = function(state, e) {
  this.map.dragPan.disable();
  state.canDragMove = true;
  state.dragMoveLocation = e.lngLat;
};

DirectSelect.stopDragging = function(state) {
  this.map.dragPan.enable();
  state.dragMoving = false;
  state.canDragMove = false;
  state.dragMoveLocation = null;
};

DirectSelect.onVertex = function (state, e) {
  this.startDragging(state, e);
  const about = e.featureTarget.properties;
  const selectedIndex = state.selectedCoordPaths.indexOf(about.coord_path);

  if (isShapeLockedFeature(state.feature)) {
    state.selectedCoordPaths = [about.coord_path];
  } else if (!isShiftDown(e) && selectedIndex === -1) {
    state.selectedCoordPaths = [about.coord_path];
  } else if (isShiftDown(e) && selectedIndex === -1) {
    state.selectedCoordPaths.push(about.coord_path);
  }

  const selectedCoordinates = this.pathsToCoordinates(state.featureId, state.selectedCoordPaths);
  this.setSelectedCoordinates(selectedCoordinates);
};

DirectSelect.onMidpoint = function(state, e) {
  if (isShapeLockedFeature(state.feature)) return;

  this.startDragging(state, e);
  const about = e.featureTarget.properties;
  state.feature.addCoordinate(about.coord_path, about.lng, about.lat);
  this.fireUpdate();
  state.selectedCoordPaths = [about.coord_path];
};

DirectSelect.pathsToCoordinates = function(featureId, paths) {
  return paths.map(coord_path => ({ feature_id: featureId, coord_path }));
};

DirectSelect.onFeature = function(state, e) {
  if (state.selectedCoordPaths.length === 0) this.startDragging(state, e);
  else this.stopDragging(state);
};

DirectSelect.dragFeature = function(state, e, delta) {
  moveFeatures(this.getSelected(), delta);
  state.dragMoveLocation = e.lngLat;
};

DirectSelect.dragVertex = function(state, e, delta) {
  if (isCircleFeature(state.feature)) {
    if (state.selectedCoordPaths[0] === '0.1') {
      updateCircleCoordinate(this, state, e);
    } else {
      this.dragFeature(state, e, delta);
    }
    return;
  }

  const selectedCoords = state.selectedCoordPaths.map(coord_path => state.feature.getCoordinate(coord_path));
  const selectedCoordPoints = selectedCoords.map(coords => ({
    type: Constants.geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: Constants.geojsonTypes.POINT,
      coordinates: coords
    }
  }));

  const constrainedDelta = constrainFeatureMovement(selectedCoordPoints, delta);
  const excludeCoordinates = this.pathsToCoordinates(state.featureId, state.selectedCoordPaths);
  let snapDelta = null;
  for (let i = 0; i < selectedCoords.length; i++) {
    const coord = selectedCoords[i];
    const movedCoord = [coord[0] + constrainedDelta.lng, coord[1] + constrainedDelta.lat];
    const snap = snapCoordinateToVertex(this, movedCoord, { excludeCoordinates });
    if (snap) {
      snapDelta = {
        lng: snap.lng - movedCoord[0],
        lat: snap.lat - movedCoord[1]
      };
      break;
    }
  }

  for (let i = 0; i < selectedCoords.length; i++) {
    const coord = selectedCoords[i];
    const lng = coord[0] + constrainedDelta.lng + (snapDelta ? snapDelta.lng : 0);
    const lat = coord[1] + constrainedDelta.lat + (snapDelta ? snapDelta.lat : 0);

    if (isRectangleFeature(state.feature)) {
      updateRectangleCoordinate(state.feature, state.selectedCoordPaths[i], lng, lat);
      return;
    }

    state.feature.updateCoordinate(state.selectedCoordPaths[i], lng, lat);
  }
};

DirectSelect.clickNoTarget = function () {
  this.changeMode(Constants.modes.SIMPLE_SELECT);
};

DirectSelect.clickInactive = function () {
  this.changeMode(Constants.modes.SIMPLE_SELECT);
};

DirectSelect.clickActiveFeature = function (state) {
  state.selectedCoordPaths = [];
  this.clearSelectedCoordinates();
  state.feature.changed();
};

// EXTERNAL FUNCTIONS

DirectSelect.onSetup = function(opts) {
  const featureId = opts.featureId;
  const feature = this.getFeature(featureId);

  if (!feature) {
    throw new Error('You must provide a featureId to enter direct_select mode');
  }

  if (feature.type === Constants.geojsonTypes.POINT) {
    throw new TypeError('direct_select mode doesn\'t handle point features');
  }

  const state = {
    featureId,
    feature,
    dragMoveLocation: opts.startPos || null,
    dragMoving: false,
    canDragMove: false,
    selectedCoordPaths: opts.coordPath ? [opts.coordPath] : []
  };

  this.setSelectedCoordinates(this.pathsToCoordinates(featureId, state.selectedCoordPaths));
  this.setSelected(featureId);
  doubleClickZoom.disable(this);

  this.setActionableState({
    trash: true
  });

  return state;
};

DirectSelect.onStop = function() {
  doubleClickZoom.enable(this);
  this.clearSelectedCoordinates();
};

DirectSelect.toDisplayFeatures = function(state, geojson, push) {
  const feature = this.getFeature(geojson.properties.id);

  if (state.featureId === geojson.properties.id) {
    geojson.properties.active = Constants.activeStates.ACTIVE;
    if (isCircleFeature(state.feature)) {
      createCircleDisplayFeatures(state.feature, geojson, {
        selectedPaths: state.selectedCoordPaths
      }).forEach(push);
      this.fireActionable(state);
      return;
    }
    push(geojson);
    createSupplementaryPoints(geojson, {
      map: this.map,
      midpoints: !isShapeLockedFeature(state.feature),
      selectedPaths: state.selectedCoordPaths
    }).forEach(push);
  } else {
    geojson.properties.active = Constants.activeStates.INACTIVE;
    if (isCircleFeature(feature)) {
      createCircleDisplayFeatures(feature, geojson).forEach(push);
      this.fireActionable(state);
      return;
    }
    push(geojson);
  }
  this.fireActionable(state);
};

DirectSelect.onTrash = function(state) {
  if (isShapeLockedFeature(state.feature)) {
    state.selectedCoordPaths = [];
    this.clearSelectedCoordinates();
    this.fireActionable(state);
    return;
  }

  // Uses number-aware sorting to make sure '9' < '10'. Comparison is reversed because we want them
  // in reverse order so that we can remove by index safely.
  state.selectedCoordPaths
    .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
    .forEach(id => state.feature.removeCoordinate(id));
  this.fireUpdate();
  state.selectedCoordPaths = [];
  this.clearSelectedCoordinates();
  this.fireActionable(state);
  if (state.feature.isValid() === false) {
    this.deleteFeature([state.featureId]);
    this.changeMode(Constants.modes.SIMPLE_SELECT, {});
  }
};

DirectSelect.onMouseMove = function(state, e) {
  // On mousemove that is not a drag, stop vertex movement.
  const isFeature = isActiveFeature(e);
  const onVertex = isVertex(e);
  const isMidPoint = isMidpoint(e);
  const noCoords = state.selectedCoordPaths.length === 0;
  if (isFeature && noCoords) this.updateUIClasses({ mouse: Constants.cursors.MOVE });
  else if (onVertex && !noCoords) this.updateUIClasses({ mouse: Constants.cursors.MOVE });
  else this.updateUIClasses({ mouse: Constants.cursors.NONE });

  const isDraggableItem = onVertex || isFeature || isMidPoint;
  if (isDraggableItem && state.dragMoving) this.fireUpdate();

  this.stopDragging(state);

  // Skip render
  return true;
};

DirectSelect.onMouseOut = function(state) {
  // As soon as you mouse leaves the canvas, update the feature
  if (state.dragMoving) this.fireUpdate();

  // Skip render
  return true;
};

DirectSelect.onTouchStart = DirectSelect.onMouseDown = function(state, e) {
  if (isVertex(e)) return this.onVertex(state, e);
  if (isActiveFeature(e)) return this.onFeature(state, e);
  if (isMidpoint(e)) return this.onMidpoint(state, e);
};

DirectSelect.onDrag = function(state, e) {
  if (state.canDragMove !== true) return;
  state.dragMoving = true;
  e.originalEvent.stopPropagation();

  const delta = {
    lng: e.lngLat.lng - state.dragMoveLocation.lng,
    lat: e.lngLat.lat - state.dragMoveLocation.lat
  };
  if (state.selectedCoordPaths.length > 0) this.dragVertex(state, e, delta);
  else this.dragFeature(state, e, delta);

  state.dragMoveLocation = e.lngLat;
};

DirectSelect.onClick = function(state, e) {
  if (noTarget(e)) return this.clickNoTarget(state, e);
  if (isActiveFeature(e)) return this.clickActiveFeature(state, e);
  if (isInactiveFeature(e)) return this.clickInactive(state, e);
  this.stopDragging(state);
};

DirectSelect.onTap = function(state, e) {
  if (noTarget(e)) return this.clickNoTarget(state, e);
  if (isActiveFeature(e)) return this.clickActiveFeature(state, e);
  if (isInactiveFeature(e)) return this.clickInactive(state, e);
};

DirectSelect.onTouchEnd = DirectSelect.onMouseUp = function(state) {
  if (state.dragMoving) {
    this.fireUpdate();
  }
  this.stopDragging(state);
};

export default DirectSelect;

