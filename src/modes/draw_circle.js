import * as CommonSelectors from '../lib/common_selectors';
import doubleClickZoom from '../lib/double_click_zoom';
import * as Constants from '../constants';
import { createCircle, getCircleCenter } from '../lib/circle_geojson';
import { distance, initialBearing } from '../lib/geodesy';
import createCircleDisplayFeatures from '../lib/create_circle_display_features';
import { snapEventToVertex } from '../lib/snap_to_vertex';

const DrawCircle = {};

function disableDragPan(ctx) {
  if (ctx.map && ctx.map.dragPan) ctx.map.dragPan.disable();
}

function enableDragPan(ctx) {
  if (!ctx.map || !ctx.map.dragPan) return;
  if (ctx._ctx && ctx._ctx.store && ctx._ctx.store.getInitialConfigValue &&
    !ctx._ctx.store.getInitialConfigValue('dragPan')) return;
  ctx.map.dragPan.enable();
}

function getLngLat(ctx, e, options = {}) {
  const snap = snapEventToVertex(ctx, e, options);
  return snap || e.lngLat;
}

function updateCircle(ctx, state, e) {
  if (!state.circle) return;

  const geojson = state.circle.toGeoJSON();
  const center = getCircleCenter(geojson);
  const lngLat = getLngLat(ctx, e, {
    excludeFeatureIds: [state.circle.id]
  });
  const handle = [lngLat.lng, lngLat.lat];
  const radius = distance(center, handle);
  const handleBearing = initialBearing(center, handle);

  state.circle.properties[Constants.properties.CIRCLE_RADIUS] = radius;
  state.circle[Constants.properties.CIRCLE_HANDLE_BEARING] = handleBearing;
  state.isValid = radius > 0;
  state.circle.changed();
}

function finishCircle(ctx, state, e) {
  if (!state.circle) return;
  if (e) updateCircle(ctx, state, e);
  state.completed = true;
  ctx.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.circle.id] });
}

DrawCircle.onSetup = function() {
  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);
  disableDragPan(this);
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
  this.activateUIButton(Constants.types.CIRCLE);
  this.setActionableState({
    trash: true
  });

  return {
    circle: null,
    completed: false,
    isValid: false
  };
};

DrawCircle.onMouseDown = DrawCircle.onTouchStart = function(state, e) {
  const lngLat = getLngLat(this, e);
  const center = [lngLat.lng, lngLat.lat];
  const circle = this.newFeature(createCircle(center, Number.EPSILON));

  this.addFeature(circle);
  state.circle = circle;
};

DrawCircle.onDrag = DrawCircle.onTouchMove = function(state, e) {
  updateCircle(this, state, e);
};

DrawCircle.onMouseUp = DrawCircle.onTouchEnd = DrawCircle.onClick = DrawCircle.onTap = function(state, e) {
  finishCircle(this, state, e);
};

DrawCircle.onKeyUp = function(state, e) {
  if (CommonSelectors.isEscapeKey(e)) {
    if (state.circle) {
      this.deleteFeature([state.circle.id], { silent: true });
    }
    this.changeMode(Constants.modes.SIMPLE_SELECT);
  } else if (CommonSelectors.isEnterKey(e)) {
    finishCircle(this, state);
  }
};

DrawCircle.onStop = function(state) {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
  doubleClickZoom.enable(this);
  enableDragPan(this);
  this.activateUIButton();

  if (!state.circle || this.getFeature(state.circle.id) === undefined) return;

  if (state.completed && state.isValid && state.circle.isValid()) {
    this.map.fire(Constants.events.CREATE, {
      features: [state.circle.toGeoJSON()]
    });
  } else {
    this.deleteFeature([state.circle.id], { silent: true });
  }
};

DrawCircle.toDisplayFeatures = function(state, geojson, display) {
  if (!state.circle) return;

  const isActiveCircle = geojson.properties.id === state.circle.id;
  geojson.properties.active = (isActiveCircle) ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE;
  createCircleDisplayFeatures(state.circle, geojson).forEach(display);
};

DrawCircle.onTrash = function(state) {
  if (state.circle) {
    this.deleteFeature([state.circle.id], { silent: true });
  }
  this.changeMode(Constants.modes.SIMPLE_SELECT);
};

export default DrawCircle;
