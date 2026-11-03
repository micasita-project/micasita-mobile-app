import React from 'react';
import { render } from '@testing-library/react-native';
import { RoutePolyline } from '@/entities/route/ui/RoutePolyline';
import { Colors } from '@/shared/config/colors';
import { ROUTE_POLYLINE_WIDTH } from '@/shared/config/map';
import { allByType } from '@/__tests__/_helpers/ui/host';

jest.mock('@/shared/ui/map', () => {
  const React = require('react');
  return { AppPolyline: (props: any) => React.createElement('AppPolyline', props) };
});

const line = [
  { latitude: -12.1, longitude: -77.0 },
  { latitude: -12.2, longitude: -77.1 },
];
const polyline = (root: any) => allByType(root, 'AppPolyline')[0];

describe('RoutePolyline', () => {
  it('pasa las coordenadas recibidas', async () => {
    const { root } = await render(<RoutePolyline coordinates={line} />);
    expect(polyline(root!).props.coordinates).toBe(line);
  });

  it('usa el color y el grosor de ruta por defecto', async () => {
    const { root } = await render(<RoutePolyline coordinates={line} />);
    expect(polyline(root!).props.strokeColor).toBe(Colors.routePolyline);
    expect(polyline(root!).props.strokeWidth).toBe(ROUTE_POLYLINE_WIDTH);
  });

  it('acepta color y grosor propios', async () => {
    const { root } = await render(<RoutePolyline coordinates={line} color="#ff0000" width={9} />);
    expect(polyline(root!).props.strokeColor).toBe('#ff0000');
    expect(polyline(root!).props.strokeWidth).toBe(9);
  });

  it('es continua por defecto', async () => {
    const { root } = await render(<RoutePolyline coordinates={line} />);
    expect(polyline(root!).props.lineDashPattern).toBeUndefined();
  });

  it('dashed activa el patrón 10-5', async () => {
    const { root } = await render(<RoutePolyline coordinates={line} dashed />);
    expect(polyline(root!).props.lineDashPattern).toEqual([10, 5]);
  });

  it('redondea extremos y uniones', async () => {
    const { root } = await render(<RoutePolyline coordinates={line} />);
    expect(polyline(root!).props.lineCap).toBe('round');
    expect(polyline(root!).props.lineJoin).toBe('round');
  });
});
