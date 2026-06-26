import test from 'tape';
import MapboxDraw from '../index';
import createMap from './utils/create_map';
import mouseClick from './utils/mouse_click';
import makeMouseEvent from './utils/make_mouse_event';
import setupAfterNextRender from './utils/after_next_render';
import * as Constants from '../src/constants';

function createDraw(vertexSnappingDistance = 5) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const map = createMap({ container });
  const Draw = new MapboxDraw({
    vertexSnapping: true,
    vertexSnappingDistance
  });
  map.addControl(Draw);

  return {
    container,
    map,
    Draw,
    cleanUp() {
      document.body.removeChild(container);
    }
  };
}

test('vertex snapping - draw_line_string snaps new vertices to nearby existing vertices', (t) => {
  const { map, Draw, cleanUp } = createDraw();
  Draw.add({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [10, 10]
    }
  });

  Draw.changeMode(Constants.modes.DRAW_LINE_STRING);
  mouseClick(map, makeMouseEvent(12, 12));

  const line = Draw.getAll().features.find(feature => feature.geometry.type === 'LineString');
  t.deepEqual(line.geometry.coordinates, [[10, 10], [10, 10]], 'line starts at the snapped vertex');

  cleanUp();
  t.end();
});

test('vertex snapping - draw_polygon snaps new vertices to nearby existing vertices', (t) => {
  const { map, Draw, cleanUp } = createDraw();
  Draw.add({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [10, 10]
    }
  });

  Draw.changeMode(Constants.modes.DRAW_POLYGON);
  mouseClick(map, makeMouseEvent(12, 12));

  const polygon = Draw.getAll().features.find(feature => feature.geometry.type === 'Polygon');
  t.deepEqual(polygon.geometry.coordinates[0][0], [10, 10], 'polygon starts at the snapped vertex');

  cleanUp();
  t.end();
});

test('vertex snapping - direct_select snaps dragged vertices to nearby existing vertices', (t) => {
  const { map, Draw, cleanUp } = createDraw();
  const [lineId] = Draw.add({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [[0, 0], [0, 20]]
    }
  });
  Draw.add({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [[10, 10], [20, 20]]
    }
  });

  const afterNextRender = setupAfterNextRender(map);
  Draw.changeMode(Constants.modes.DIRECT_SELECT, { featureId: lineId });

  afterNextRender(() => {
    mouseClick(map, makeMouseEvent(0, 0));
    map.fire('mousedown', makeMouseEvent(0, 0));
    map.fire('mousemove', makeMouseEvent(12, 12, { buttons: 1 }));
    map.fire('mouseup', makeMouseEvent(12, 12));

    t.deepEqual(Draw.get(lineId).geometry.coordinates[0], [10, 10], 'dragged vertex snaps to the existing vertex');

    cleanUp();
    t.end();
  });
});
