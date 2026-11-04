import React from 'react';

const host = (name: string) =>
  function HostComponent({ children, ...props }: any) {
    return React.createElement(name, props, children);
  };

/** Controles de los mapas simulados: `easeTo` de maplibre y `animateToRegion` de react-native-maps. */
export const mapControls = {
  easeTo: jest.fn(),
  animateToRegion: jest.fn(),
};

/** Sustituto de `@maplibre/maplibre-react-native`. */
export const maplibreModule = {
  LogManager: { onLog: jest.fn() },
  Map: host('MLMap'),
  Camera: React.forwardRef(function Camera({ children, ...props }: any, ref: any) {
    React.useImperativeHandle(ref, () => ({ easeTo: mapControls.easeTo }));
    return React.createElement('MLCamera', props, children);
  }),
  RasterSource: host('MLRasterSource'),
  Layer: host('MLLayer'),
  GeoJSONSource: host('MLGeoJSONSource'),
  Marker: host('MLMarker'),
};

/** Sustituto de `react-native-maps`. */
export const nativeMapsModule = {
  __esModule: true,
  default: React.forwardRef(function MapView({ children, ...props }: any, ref: any) {
    React.useImperativeHandle(ref, () => ({ animateToRegion: mapControls.animateToRegion }));
    return React.createElement('RNMapView', props, children);
  }),
  Marker: host('RNMarker'),
  Polyline: host('RNPolyline'),
  Circle: host('RNCircle'),
  UrlTile: host('RNUrlTile'),
};

// Este archivo vive bajo __tests__; al ejecutarse solo necesita una prueba.
if (expect.getState().testPath?.includes('/_helpers/')) {
  it('auxiliar', () => {});
}
