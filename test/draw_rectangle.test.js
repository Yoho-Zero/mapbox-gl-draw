import test from 'tape';
import MapboxDraw from '../index';
import createMap from './utils/create_map';
import click from './utils/mouse_click';
import makeMouseEvent from './utils/make_mouse_event';
import setupAfterNextRender from './utils/after_next_render';
import * as Constants from '../src/constants';

test('draw_rectangle creates a rectangle polygon from two corner clicks', (t) => {
  const map = createMap();
  const Draw = new MapboxDraw();
  map.addControl(Draw);
  const afterNextRender = setupAfterNextRender(map);

  Draw.changeMode(Constants.modes.DRAW_RECTANGLE);
  click(map, makeMouseEvent(0, 0));
  map.fire('mousemove', makeMouseEvent(10, 20));
  click(map, makeMouseEvent(10, 20));

  afterNextRender(() => {
    const feature = Draw.getAll().features[0];
    t.equal(Draw.getMode(), Constants.modes.SIMPLE_SELECT, 'returns to simple_select after creating the rectangle');
    t.equal(feature.geometry.type, Constants.geojsonTypes.POLYGON, 'creates a polygon');
    t.equal(feature.properties[Constants.properties.SHAPE], Constants.types.RECTANGLE, 'marks the polygon as a rectangle');
    t.deepEqual(feature.geometry.coordinates, [[
      [0, 0],
      [10, 0],
      [10, 20],
      [0, 20],
      [0, 0]
    ]], 'creates the expected rectangle coordinates');
    t.end();
  });
});
