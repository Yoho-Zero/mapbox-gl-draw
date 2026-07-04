import test from 'tape';
import MapboxDraw from '../index';
import createMap from './utils/create_map';
import makeMouseEvent from './utils/make_mouse_event';
import setupAfterNextRender from './utils/after_next_render';
import * as Constants from '../src/constants';
import { distance } from '../src/lib/geodesy';

function nearlyEqual(a, b, tolerance = 1e-9) {
  return Math.abs(a - b) <= tolerance;
}

function getRenderedFeatures(map) {
  return map.sources[Constants.sources.COLD].data.features.concat(map.sources[Constants.sources.HOT].data.features);
}

test('draw_circle creates a geodesic circle from center drag', (t) => {
  const map = createMap();
  const Draw = new MapboxDraw();
  map.addControl(Draw);
  const afterNextRender = setupAfterNextRender(map);

  Draw.changeMode(Constants.modes.DRAW_CIRCLE);
  map.fire('mousedown', makeMouseEvent(0, 0));
  map.fire('mousemove', makeMouseEvent(10, 0, { buttons: 1 }));
  map.fire('mouseup', makeMouseEvent(10, 0));

  afterNextRender(() => {
    const feature = Draw.getAll().features[0];
    const expectedRadius = distance([0, 0], [10, 0]);
    const renderedCircle = getRenderedFeatures(map).find(rendered => rendered.properties.id === feature.id);
    const vertexPoints = getRenderedFeatures(map).filter(rendered => rendered.properties.parent === feature.id);

    t.equal(Draw.getMode(), Constants.modes.SIMPLE_SELECT, 'returns to simple_select after creating the circle');
    t.equal(feature.geometry.type, Constants.geojsonTypes.POLYGON, 'creates a polygon');
    t.equal(feature.properties[Constants.properties.CIRCLE_RADIUS] > 0, true, 'stores a circle radius');
    t.equal(nearlyEqual(feature.properties[Constants.properties.CIRCLE_RADIUS], expectedRadius), true, 'stores the geodesic radius in kilometers');
    t.deepEqual(feature.geometry.coordinates, [[
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0]
    ]], 'stores the circle as a center-based polygon');
    t.equal(renderedCircle.geometry.coordinates[0].length, 129, 'renders a 128 segment geodesic circle');
    t.equal(vertexPoints.length, 2, 'renders center and radius handles while selected');
    t.end();
  });
});
