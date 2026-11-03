import React from 'react';
import { render } from '@testing-library/react-native';
import { AppCircle } from '@/shared/ui/map/AppCircle.ios';
import { AppMapView } from '@/shared/ui/map/AppMapView.ios';
import { AppMarker } from '@/shared/ui/map/AppMarker.ios';
import { AppPolyline } from '@/shared/ui/map/AppPolyline.ios';
import { AppUrlTile } from '@/shared/ui/map/AppUrlTile.ios';
import type { AppMapViewHandle } from '@/shared/ui/map/types';
import { mapControls } from '@/__tests__/_helpers/ui/mockMaps';
import { allByType } from '@/__tests__/_helpers/ui/host';
import { Text } from 'react-native';

jest.mock('react-native-maps', () => require('@/__tests__/_helpers/ui/mockMaps').nativeMapsModule);

const region = { latitude: -12.04, longitude: -77.04, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const coord = { latitude: -12.1, longitude: -77.0 };
const one = (root: any, type: string) => allByType(root, type)[0];

describe('AppMapView (iOS)', () => {
  it('reenvía las props de configuración al mapa nativo', async () => {
    const onRegionChangeComplete = jest.fn();
    const { root } = await render(
      <AppMapView
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        toolbarEnabled={false}
        style={{ flex: 1 }}
      />,
    );
    expect(one(root!, 'RNMapView').props).toMatchObject({
      initialRegion: region,
      onRegionChangeComplete,
      mapType: 'standard',
      showsUserLocation: true,
      showsMyLocationButton: false,
      showsCompass: true,
      toolbarEnabled: false,
      style: { flex: 1 },
    });
  });

  it('muestra los hijos dentro del mapa', async () => {
    const { getByText } = await render(
      <AppMapView initialRegion={region}>
        <Text>hijo</Text>
      </AppMapView>,
    );
    expect(getByText('hijo')).toBeTruthy();
  });

  it('animateToRegion delega en el mapa con 500 ms por defecto', async () => {
    const ref = React.createRef<AppMapViewHandle>();
    await render(<AppMapView ref={ref} initialRegion={region} />);
    ref.current!.animateToRegion(region);
    expect(mapControls.animateToRegion).toHaveBeenCalledWith(region, 500);
  });

  it('animateToRegion respeta la duración indicada', async () => {
    const ref = React.createRef<AppMapViewHandle>();
    await render(<AppMapView ref={ref} initialRegion={region} />);
    ref.current!.animateToRegion(region, 1200);
    expect(mapControls.animateToRegion).toHaveBeenCalledWith(region, 1200);
  });
});

describe('AppMarker (iOS)', () => {
  it('pasa coordenada, título y seguimiento de vistas al marcador nativo', async () => {
    const onPress = jest.fn();
    const { root } = await render(
      <AppMarker coordinate={coord} onPress={onPress} title="Casa" tracksViewChanges={false}>
        <Text>pin</Text>
      </AppMarker>,
    );
    expect(one(root!, 'RNMarker').props).toMatchObject({
      coordinate: coord,
      onPress,
      title: 'Casa',
      tracksViewChanges: false,
    });
  });

  it('muestra el contenido personalizado', async () => {
    const { getByText } = await render(
      <AppMarker coordinate={coord}>
        <Text>pin</Text>
      </AppMarker>,
    );
    expect(getByText('pin')).toBeTruthy();
  });
});

describe('AppPolyline (iOS)', () => {
  const line = [coord, { latitude: -12.2, longitude: -77.1 }];

  it('no dibuja nada con menos de dos puntos', async () => {
    const vacio = await render(<AppPolyline coordinates={[]} />);
    expect(vacio.toJSON()).toBeNull();
    const uno = await render(<AppPolyline coordinates={[coord]} />);
    expect(uno.toJSON()).toBeNull();
  });

  it('dibuja la línea con su estilo', async () => {
    const { root } = await render(
      <AppPolyline
        coordinates={line}
        strokeColor="#f00"
        strokeWidth={5}
        lineDashPattern={[10, 5]}
        lineCap="square"
        lineJoin="bevel"
      />,
    );
    expect(one(root!, 'RNPolyline').props).toMatchObject({
      coordinates: line,
      strokeColor: '#f00',
      strokeWidth: 5,
      lineDashPattern: [10, 5],
      lineCap: 'square',
      lineJoin: 'bevel',
    });
  });

  it('dos puntos bastan para dibujar', async () => {
    const { root } = await render(<AppPolyline coordinates={line} />);
    expect(one(root!, 'RNPolyline')).toBeTruthy();
  });
});

describe('AppCircle (iOS)', () => {
  it('pasa centro, radio y estilo al círculo nativo', async () => {
    const { root } = await render(
      <AppCircle center={coord} radius={300} strokeColor="#00f" fillColor="#0f08" strokeWidth={2} />,
    );
    expect(one(root!, 'RNCircle').props).toMatchObject({
      center: coord,
      radius: 300,
      strokeColor: '#00f',
      fillColor: '#0f08',
      strokeWidth: 2,
    });
  });
});

describe('AppUrlTile (iOS)', () => {
  it('pasa la plantilla, el zoom máximo y el tamaño de tesela', async () => {
    const { root } = await render(
      <AppUrlTile urlTemplate="https://t/{z}/{x}/{y}.png" maximumZ={19} tileSize={256} />,
    );
    expect(one(root!, 'RNUrlTile').props).toMatchObject({
      urlTemplate: 'https://t/{z}/{x}/{y}.png',
      maximumZ: 19,
      tileSize: 256,
    });
  });
});
