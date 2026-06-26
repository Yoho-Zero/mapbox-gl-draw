import test from 'tape';
import MapboxDraw from '../index';
import createMap from './utils/create_map';
import mouseClick from './utils/mouse_click';
import makeMouseEvent from './utils/make_mouse_event';
import setupAfterNextRender from './utils/after_next_render';
import * as Constants from '../src/constants';

test('reference features are rendered, read-only, and available for vertex snapping', (t) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const map = createMap({ container });
  const Draw = new MapboxDraw();
  map.addControl(Draw);
  const afterNextRender = setupAfterNextRender(map);
  const referencePoint = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [10, 10]
    }
  };

  const [referenceId] = Draw.setReferenceFeatures(referencePoint);
  t.equal(Draw.getAll().features.length, 0, 'reference features are not editable draw features');
  t.equal(Draw.getReferenceFeatures().features.length, 1, 'reference features can be read separately');
  t.equal(Draw.getReferenceFeatures().features[0].id, referenceId, 'reference id is returned');

  afterNextRender(() => {
    t.deepEqual(map.sources[Constants.sources.REFERENCE].data.features[0].geometry.coordinates, [10, 10], 'reference features render to the reference source');
    t.deepEqual(map.sources[Constants.sources.REFERENCE_LABEL].data.features, [], 'reference points do not create labels');
    t.deepEqual(Draw.getFeatureIdsAt({ x: 10, y: 10 }), [], 'reference features are not selectable');

    Draw.changeMode(Constants.modes.DRAW_LINE_STRING);
    mouseClick(map, makeMouseEvent(12, 12));

    const line = Draw.getAll().features[0];
    t.deepEqual(line.geometry.coordinates, [[10, 10], [10, 10]], 'drawing snaps to reference vertices');

    Draw.deleteAll();
    t.equal(Draw.getReferenceFeatures().features.length, 1, 'deleteAll does not remove reference features');

    Draw.clearReferenceFeatures();
    t.equal(Draw.getReferenceFeatures().features.length, 0, 'reference features can be cleared explicitly');

    document.body.removeChild(container);
    t.end();
  });
});

test('reference polygon labels render from properties.name inside the polygon', (t) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const map = createMap({ container });
  const Draw = new MapboxDraw();
  map.addControl(Draw);
  const afterNextRender = setupAfterNextRender(map);
  const referencePolygon = {
    id: 'district-a',
    type: 'Feature',
    properties: {
      name: 'District A',
      color: '#2563eb'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0]
      ]]
    }
  };

  Draw.setReferenceFeatures(referencePolygon);

  afterNextRender(() => {
    const labels = map.sources[Constants.sources.REFERENCE_LABEL].data.features;
    t.equal(labels.length, 1, 'named reference polygons create one label point');
    t.equal(labels[0].properties.name, 'District A', 'label reads the name property');
    t.equal(labels[0].properties.parent, 'district-a', 'label keeps a reference to the source feature');
    t.deepEqual(labels[0].geometry.coordinates, [5, 5], 'label point is inside the simple polygon');
    t.deepEqual(Draw.getFeatureIdsAt({ x: 5, y: 5 }), [], 'reference labels are not selectable');

    document.body.removeChild(container);
    t.end();
  });
});

test('reference polygon labels prefer central safe candidates over left-biased polylabel points', (t) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const map = createMap({ container });
  const Draw = new MapboxDraw();
  map.addControl(Draw);
  const afterNextRender = setupAfterNextRender(map);
  const referencePolygon = {
    type: 'Feature',
    properties: {
      name: '感知圈',
      color: '#ee6666'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [120.16753574556924, 30.245114619140697],
        [120.16445696700328, 30.245067957567727],
        [120.1619594807035, 30.24493987224991],
        [120.16012301013983, 30.24474730999882],
        [120.15983739790975, 30.24829530010344],
        [120.16211191115443, 30.24829530010344],
        [120.16743341383963, 30.248332372537856],
        [120.16753574556924, 30.245114619140697]
      ]]
    }
  };

  Draw.setReferenceFeatures(referencePolygon);

  afterNextRender(() => {
    const label = map.sources[Constants.sources.REFERENCE_LABEL].data.features[0];
    const coordinates = label.geometry.coordinates;
    t.ok(coordinates[0] > 120.163, 'label point stays close to the central longitude for near-rectangular polygons');
    t.ok(coordinates[0] < 120.164, 'label point does not drift right of the central area');
    t.ok(coordinates[1] > 30.246 && coordinates[1] < 30.247, 'label point stays close to the central latitude');

    document.body.removeChild(container);
    t.end();
  });
});
