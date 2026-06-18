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

export function AppPolyline({ coordinates, strokeColor, strokeWidth, lineDashPattern, lineCap, lineJoin }: AppPolylineProps) {
  if (coordinates.length < 2) return null;
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={strokeColor}
      strokeWidth={strokeWidth}
      lineDashPattern={lineDashPattern}
      lineCap={lineCap}
      lineJoin={lineJoin}
    />
  );
}
