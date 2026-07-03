/* eslint no-shadow:[0] */
import test from 'tape';
import MapboxDraw from '../index';
import modes from '../src/modes/index';
import styleWithSourcesFixture from './fixtures/style_with_sources.json';
import createMap from './utils/create_map';

test('Options test', (t) => {
  t.test('no options', (t) => {
    const Draw = new MapboxDraw();
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      touchEnabled: true,
      keybindings: true,
      clickBuffer: 2,
      touchBuffer: 25,
      vertexSnapping: true,
      vertexSnappingDistance: 10,
      displayControlsDefault: true,
      boxSelect: true,
      beforeId: undefined,
      userProperties: false,
      styles: Draw.options.styles,
      referenceStyles: Draw.options.referenceStyles,
      referenceLabelStyles: Draw.options.referenceLabelStyles,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        rectangle: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      }
    };
    t.deepEquals(defaultOptions, Draw.options);
    t.deepEquals(styleWithSourcesFixture, Draw.options.styles);
    t.deepEquals(Draw.options.referenceStyles[0].paint['fill-color'], ['coalesce', ['get', 'color'], '#6b7280']);
    t.deepEquals(Draw.options.referenceStyles[1].paint['line-color'], ['coalesce', ['get', 'color'], '#6b7280']);
    t.deepEquals(Draw.options.referenceStyles[3].paint['circle-color'], ['coalesce', ['get', 'color'], '#6b7280']);
    t.deepEquals(Draw.options.referenceLabelStyles[0].layout['text-field'], ['get', 'name']);
    t.deepEquals(Draw.options.referenceLabelStyles[0].paint['text-color'], ['coalesce', ['get', 'color'], '#111827']);
    t.end();
  });

  t.test('use custom clickBuffer', (t) => {
    const Draw = new MapboxDraw({ clickBuffer: 10 });
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      clickBuffer: 10,
      touchBuffer: 25,
      vertexSnapping: true,
      vertexSnappingDistance: 10,
      boxSelect: true,
      displayControlsDefault: true,
      beforeId: undefined,
      styles: Draw.options.styles,
      referenceStyles: Draw.options.referenceStyles,
      referenceLabelStyles: Draw.options.referenceLabelStyles,
      userProperties: false,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        rectangle: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      }
    };

    t.deepEquals(defaultOptions, Draw.options);
    t.end();
  });

  t.test('hide all controls', (t) => {
    const Draw = new MapboxDraw({displayControlsDefault: false});
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      clickBuffer: 2,
      touchBuffer: 25,
      vertexSnapping: true,
      vertexSnappingDistance: 10,
      boxSelect: true,
      displayControlsDefault: false,
      beforeId: undefined,
      userProperties: false,
      styles: Draw.options.styles,
      referenceStyles: Draw.options.referenceStyles,
      referenceLabelStyles: Draw.options.referenceLabelStyles,
      controls: {
        point: false,
        line_string: false,
        polygon: false,
        rectangle: false,
        trash: false,
        combine_features: false,
        uncombine_features: false
      }
    };
    t.deepEquals(defaultOptions, Draw.options);
    t.end();
  });

  t.test('hide controls but show point', (t) => {
    const Draw = new MapboxDraw({displayControlsDefault: false, controls: {point:true}});
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      displayControlsDefault: false,
      clickBuffer: 2,
      touchBuffer: 25,
      vertexSnapping: true,
      vertexSnappingDistance: 10,
      boxSelect: true,
      beforeId: undefined,
      userProperties: false,
      styles: Draw.options.styles,
      referenceStyles: Draw.options.referenceStyles,
      referenceLabelStyles: Draw.options.referenceLabelStyles,
      controls: {
        point: true,
        line_string: false,
        polygon: false,
        rectangle: false,
        trash: false,
        combine_features: false,
        uncombine_features: false
      }
    };

    t.deepEquals(defaultOptions, Draw.options);
    t.end();
  });

  t.test('hide only point control', (t) => {
    const Draw = new MapboxDraw({ controls: {point:false}});
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      displayControlsDefault: true,
      touchBuffer: 25,
      clickBuffer: 2,
      vertexSnapping: true,
      vertexSnappingDistance: 10,
      userProperties: false,
      boxSelect: true,
      beforeId: undefined,
      styles: Draw.options.styles,
      referenceStyles: Draw.options.referenceStyles,
      referenceLabelStyles: Draw.options.referenceLabelStyles,
      controls: {
        point: false,
        line_string: true,
        polygon: true,
        rectangle: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      }
    };

    t.deepEquals(defaultOptions, Draw.options);
    t.end();
  });

  t.test('disable touch interaction', (t) => {
    const Draw = new MapboxDraw({ touchEnabled: false });
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      touchEnabled: false,
      keybindings: true,
      clickBuffer: 2,
      touchBuffer: 25,
      vertexSnapping: true,
      vertexSnappingDistance: 10,
      displayControlsDefault: true,
      userProperties: false,
      boxSelect: true,
      beforeId: undefined,
      styles: Draw.options.styles,
      referenceStyles: Draw.options.referenceStyles,
      referenceLabelStyles: Draw.options.referenceLabelStyles,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        rectangle: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      }
    };
    t.deepEquals(defaultOptions, Draw.options);
    t.deepEquals(styleWithSourcesFixture, Draw.options.styles);
    t.end();
  });

  t.test('custom styles', (t) => {
    const Draw = new MapboxDraw({styles: [{
      'id': 'custom-polygon',
      'type': 'fill',
      'filter': ['all', ['==', '$type', 'Polygon']],
      'paint': {
        'fill-color': '#fff'
      }
    }, {
      'id': 'custom-point',
      'type': 'circle',
      'filter': ['all', ['==', '$type', 'Point']],
      'paint': {
        'circle-color': '#fff'
      }
    }]});

    const styles = [
      {
        'id': 'custom-polygon.cold',
        'source': 'mapbox-gl-draw-cold',
        'type': 'fill',
        'filter': ['all', ['==', '$type', 'Polygon']],
        'paint': {
          'fill-color': '#fff'
        }
      },
      {
        'id': 'custom-point.cold',
        'source': 'mapbox-gl-draw-cold',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point']],
        'paint': {
          'circle-color': '#fff'
        }
      },
      {
        'id': 'custom-polygon.hot',
        'source': 'mapbox-gl-draw-hot',
        'type': 'fill',
        'filter': ['all', ['==', '$type', 'Polygon']],
        'paint': {
          'fill-color': '#fff'
        }
      },
      {
        'id': 'custom-point.hot',
        'source': 'mapbox-gl-draw-hot',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point']],
        'paint': {
          'circle-color': '#fff'
        }
      }
    ];

    t.deepEquals(styles, Draw.options.styles);
    t.end();
  });

  t.test('use beforeId', (t) => {
    const map = createMap();
    const Draw = new MapboxDraw({ beforeId: 'target-layer' });
    map.addControl(Draw);

    const expectedLayerCount = Draw.options.styles.length +
      Draw.options.referenceStyles.length +
      Draw.options.referenceLabelStyles.length;

    t.equals(Draw.options.beforeId, 'target-layer');
    t.equals(map.addLayerCalls.length, expectedLayerCount, 'adds all Draw-managed layers');
    t.ok(map.addLayerCalls.every(call => call.beforeId === 'target-layer'), 'passes beforeId to every Draw-managed layer');
    t.end();
  });

});
