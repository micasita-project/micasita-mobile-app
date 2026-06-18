import React from 'react';
import { Circle } from 'react-native-maps';

interface AppCircleProps {
  center: { latitude: number; longitude: number };
  radius: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
}

export function AppCircle({ center, radius, strokeColor, fillColor, strokeWidth }: AppCircleProps) {
  return (
    <Circle
      center={center}
      radius={radius}
      strokeColor={strokeColor}
      fillColor={fillColor}
      strokeWidth={strokeWidth}
    />
  );
}
