import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AdminPropertyCard } from '@/features/admin/ui/AdminPropertyCard';
import { formatPrice } from '@/shared/utils/currency';
import { Colors } from '@/shared/config/colors';
import { makeHousing } from '@/__tests__/_helpers/ui/fixtures';
import { allByType, flat } from '@/__tests__/_helpers/ui/host';

jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/ui/mockIcons'));

type Property = React.ComponentProps<typeof AdminPropertyCard>['property'];

const prop = (over: Partial<Property> = {}): Property => ({
  ...makeHousing(),
  status: 'pending',
  publisher_id: 42,
  ...over,
});

async function setup(over: Partial<Property> = {}) {
  const onApprove = jest.fn();
  const onReject = jest.fn();
  const onPress = jest.fn();
  const property = prop(over);
  const utils = await render(
    <AdminPropertyCard property={property} onApprove={onApprove} onReject={onReject} onPress={onPress} />,
  );
  const press = (el: any) => act(async () => fireEvent.press(el));
  return { ...utils, property, onApprove, onReject, onPress, press };
}

describe('AdminPropertyCard contenido', () => {
  it('muestra título, distrito, tipo y precio mensual', async () => {
    const { getByText, property } = await setup({ price: 3200, currency: 'PEN' });
    expect(getByText(property.title)).toBeTruthy();
    expect(getByText('Miraflores')).toBeTruthy();
    expect(getByText('Departamento')).toBeTruthy();
    expect(getByText(formatPrice(3200, 'PEN'))).toBeTruthy();
    expect(getByText('/mes')).toBeTruthy();
  });

  it('muestra la primera foto', async () => {
    const { root, queryByText } = await setup();
    expect(allByType(root!, 'Image')[0].props.source).toEqual({ uri: 'https://img.test/1.jpg' });
    expect(queryByText('Sin fotos')).toBeNull();
  });

  it('sin fotos muestra el marcador "Sin fotos" y ninguna imagen', async () => {
    const { getByText, root, getByTestId } = await setup({ images: [] });
    expect(getByText('Sin fotos')).toBeTruthy();
    expect(getByTestId('icon-image-outline')).toBeTruthy();
    expect(allByType(root!, 'Image')).toHaveLength(0);
  });

  it('con images indefinido también muestra "Sin fotos"', async () => {
    const { getByText } = await setup({ images: undefined as any });
    expect(getByText('Sin fotos')).toBeTruthy();
  });

  it('muestra el publicador', async () => {
    const { getByText } = await setup({ publisher_id: 77 });
    expect(getByText('Publicador #77')).toBeTruthy();
  });

  it('muestra el teléfono con prefijo +51 cuando existe', async () => {
    const { getByText, getByTestId } = await setup({ phone: '987654321' });
    expect(getByText('+51 987654321')).toBeTruthy();
    expect(getByTestId('icon-call-outline')).toBeTruthy();
  });

  it('sin teléfono no muestra la línea de contacto', async () => {
    const { queryByText, queryByTestId } = await setup({ phone: undefined });
    expect(queryByText(/\+51/)).toBeNull();
    expect(queryByTestId('icon-call-outline')).toBeNull();
  });

  describe('estadísticas', () => {
    it('muestra habitaciones, baños y área', async () => {
      const { getByText } = await setup({ bedrooms: 3, bathrooms: 2, total_area_sqm: 90 });
      expect(getByText('3 hab.')).toBeTruthy();
      expect(getByText('2 baños')).toBeTruthy();
      expect(getByText('90 m²')).toBeTruthy();
    });

    it('un baño va en singular', async () => {
      const { getByText, queryByText } = await setup({ bathrooms: 1 });
      expect(getByText('1 baño')).toBeTruthy();
      expect(queryByText('1 baños')).toBeNull();
    });

    it('cero baños va en plural', async () => {
      const { getByText } = await setup({ bathrooms: 0 });
      expect(getByText('0 baños')).toBeTruthy();
    });

    it('un valor 0 sí se muestra (solo se omiten null o undefined)', async () => {
      const { getByText } = await setup({ bedrooms: 0, total_area_sqm: 0 });
      expect(getByText('0 hab.')).toBeTruthy();
      expect(getByText('0 m²')).toBeTruthy();
    });

    it('omite cada estadística ausente', async () => {
      const { queryByText } = await setup({
        bedrooms: null as any,
        bathrooms: undefined as any,
        total_area_sqm: null as any,
      });
      expect(queryByText(/hab\./)).toBeNull();
      expect(queryByText(/baño/)).toBeNull();
      expect(queryByText(/m²/)).toBeNull();
    });
  });
});

describe('AdminPropertyCard acciones', () => {
  it('Aprobar llama a onApprove con el id y no a onReject ni onPress', async () => {
    const { getByText, press, onApprove, onReject, onPress } = await setup({ id: 'p-7' });
    await press(getByText('Aprobar'));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith('p-7');
    expect(onReject).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('Rechazar llama a onReject con el id y no a onApprove ni onPress', async () => {
    const { getByText, press, onApprove, onReject, onPress } = await setup({ id: 'p-7' });
    await press(getByText('Rechazar'));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith('p-7');
    expect(onApprove).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('pulsar la tarjeta abre el detalle con la propiedad', async () => {
    const { getByText, press, onPress, onApprove, onReject, property } = await setup();
    await press(getByText(property.title));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0][0]).toBe(property);
    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it('el botón Rechazar usa el color de error y el Aprobar el de texto sobre primario', async () => {
    const { getByText } = await setup();
    expect(flat(getByText('Rechazar')).color).toBe(Colors.error);
    expect(flat(getByText('Aprobar')).color).toBe(Colors.textOnPrimary);
  });
});
