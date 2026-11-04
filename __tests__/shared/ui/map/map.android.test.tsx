import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { AppCircle } from '@/shared/ui/map/AppCircle.android';
import { AppMapView, handleMapLog } from '@/shared/ui/map/AppMapView.android';
import { AppMarker } from '@/shared/ui/map/AppMarker.android';
import { AppPolyline } from '@/shared/ui/map/AppPolyline.android';
import { AppUrlTile } from '@/shared/ui/map/AppUrlTile.android';
import type { AppMapViewHandle } from '@/shared/ui/map/types';
import { mapControls } from '@/__tests__/_helpers/ui/mockMaps';
import { allByType } from '@/__tests__/_helpers/ui/host';

const mockTileUrl = 'https://tiles.test/{z}/{x}/{y}.png';
jest.mock('@/shared/config/map', () => ({ OSM_TILE_URL: 'https://tiles.test/{z}/{x}/{y}.png' }));
jest.mock('@maplibre/maplibre-react-native', () => require('@/__tests__/_helpers/ui/mockMaps').maplibreModule);

const one = (root: any, type: string) => allByType(root, type)[0];
const region = { latitude: -12, longitude: -77, latitudeDelta: 0.08, longitudeDelta: 0.08 };

describe('Registros de MapLibre', () => {
  const cancellation = 'Request failed due to a permanent error: stream was reset: CANCEL';

  it('conserva una cancelación HTTP/2 como información', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    expect(handleMapLog({ level: 'warn', tag: 'Mbgl-HttpRequest', message: cancellation })).toBe(true);
    expect(info).toHaveBeenCalledWith(expect.stringContaining(cancellation));
    info.mockRestore();
  });

  it.each([
    { level: 'warn', tag: 'Mbgl-HttpRequest', message: 'Connection timed out' },
    { level: 'error', tag: 'Mbgl-HttpRequest', message: cancellation },
    { level: 'warn', tag: 'Renderer', message: cancellation },
  ])('deja pasar advertencias y errores reales: $level/$tag', (event) => {
    expect(handleMapLog(event)).toBe(false);
  });
});

describe('AppMapView (Android)', () => {
  it('usa un estilo vacío y reenvía el estilo de la vista', async () => {
    const { root } = await render(<AppMapView initialRegion={region} style={{ flex: 1 }} />);
    const map = one(root!, 'MLMap');
    expect(map.props.style).toEqual({ flex: 1 });
    expect(JSON.parse(map.props.mapStyle)).toEqual({ version: 8, sources: {}, layers: [] });
  });

  it('centra la cámara en la región inicial con el zoom equivalente a su delta', async () => {
    const { root } = await render(<AppMapView initialRegion={region} />);
    const { center, zoom } = one(root!, 'MLCamera').props.initialViewState;
    expect(center).toEqual([-77, -12]);
    expect(zoom).toBeCloseTo(Math.log2(180 / 0.08));
  });

  it('un delta menor produce más zoom', async () => {
    const cerca = await render(<AppMapView initialRegion={{ ...region, latitudeDelta: 0.01 }} />);
    const lejos = await render(<AppMapView initialRegion={{ ...region, latitudeDelta: 0.5 }} />);
    expect(one(cerca.root!, 'MLCamera').props.initialViewState.zoom).toBeGreaterThan(
      one(lejos.root!, 'MLCamera').props.initialViewState.zoom,
    );
  });

  it('dibuja la base de OpenStreetMap con la URL configurada', async () => {
    const { root } = await render(<AppMapView initialRegion={region} />);
    const source = one(root!, 'MLRasterSource');
    expect(source.props).toMatchObject({ id: 'osm-base', tiles: [mockTileUrl], tileSize: 256, maxzoom: 19 });
    expect(one(root!, 'MLLayer').props).toMatchObject({ id: 'osm-base-layer', type: 'raster' });
  });

  it('no monta los hijos hasta que el estilo termina de cargar', async () => {
    const { root, queryByText, getByText } = await render(
      <AppMapView initialRegion={region}>
        <Text>marcador</Text>
      </AppMapView>,
    );
    expect(queryByText('marcador')).toBeNull();
    await act(async () => one(root!, 'MLMap').props.onDidFinishLoadingStyle());
    expect(getByText('marcador')).toBeTruthy();
  });

  describe('onRegionChangeComplete', () => {
    const event = (zoom: number) => ({ nativeEvent: { center: [-77.05, -12.1], zoom } });

    it('convierte centro y zoom a una región con delta = 180 / 2^zoom', async () => {
      const cb = jest.fn();
      const { root } = await render(<AppMapView initialRegion={region} onRegionChangeComplete={cb} />);
      one(root!, 'MLMap').props.onRegionDidChange(event(10));
      expect(cb).toHaveBeenCalledTimes(1);
      const arg = cb.mock.calls[0][0];
      expect(arg.latitude).toBe(-12.1);
      expect(arg.longitude).toBe(-77.05);
      expect(arg.latitudeDelta).toBeCloseTo(180 / 1024);
      expect(arg.longitudeDelta).toBeCloseTo(180 / 1024);
    });

    it('ida y vuelta: el zoom de una región produce su mismo delta', async () => {
      const cb = jest.fn();
      const { root } = await render(<AppMapView initialRegion={region} onRegionChangeComplete={cb} />);
      const zoom = one(root!, 'MLCamera').props.initialViewState.zoom;
      one(root!, 'MLMap').props.onRegionDidChange(event(zoom));
      expect(cb.mock.calls[0][0].latitudeDelta).toBeCloseTo(0.08);
    });

    it('sin callback no falla al cambiar la región', async () => {
      const { root } = await render(<AppMapView initialRegion={region} />);
      expect(() => one(root!, 'MLMap').props.onRegionDidChange(event(10))).not.toThrow();
    });
  });

  describe('animateToRegion', () => {
    it('anima la cámara al centro y zoom de la región con 500 ms por defecto', async () => {
      const ref = React.createRef<AppMapViewHandle>();
      await render(<AppMapView ref={ref} initialRegion={region} />);
      ref.current!.animateToRegion({ ...region, latitude: -11, longitude: -76, latitudeDelta: 0.02 });
      expect(mapControls.easeTo).toHaveBeenCalledTimes(1);
      const arg = mapControls.easeTo.mock.calls[0][0];
      expect(arg.center).toEqual([-76, -11]);
      expect(arg.zoom).toBeCloseTo(Math.log2(180 / 0.02));
      expect(arg.duration).toBe(500);
    });

    it('respeta la duración indicada', async () => {
      const ref = React.createRef<AppMapViewHandle>();
      await render(<AppMapView ref={ref} initialRegion={region} />);
      ref.current!.animateToRegion(region, 1500);
      expect(mapControls.easeTo.mock.calls[0][0].duration).toBe(1500);
    });
  });
});

describe('AppMarker (Android)', () => {
  const coord = { latitude: -12.1, longitude: -77.0 };

  it('posiciona el marcador con [longitud, latitud] anclado abajo', async () => {
    const { root } = await render(<AppMarker coordinate={coord} />);
    expect(one(root!, 'MLMarker').props).toMatchObject({ lngLat: [-77.0, -12.1], anchor: 'bottom' });
  });

  it('muestra el contenido recibido en lugar del pin por defecto', async () => {
    const { getByText, root } = await render(
      <AppMarker coordinate={coord}>
        <Text>mi pin</Text>
      </AppMarker>,
    );
    expect(getByText('mi pin')).toBeTruthy();
    expect(one(root!, 'MLMarker').children).toHaveLength(1);
  });

  it('sin hijos dibuja el pin rojo por defecto', async () => {
    const { root } = await render(<AppMarker coordinate={coord} />);
    const pin = one(root!, 'MLMarker').children[0] as any;
    expect(pin.props.style).toMatchObject({ backgroundColor: '#e74c3c', borderColor: '#fff' });
  });

  it('al pulsar llama a onPress sin argumentos', async () => {
    const onPress = jest.fn();
    const { root } = await render(<AppMarker coordinate={coord} onPress={onPress} />);
    one(root!, 'MLMarker').props.onPress({ nativeEvent: {} });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith();
  });

  it('sin onPress no registra manejador', async () => {
    const { root } = await render(<AppMarker coordinate={coord} />);
    expect(one(root!, 'MLMarker').props.onPress).toBeUndefined();
  });

  it('no dibuja nada si falta la latitud o la longitud', async () => {
    const a = await render(<AppMarker coordinate={{ latitude: undefined, longitude: -77 } as any} />);
    expect(a.toJSON()).toBeNull();
    const b = await render(<AppMarker coordinate={{ latitude: -12, longitude: undefined } as any} />);
    expect(b.toJSON()).toBeNull();
    const c = await render(<AppMarker coordinate={undefined as any} />);
    expect(c.toJSON()).toBeNull();
  });

  it('cada marcador recibe un id distinto y estable entre renders', async () => {
    const a = await render(<AppMarker coordinate={coord} />);
    const b = await render(<AppMarker coordinate={coord} />);
    const idA = one(a.root!, 'MLMarker').props.id;
    const idB = one(b.root!, 'MLMarker').props.id;
    expect(idA).not.toBe(idB);
    await a.rerender(<AppMarker coordinate={coord} />);
    expect(one(a.root!, 'MLMarker').props.id).toBe(idA);
  });

  it('dibuja un marcador con latitud 0', async () => {
    const { toJSON } = await render(<AppMarker coordinate={{ latitude: 0, longitude: -77 }} />);
    expect(toJSON()).not.toBeNull();
  });
});

describe('AppPolyline (Android)', () => {
  const line = [
    { latitude: -12.1, longitude: -77.0 },
    { latitude: -12.2, longitude: -77.1 },
  ];
  const source = (root: any) => one(root, 'MLGeoJSONSource');
  const layer = (root: any) => one(root, 'MLLayer');

  it('no dibuja nada con menos de dos puntos', async () => {
    expect((await render(<AppPolyline coordinates={[]} />)).toJSON()).toBeNull();
    expect((await render(<AppPolyline coordinates={[line[0]]} />)).toJSON()).toBeNull();
  });

  it('convierte las coordenadas a un LineString [longitud, latitud]', async () => {
    const { root } = await render(<AppPolyline coordinates={line} />);
    expect(source(root!).props.data).toEqual({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-77.0, -12.1],
          [-77.1, -12.2],
        ],
      },
      properties: {},
    });
  });

  it('usa el estilo por defecto: negro, grosor 3 y extremos redondeados', async () => {
    const { root } = await render(<AppPolyline coordinates={line} />);
    expect(layer(root!).props.type).toBe('line');
    expect(layer(root!).props.paint).toEqual({
      'line-color': '#000',
      'line-width': 3,
      'line-cap': 'round',
      'line-join': 'round',
    });
  });

  it('aplica color, grosor, extremos y uniones personalizados', async () => {
    const { root } = await render(
      <AppPolyline coordinates={line} strokeColor="#2E86C1" strokeWidth={4} lineCap="butt" lineJoin="bevel" />,
    );
    expect(layer(root!).props.paint).toEqual({
      'line-color': '#2E86C1',
      'line-width': 4,
      'line-cap': 'butt',
      'line-join': 'bevel',
    });
  });

  it('añade el patrón de guiones solo cuando se indica', async () => {
    const con = await render(<AppPolyline coordinates={line} lineDashPattern={[10, 5]} />);
    expect(layer(con.root!).props.paint['line-dasharray']).toEqual([10, 5]);
    const sin = await render(<AppPolyline coordinates={line} />);
    expect(layer(sin.root!).props.paint).not.toHaveProperty('line-dasharray');
  });

  it('la capa cuelga de una fuente con id propio y distinto por instancia', async () => {
    const a = await render(<AppPolyline coordinates={line} />);
    const b = await render(<AppPolyline coordinates={line} />);
    const idA = source(a.root!).props.id;
    expect(idA).toMatch(/^polyline-\d+$/);
    expect(layer(a.root!).props.id).toBe(`${idA}-layer`);
    expect(source(b.root!).props.id).not.toBe(idA);
  });

  it('soporta pasar de una línea vacía a una con puntos y viceversa', async () => {
    const { rerender, toJSON } = await render(<AppPolyline coordinates={[]} />);
    expect(toJSON()).toBeNull();
    await rerender(<AppPolyline coordinates={line} />);
    expect(toJSON()).not.toBeNull();
    await rerender(<AppPolyline coordinates={[]} />);
    expect(toJSON()).toBeNull();
  });
});

describe('AppCircle (Android)', () => {
  const center = { latitude: -12, longitude: -77 };
  const source = (root: any) => one(root, 'MLGeoJSONSource');
  const ring = (root: any): number[][] => source(root).props.data.geometry.coordinates[0];

  it('genera un polígono cerrado de 65 puntos', async () => {
    const { root } = await render(<AppCircle center={center} radius={500} />);
    const pts = ring(root!);
    expect(source(root!).props.data.geometry.type).toBe('Polygon');
    expect(pts).toHaveLength(65);
    expect(pts[0][0]).toBeCloseTo(pts[64][0], 9);
    expect(pts[0][1]).toBeCloseTo(pts[64][1], 9);
  });

  it('el primer punto queda al norte del centro a radio/111.32 km de latitud', async () => {
    const { root } = await render(<AppCircle center={center} radius={1000} />);
    const [lon, lat] = ring(root!)[0];
    expect(lon).toBeCloseTo(-77, 9);
    expect(lat).toBeCloseTo(-12 + 1 / 111.32, 9);
  });

  it('a un cuarto de vuelta el punto queda al este corrigiendo por el coseno de la latitud', async () => {
    const { root } = await render(<AppCircle center={center} radius={1000} />);
    const [lon, lat] = ring(root!)[16];
    expect(lat).toBeCloseTo(-12, 9);
    expect(lon).toBeCloseTo(-77 + 1 / (111.32 * Math.cos((-12 * Math.PI) / 180)), 9);
  });

  it('un radio mayor produce un círculo más grande', async () => {
    const chico = await render(<AppCircle center={center} radius={100} />);
    const grande = await render(<AppCircle center={center} radius={1000} />);
    expect(ring(grande.root!)[0][1] - center.latitude).toBeGreaterThan(ring(chico.root!)[0][1] - center.latitude);
  });

  it('dibuja relleno y contorno con el estilo por defecto', async () => {
    const { root } = await render(<AppCircle center={center} radius={500} />);
    const [fill, outline] = allByType(root!, 'MLLayer');
    expect(fill.props.type).toBe('fill');
    expect(fill.props.paint).toEqual({ 'fill-color': 'transparent', 'fill-opacity': 1 });
    expect(outline.props.type).toBe('line');
    expect(outline.props.paint).toEqual({ 'line-color': '#000', 'line-width': 1 });
  });

  it('aplica los colores y el grosor indicados', async () => {
    const { root } = await render(
      <AppCircle center={center} radius={500} strokeColor="#00f" fillColor="#0f08" strokeWidth={3} />,
    );
    const [fill, outline] = allByType(root!, 'MLLayer');
    expect(fill.props.paint['fill-color']).toBe('#0f08');
    expect(outline.props.paint).toEqual({ 'line-color': '#00f', 'line-width': 3 });
  });

  it('las capas cuelgan de una fuente con id propio', async () => {
    const { root } = await render(<AppCircle center={center} radius={500} />);
    const id = source(root!).props.id;
    expect(id).toMatch(/^circle-\d+$/);
    const [fill, outline] = allByType(root!, 'MLLayer');
    expect(fill.props.id).toBe(`${id}-fill`);
    expect(outline.props.id).toBe(`${id}-outline`);
  });

  it('cada círculo tiene un id distinto y estable entre renders', async () => {
    const a = await render(<AppCircle center={center} radius={500} />);
    const b = await render(<AppCircle center={center} radius={500} />);
    const idA = source(a.root!).props.id;
    expect(source(b.root!).props.id).not.toBe(idA);
    await a.rerender(<AppCircle center={center} radius={900} />);
    expect(source(a.root!).props.id).toBe(idA);
  });
});

describe('AppUrlTile (Android)', () => {
  it('no dibuja nada: la base se incluye en AppMapView', async () => {
    const { toJSON } = await render(<AppUrlTile />);
    expect(toJSON()).toBeNull();
  });
});
