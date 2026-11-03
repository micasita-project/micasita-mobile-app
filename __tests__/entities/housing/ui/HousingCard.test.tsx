import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { HousingCard } from '@/entities/housing/ui/HousingCard';
import { formatPrice } from '@/shared/utils/currency';
import { Colors } from '@/shared/config/colors';
import { makeHousing } from '@/__tests__/_helpers/ui/fixtures';
import { allByType } from '@/__tests__/_helpers/ui/host';

jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/ui/mockIcons'));

const press = (el: any) => act(async () => fireEvent.press(el));
const image = (root: any) => allByType(root, 'Image')[0];

describe('HousingCard variante completa', () => {
  it('muestra título, distrito, tipo y precio mensual', async () => {
    const h = makeHousing({ price: 2500, currency: 'PEN' });
    const { getByText } = await render(<HousingCard housing={h} />);
    expect(getByText(h.title)).toBeTruthy();
    expect(getByText('Miraflores')).toBeTruthy();
    expect(getByText('Departamento')).toBeTruthy();
    expect(getByText(formatPrice(2500, 'PEN'))).toBeTruthy();
    expect(getByText('/mes')).toBeTruthy();
  });

  it('muestra el precio en dólares cuando la moneda es USD', async () => {
    const { getByText } = await render(<HousingCard housing={makeHousing({ price: 900, currency: 'USD' })} />);
    expect(getByText(formatPrice(900, 'USD'))).toBeTruthy();
    expect(getByText(/^USD /)).toBeTruthy();
  });

  it('muestra habitaciones, baños y área', async () => {
    const { getByText } = await render(
      <HousingCard housing={makeHousing({ bedrooms: 3, bathrooms: 2, total_area_sqm: 120 })} />,
    );
    expect(getByText('3 hab.')).toBeTruthy();
    expect(getByText('2 baños')).toBeTruthy();
    expect(getByText('120 m²')).toBeTruthy();
  });

  it('usa singular con un solo baño', async () => {
    const { getByText, queryByText } = await render(<HousingCard housing={makeHousing({ bathrooms: 1 })} />);
    expect(getByText('1 baño')).toBeTruthy();
    expect(queryByText('1 baños')).toBeNull();
  });

  it('usa la primera imagen de la vivienda', async () => {
    const { root } = await render(<HousingCard housing={makeHousing()} />);
    expect(image(root!).props.source).toEqual({ uri: 'https://img.test/1.jpg' });
    expect(image(root!).props.resizeMode).toBe('cover');
  });

  it('sin imágenes no hay fuente de imagen', async () => {
    const { root } = await render(<HousingCard housing={makeHousing({ images: [] })} />);
    expect(image(root!).props.source).toBeUndefined();
  });

  it('al pulsar la tarjeta llama a onPress con la vivienda', async () => {
    const onPress = jest.fn();
    const h = makeHousing();
    const { getByText } = await render(<HousingCard housing={h} onPress={onPress} />);
    await press(getByText(h.title));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(h);
  });

  it('pulsar sin onPress no falla', async () => {
    const { getByText } = await render(<HousingCard housing={makeHousing()} />);
    await expect(press(getByText('Miraflores'))).resolves.not.toThrow();
  });

  describe('favorito', () => {
    it('sin marcar muestra el corazón vacío y gris', async () => {
      const { getByTestId, queryByTestId } = await render(
        <HousingCard housing={makeHousing({ isFavorite: false })} />,
      );
      expect(getByTestId('icon-heart-outline').props.color).toBe(Colors.textSecondary);
      expect(queryByTestId('icon-heart')).toBeNull();
    });

    it('marcado muestra el corazón lleno y rojo', async () => {
      const { getByTestId, queryByTestId } = await render(
        <HousingCard housing={makeHousing({ isFavorite: true })} />,
      );
      expect(getByTestId('icon-heart').props.color).toBe(Colors.error);
      expect(queryByTestId('icon-heart-outline')).toBeNull();
    });

    it('sin dato de favorito se trata como no favorito', async () => {
      const { getByTestId } = await render(<HousingCard housing={makeHousing({ isFavorite: undefined })} />);
      expect(getByTestId('icon-heart-outline')).toBeTruthy();
    });

    it('pulsarlo pide marcar la vivienda y no abre el detalle', async () => {
      const onFavoriteToggle = jest.fn();
      const onPress = jest.fn();
      const h = makeHousing({ id: 'h-9', isFavorite: false });
      const { getByTestId } = await render(
        <HousingCard housing={h} onPress={onPress} onFavoriteToggle={onFavoriteToggle} />,
      );
      await press(getByTestId('icon-heart-outline'));
      expect(onFavoriteToggle).toHaveBeenCalledWith('h-9', true);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('pulsarlo estando marcado pide desmarcar', async () => {
      const onFavoriteToggle = jest.fn();
      const { getByTestId } = await render(
        <HousingCard housing={makeHousing({ id: 'h-9', isFavorite: true })} onFavoriteToggle={onFavoriteToggle} />,
      );
      await press(getByTestId('icon-heart'));
      expect(onFavoriteToggle).toHaveBeenCalledWith('h-9', false);
    });

    it('pulsarlo sin callback no falla', async () => {
      const { getByTestId } = await render(<HousingCard housing={makeHousing()} />);
      await expect(press(getByTestId('icon-heart-outline'))).resolves.not.toThrow();
    });
  });
});

describe('HousingCard variante compacta', () => {
  const compact = (h = makeHousing(), extra: Partial<React.ComponentProps<typeof HousingCard>> = {}) =>
    render(<HousingCard housing={h} variant="compact" {...extra} />);

  it('muestra título, distrito, tipo y precio mensual', async () => {
    const h = makeHousing();
    const { getByText } = await compact(h);
    expect(getByText(h.title)).toBeTruthy();
    expect(getByText('Miraflores')).toBeTruthy();
    expect(getByText('Departamento')).toBeTruthy();
    expect(getByText(formatPrice(2500, 'PEN'), { exact: false })).toBeTruthy();
    expect(getByText('/mes')).toBeTruthy();
  });

  it('muestra habitaciones, baños y área en formato corto', async () => {
    const { getByText, queryByText } = await compact(
      makeHousing({ bedrooms: 4, bathrooms: 3, total_area_sqm: 70 }),
    );
    expect(getByText('4')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('70m²')).toBeTruthy();
    expect(queryByText('4 hab.')).toBeNull();
  });

  it('usa la primera imagen', async () => {
    const { root } = await compact();
    expect(image(root!).props.source).toEqual({ uri: 'https://img.test/1.jpg' });
  });

  it('al pulsar llama a onPress con la vivienda', async () => {
    const onPress = jest.fn();
    const h = makeHousing();
    const { getByText } = await compact(h, { onPress });
    await press(getByText(h.title));
    expect(onPress).toHaveBeenCalledWith(h);
  });

  it('el favorito alterna el estado sin abrir el detalle', async () => {
    const onFavoriteToggle = jest.fn();
    const onPress = jest.fn();
    const { getByTestId } = await compact(makeHousing({ id: 'h-3', isFavorite: false }), {
      onFavoriteToggle,
      onPress,
    });
    await press(getByTestId('icon-heart-outline'));
    expect(onFavoriteToggle).toHaveBeenCalledWith('h-3', true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('el corazón marcado es rojo y el no marcado, apagado', async () => {
    const a = await compact(makeHousing({ isFavorite: true }));
    expect(a.getByTestId('icon-heart').props.color).toBe(Colors.error);
    const b = await compact(makeHousing({ isFavorite: false }));
    expect(b.getByTestId('icon-heart-outline').props.color).toBe(Colors.textMuted);
  });

  it('no usa el diseño completo (sin etiquetas "hab." ni insignia superior)', async () => {
    const { queryByText } = await compact();
    expect(queryByText(/hab\./)).toBeNull();
  });
});
