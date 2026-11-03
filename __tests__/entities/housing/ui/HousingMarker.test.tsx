import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { HousingMarker } from '@/entities/housing/ui/HousingMarker';
import { formatPrice } from '@/shared/utils/currency';
import { Colors } from '@/shared/config/colors';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';
import { makeHousing } from '@/__tests__/_helpers/ui/fixtures';
import { allByType, flat } from '@/__tests__/_helpers/ui/host';

jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/ui/mockIcons'));
jest.mock('@/shared/ui/map', () => {
  const React = require('react');
  return {
    AppMarker: ({ children, ...props }: any) => React.createElement('AppMarker', props, children),
  };
});

const marker = (root: any) => allByType(root, 'AppMarker')[0];

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('HousingMarker', () => {
  it('muestra el precio formateado', async () => {
    const { getByText } = await render(<HousingMarker housing={makeHousing({ price: 1800, currency: 'PEN' })} />);
    expect(getByText(formatPrice(1800, 'PEN'))).toBeTruthy();
  });

  it('muestra el precio en dólares', async () => {
    const { getByText } = await render(<HousingMarker housing={makeHousing({ price: 700, currency: 'USD' })} />);
    expect(getByText(formatPrice(700, 'USD'))).toBeTruthy();
  });

  it('se ubica en la coordenada de la vivienda', async () => {
    const { root } = await render(<HousingMarker housing={makeHousing({ latitude: -12.5, longitude: -77.5 })} />);
    expect(marker(root!).props.coordinate).toEqual({ latitude: -12.5, longitude: -77.5 });
  });

  it('displayCoordinate cambia solo dónde se dibuja el pin', async () => {
    const onPress = jest.fn();
    const h = makeHousing({ latitude: -12.5, longitude: -77.5 });
    const { root } = await render(
      <HousingMarker housing={h} onPress={onPress} displayCoordinate={{ latitude: -12.6, longitude: -77.6 }} />,
    );
    expect(marker(root!).props.coordinate).toEqual({ latitude: -12.6, longitude: -77.6 });
    await act(async () => marker(root!).props.onPress());
    expect(onPress).toHaveBeenCalledWith(h);
    expect(onPress.mock.calls[0][0].latitude).toBe(-12.5);
  });

  it('al pulsar llama a onPress con la vivienda', async () => {
    const onPress = jest.fn();
    const h = makeHousing();
    const { root } = await render(<HousingMarker housing={h} onPress={onPress} />);
    await act(async () => marker(root!).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(h);
  });

  it('pulsar sin onPress no falla', async () => {
    const { root } = await render(<HousingMarker housing={makeHousing()} />);
    await expect(act(async () => marker(root!).props.onPress())).resolves.not.toThrow();
  });

  describe('selección', () => {
    const bubble = (root: any) => root.queryAll((i: any) => flat(i).borderRadius === 20)[0];
    const arrow = (root: any) => root.queryAll((i: any) => flat(i).borderTopWidth === 8)[0];

    it('sin seleccionar usa fondo claro, borde primario e icono primario', async () => {
      const { root, getByTestId, getByText } = await render(<HousingMarker housing={makeHousing()} />);
      expect(flat(bubble(root!))).toMatchObject({ backgroundColor: Colors.surface, borderColor: Colors.primary });
      expect(getByTestId('icon-home-outline').props.color).toBe(Colors.primary);
      expect(flat(getByText(/S\//)).color).toBe(Colors.primary);
      expect(flat(arrow(root!)).borderTopColor).toBe(Colors.primary);
    });

    it('seleccionado resalta burbuja, icono, precio y flecha', async () => {
      const { root, getByTestId, getByText } = await render(
        <HousingMarker housing={makeHousing()} isSelected />,
      );
      expect(flat(bubble(root!))).toMatchObject({
        backgroundColor: Colors.primary,
        borderColor: Colors.primaryDark,
      });
      expect(getByTestId('icon-home-outline').props.color).toBe(Colors.textOnPrimary);
      expect(flat(getByText(/S\//)).color).toBe(Colors.textOnPrimary);
      expect(flat(arrow(root!)).borderTopColor).toBe(Colors.primaryDark);
    });
  });

  describe('recomendado', () => {
    it('sin modo prioritario no muestra la insignia', async () => {
      const { queryByText } = await render(<HousingMarker housing={makeHousing()} />);
      expect(queryByText('Recomendado')).toBeNull();
    });

    it.each([
      ['driving', 'car', TRANSPORT_MODE_COLORS.driving],
      ['cycling', 'bicycle', TRANSPORT_MODE_COLORS.cycling],
      ['walking', 'walk', TRANSPORT_MODE_COLORS.walking],
    ] as const)('con %s muestra la insignia con su icono y color', async (mode, icon, color) => {
      const { getByText, getByTestId, root } = await render(
        <HousingMarker housing={makeHousing()} priorityRecommendedMode={mode} />,
      );
      expect(getByText('Recomendado')).toBeTruthy();
      expect(getByTestId(`icon-${icon}`)).toBeTruthy();
      const badge = root!.queryAll((i: any) => flat(i).borderRadius === 12 && flat(i).backgroundColor === color);
      expect(badge).toHaveLength(1);
    });

    it('colorea el borde de la burbuja y la flecha con el color del modo', async () => {
      const { root } = await render(
        <HousingMarker housing={makeHousing()} priorityRecommendedMode="walking" />,
      );
      const bubble = root!.queryAll((i: any) => flat(i).borderRadius === 20)[0];
      expect(flat(bubble)).toMatchObject({
        borderColor: TRANSPORT_MODE_COLORS.walking,
        borderWidth: 2.5,
      });
      const arrow = root!.queryAll((i: any) => flat(i).borderTopWidth === 8)[0];
      expect(flat(arrow).borderTopColor).toBe(TRANSPORT_MODE_COLORS.walking);
    });

    it('seleccionado conserva la flecha del estado seleccionado aunque sea recomendado', async () => {
      const { root } = await render(
        <HousingMarker housing={makeHousing()} priorityRecommendedMode="driving" isSelected />,
      );
      const arrow = root!.queryAll((i: any) => flat(i).borderTopWidth === 8)[0];
      expect(flat(arrow).borderTopColor).toBe(Colors.primaryDark);
    });
  });

  describe('seguimiento de vistas (tracksViewChanges)', () => {
    it('empieza activo hasta que se mide el diseño', async () => {
      const { root } = await render(<HousingMarker housing={makeHousing()} />);
      expect(marker(root!).props.tracksViewChanges).toBe(true);
    });

    it('se desactiva al terminar el diseño', async () => {
      const { root } = await render(<HousingMarker housing={makeHousing()} />);
      const container = marker(root!).children[0];
      await act(async () => container.props.onLayout());
      expect(marker(root!).props.tracksViewChanges).toBe(false);
    });

    it('se desactiva solo a los 200 ms aunque no haya diseño', async () => {
      const { root } = await render(<HousingMarker housing={makeHousing()} />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(199);
      });
      expect(marker(root!).props.tracksViewChanges).toBe(true);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(marker(root!).props.tracksViewChanges).toBe(false);
    });

    it('al cambiar la selección vuelve a activarse y se apaga a los 200 ms', async () => {
      const h = makeHousing();
      const { root, rerender } = await render(<HousingMarker housing={h} isSelected={false} />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });
      expect(marker(root!).props.tracksViewChanges).toBe(false);
      await rerender(<HousingMarker housing={h} isSelected />);
      expect(marker(root!).props.tracksViewChanges).toBe(true);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });
      expect(marker(root!).props.tracksViewChanges).toBe(false);
    });

    it('cambiar otras props no reactiva el seguimiento', async () => {
      const h = makeHousing();
      const { root, rerender } = await render(<HousingMarker housing={h} />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });
      await rerender(<HousingMarker housing={{ ...h, price: 3000 }} />);
      expect(marker(root!).props.tracksViewChanges).toBe(false);
    });
  });
});
