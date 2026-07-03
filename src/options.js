import xtend from 'xtend';
import * as Constants from './constants';

import styles from './lib/theme';
import modes from './modes/index';

const defaultOptions = {
  defaultMode: Constants.modes.SIMPLE_SELECT,
  keybindings: true,
  touchEnabled: true,
  clickBuffer: 2,
  touchBuffer: 25,
  vertexSnapping: true,
  vertexSnappingDistance: 10,
  boxSelect: true,
  displayControlsDefault: true,
  beforeId: undefined,
  styles,
  referenceStyles: [
    {
      'id': 'gl-draw-reference-polygon-fill',
      'type': 'fill',
      'filter': ['all', ['==', '$type', 'Polygon']],
      'paint': {
        'fill-color': ['coalesce', ['get', 'color'], '#6b7280'],
        'fill-opacity': 0.2
      }
    },
    {
      'id': 'gl-draw-reference-polygon-stroke',
      'type': 'line',
      'filter': ['all', ['==', '$type', 'Polygon']],
      'layout': {
        'line-cap': 'round',
        'line-join': 'round'
      },
      'paint': {
        'line-color': ['coalesce', ['get', 'color'], '#6b7280'],
        'line-width': 1,
        'line-dasharray': [2, 2]
      }
    },
    {
      'id': 'gl-draw-reference-line',
      'type': 'line',
      'filter': ['all', ['==', '$type', 'LineString']],
      'layout': {
        'line-cap': 'round',
        'line-join': 'round'
      },
      'paint': {
        'line-color': ['coalesce', ['get', 'color'], '#6b7280'],
        'line-width': 1,
        'line-dasharray': [2, 2]
      }
    },
    {
      'id': 'gl-draw-reference-point',
      'type': 'circle',
      'filter': ['all', ['==', '$type', 'Point']],
      'paint': {
        'circle-radius': 4,
        'circle-color': ['coalesce', ['get', 'color'], '#6b7280'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1
      }
    }
  ],
  referenceLabelStyles: [
    {
      'id': 'gl-draw-reference-label',
      'type': 'symbol',
      'filter': ['all', ['==', '$type', 'Point']],
      'layout': {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      'paint': {
        'text-color': ['coalesce', ['get', 'color'], '#111827'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
      }
    }
  ],
  modes,
  controls: {},
  userProperties: false
};

const showControls = {
  point: true,
  line_string: true,
  polygon: true,
  rectangle: true,
  trash: true,
  combine_features: true,
  uncombine_features: true
};

const hideControls = {
  point: false,
  line_string: false,
  polygon: false,
  rectangle: false,
  trash: false,
  combine_features: false,
  uncombine_features: false
};

function addSources(styles, sourceBucket) {
  return styles.map((style) => {
    if (style.source) return style;
    let source = Constants.sources.COLD;
    if (sourceBucket === 'hot') source = Constants.sources.HOT;
    else if (sourceBucket === 'reference') source = Constants.sources.REFERENCE;
    else if (sourceBucket === 'reference-label') source = Constants.sources.REFERENCE_LABEL;
    return xtend(style, {
      id: `${style.id}.${sourceBucket}`,
      source
    });
  });
}

export default function(options = {}) {
  let withDefaults = xtend(options);

  if (!options.controls) {
    withDefaults.controls = {};
  }

  if (options.displayControlsDefault === false) {
    withDefaults.controls = xtend(hideControls, options.controls);
  } else {
    withDefaults.controls = xtend(showControls, options.controls);
  }

  withDefaults = xtend(defaultOptions, withDefaults);

  // Layers with a shared source should be adjacent for performance reasons
  withDefaults.styles = addSources(withDefaults.styles, 'cold').concat(addSources(withDefaults.styles, 'hot'));
  withDefaults.referenceStyles = addSources(withDefaults.referenceStyles, 'reference');
  withDefaults.referenceLabelStyles = addSources(withDefaults.referenceLabelStyles, 'reference-label');

  return withDefaults;
}
