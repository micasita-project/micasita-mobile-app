/**
 * @layer entities/route/ui
 * @description Polilínea de ruta renderizada sobre el mapa.
 */

import React from 'react';
import type { Coordinate } from '@/shared/types';
import { Colors } from '@/shared/config/colors';
import { ROUTE_POLYLINE_WIDTH } from '@/shared/config/map';
import { AppPolyline } from '@/shared/ui/map';

interface RoutePolylineProps {
  coordinates: Coordinate[];
  color?: string;
  width?: number;
  dashed?: boolean;
}

export function RoutePolyline({
  coordinates,
  color = Colors.routePolyline,
  width = ROUTE_POLYLINE_WIDTH,
  dashed = false,
}: RoutePolylineProps) {
  return (
    <AppPolyline
      coordinates={coordinates}
      strokeColor={color}
      strokeWidth={width}
      lineDashPattern={dashed ? [10, 5] : undefined}
      lineCap="round"
      lineJoin="round"
    />
  );
}
