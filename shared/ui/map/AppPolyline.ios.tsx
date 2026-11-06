import React from 'react';
import { Polyline } from 'react-native-maps';

interface AppPolylineProps {
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

// Punto fijo para la línea oculta cuando no hay ruta.
const HIDDEN_POINTS = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 0 },
];

/**
 * En iOS (nueva arquitectura) el mapa no retira una línea que se desmonta,
 * así que la línea siempre se monta y, sin ruta, se dibuja invisible.
 */
export function AppPolyline({ coordinates, strokeColor, strokeWidth, lineDashPattern, lineCap, lineJoin }: AppPolylineProps) {
  const hasRoute = coordinates.length >= 2;
  return (
    <Polyline
      coordinates={hasRoute ? coordinates : HIDDEN_POINTS}
      strokeColor={hasRoute ? strokeColor : 'transparent'}
      strokeWidth={hasRoute ? strokeWidth : 0}
      lineDashPattern={lineDashPattern}
      lineCap={lineCap}
      lineJoin={lineJoin}
    />
  );
}
