import * as CommonSelectors from '../lib/common_selectors';
import doubleClickZoom from '../lib/double_click_zoom';
import * as Constants from '../constants';
import { snapEventToVertex } from '../lib/snap_to_vertex';

const DrawRectangle = {};

function getLngLat(ctx, state, e) {
  const snap = snapEventToVertex(ctx, e, {
    excludeFeatureIds: [state.rectangle.id]
  });

  return snap || e.lngLat;
}

function updateRectangle(state, lng, lat) {
  const start = state.startPoint;
  state.rectangle.updateCoordinate('0.0', start.lng, start.lat);
  state.rectangle.updateCoordinate('0.1', lng, start.lat);
  state.rectangle.updateCoordinate('0.2', lng, lat);
  state.rectangle.updateCoordinate('0.3', start.lng, lat);
  state.isValid = start.lng !== lng && start.lat !== lat;
}

DrawRectangle.onSetup = function() {
  const rectangle = this.newFeature({
    type: Constants.geojsonTypes.FEATURE,
    properties: {
      [Constants.properties.SHAPE]: Constants.types.RECTANGLE
    },
    geometry: {
      type: Constants.geojsonTypes.POLYGON,
      coordinates: [[]]
    }
  });

  this.addFeature(rectangle);

  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
  this.activateUIButton(Constants.types.RECTANGLE);
  this.setActionableState({
    trash: true
  });

  return {
    rectangle,
    startPoint: null,
    isValid: false
  };
};

DrawRectangle.onTap = DrawRectangle.onClick = function(state, e) {
  const lngLat = getLngLat(this, state, e);

  if (!state.startPoint) {
    state.startPoint = {
      lng: lngLat.lng,
      lat: lngLat.lat
    };
    this.updateUIClasses({ mouse: Constants.cursors.ADD });
    return;
  }

  updateRectangle(state, lngLat.lng, lngLat.lat);
  this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.rectangle.id] });
};

DrawRectangle.onMouseMove = function(state, e) {
  if (!state.startPoint) return;

  const lngLat = getLngLat(this, state, e);
  updateRectangle(state, lngLat.lng, lngLat.lat);
};

DrawRectangle.onKeyUp = function(state, e) {
  if (CommonSelectors.isEscapeKey(e)) {
    this.deleteFeature([state.rectangle.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT);
  } else if (CommonSelectors.isEnterKey(e) && state.startPoint) {
    this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.rectangle.id] });
  }
};

DrawRectangle.onStop = function(state) {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
  doubleClickZoom.enable(this);
  this.activateUIButton();

  if (this.getFeature(state.rectangle.id) === undefined) return;

  if (state.isValid && state.rectangle.isValid()) {
    this.map.fire(Constants.events.CREATE, {
      features: [state.rectangle.toGeoJSON()]
    });
  } else {
    this.deleteFeature([state.rectangle.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true });
  }
};

DrawRectangle.toDisplayFeatures = function(state, geojson, display) {
  const isActiveRectangle = geojson.properties.id === state.rectangle.id;
  geojson.properties.active = (isActiveRectangle) ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE;
  if (!isActiveRectangle) return display(geojson);
  if (!state.startPoint || geojson.geometry.coordinates[0].length < 4) return;

  geojson.properties.meta = Constants.meta.FEATURE;
  display(geojson);
};

DrawRectangle.onTrash = function(state) {
  this.deleteFeature([state.rectangle.id], { silent: true });
  this.changeMode(Constants.modes.SIMPLE_SELECT);
};

export default DrawRectangle;
