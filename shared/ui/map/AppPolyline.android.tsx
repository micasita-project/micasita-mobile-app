import React, { useRef } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

let _idCounter = 0;

interface AppPolylineProps {
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
  lineCap?: string;
  lineJoin?: string;
}

export function AppPolyline({ coordinates, strokeColor = '#000', strokeWidth = 3, lineDashPattern, lineCap = 'round', lineJoin = 'round' }: AppPolylineProps) {
  if (coordinates.length < 2) return null;

  const idRef = useRef(`polyline-${++_idCounter}`);
  const sourceId = idRef.current;
  const layerId = `${sourceId}-layer`;

  const geojson = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: coordinates.map(c => [c.longitude, c.latitude]),
    },
    properties: {},
  };

  const paint: Record<string, unknown> = {
    'line-color': strokeColor,
    'line-width': strokeWidth,
    'line-cap': lineCap,
    'line-join': lineJoin,
  };
  if (lineDashPattern) paint['line-dasharray'] = lineDashPattern;

  return (
    <GeoJSONSource id={sourceId} data={geojson}>
      <Layer id={layerId} type="line" paint={paint as any} />
    </GeoJSONSource>
  );
}
