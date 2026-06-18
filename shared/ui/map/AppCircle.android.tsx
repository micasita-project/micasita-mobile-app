import React, { useRef } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

let _idCounter = 0;

interface AppCircleProps {
  center: { latitude: number; longitude: number };
  radius: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
}

function buildCirclePolygon(lat: number, lon: number, radiusMeters: number): number[][] {
  const points = 64;
  const r = radiusMeters / 1000;
  const latRad = (lat * Math.PI) / 180;
  const coords: number[][] = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dlat = (r / 111.32) * Math.cos(angle);
    const dlon = (r / (111.32 * Math.cos(latRad))) * Math.sin(angle);
    coords.push([lon + dlon, lat + dlat]);
  }
  return coords;
}

export function AppCircle({ center, radius, strokeColor = '#000', fillColor = 'transparent', strokeWidth = 1 }: AppCircleProps) {
  const idRef = useRef(`circle-${++_idCounter}`);
  const sourceId = idRef.current;

  const geojson = {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [buildCirclePolygon(center.latitude, center.longitude, radius)],
    },
    properties: {},
  };

  return (
    <GeoJSONSource id={sourceId} data={geojson}>
      <Layer
        id={`${sourceId}-fill`}
        type="fill"
        paint={{ 'fill-color': fillColor, 'fill-opacity': 1 } as any}
      />
      <Layer
        id={`${sourceId}-outline`}
        type="line"
        paint={{ 'line-color': strokeColor, 'line-width': strokeWidth } as any}
      />
    </GeoJSONSource>
  );
}
