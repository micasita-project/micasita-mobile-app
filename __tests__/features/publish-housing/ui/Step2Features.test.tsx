import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Step2Features } from '@/features/publish-housing/ui/Step2Features';

const onChange = jest.fn();

const data = (over: Record<string, any> = {}) => ({
  title: '',
  property_type: 'Departamento',
  currency: 'PEN',
  price: 0,
  total_area_sqm: 0,
  covered_area_sqm: 0,
  bedrooms: 2,
  bathrooms: 2,
  parking: 1,
  antiquity: 0,
  description: '',
  phone: '',
  ...over,
});

const setup = (over: Record<string, any> = {}) => render(<Step2Features data={data(over)} onChange={onChange} />);
const isDisabled = (el: any) => el.props.accessibilityState?.disabled === true;
// Orden de los contadores en pantalla: habitaciones, baños, estacionamiento.
const plus = (i: number) => screen.getAllByText('+')[i].parent!;
const minus = (i: number) => screen.getAllByText('−')[i].parent!;

describe('Step2Features campos de texto', () => {
  it('escribir el título envía el título y muestra el contador', async () => {
    await setup({ title: 'Casa' });
    expect(screen.getByText('4/80')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej: Departamento Moderno en Surco'), 'Casa linda');
    expect(onChange).toHaveBeenCalledWith({ title: 'Casa linda' });
  });

  it('limita el título a 80 caracteres y la descripción a 1000', async () => {
    await setup();
    expect(screen.getByPlaceholderText('Ej: Departamento Moderno en Surco').props.maxLength).toBe(80);
    expect(
      screen.getByPlaceholderText('Describe las características más destacadas de tu propiedad…').props.maxLength,
    ).toBe(1000);
  });

  it('escribir la descripción la envía y cuenta los caracteres', async () => {
    await setup({ description: 'abc' });
    expect(screen.getByText('3/1000')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Describe las características más destacadas de tu propiedad…'),
      'Muy luminoso',
    );
    expect(onChange).toHaveBeenCalledWith({ description: 'Muy luminoso' });
  });
});

describe('Step2Features tipo de propiedad', () => {
  it('ofrece los tres tipos y envía el elegido', async () => {
    await setup();
    expect(screen.getByText('Departamento')).toBeTruthy();
    expect(screen.getByText('Habitación')).toBeTruthy();
    await fireEvent.press(screen.getByText('Casa'));
    expect(onChange).toHaveBeenCalledWith({ property_type: 'Casa' });
  });
});

describe('Step2Features números', () => {
  it('con precio 0 muestra el campo vacío y con precio lo muestra', async () => {
    const view = await setup();
    expect(screen.getByPlaceholderText('3900').props.value).toBe('');
    await view.rerender(<Step2Features data={data({ price: 3900 })} onChange={onChange} />);
    expect(screen.getByPlaceholderText('3900').props.value).toBe('3900');
  });

  it('muestra la moneda del anuncio', async () => {
    await setup({ currency: 'USD' });
    expect(screen.getByText('USD')).toBeTruthy();
  });

  it('el precio se envía como número y un texto no numérico vale 0', async () => {
    await setup();
    await fireEvent.changeText(screen.getByPlaceholderText('3900'), '2500.5');
    expect(onChange).toHaveBeenLastCalledWith({ price: 2500.5 });
    await fireEvent.changeText(screen.getByPlaceholderText('3900'), 'abc');
    expect(onChange).toHaveBeenLastCalledWith({ price: 0 });
  });

  it('el área total y la cubierta se envían por separado', async () => {
    await setup();
    await fireEvent.changeText(screen.getByPlaceholderText('Total m²'), '120');
    expect(onChange).toHaveBeenLastCalledWith({ total_area_sqm: 120 });
    await fireEvent.changeText(screen.getByPlaceholderText('Cubierta m²'), '90.5');
    expect(onChange).toHaveBeenLastCalledWith({ covered_area_sqm: 90.5 });
  });

  it('la antigüedad se envía como entero y limita a 3 caracteres', async () => {
    await setup();
    const input = screen.getAllByPlaceholderText('0')[0];
    expect(input.props.maxLength).toBe(3);
    await fireEvent.changeText(input, '12');
    expect(onChange).toHaveBeenLastCalledWith({ antiquity: 12 });
    await fireEvent.changeText(input, '12.7');
    expect(onChange).toHaveBeenLastCalledWith({ antiquity: 12 });
    await fireEvent.changeText(input, 'x');
    expect(onChange).toHaveBeenLastCalledWith({ antiquity: 0 });
  });
});

describe('Step2Features contadores', () => {
  it('habitaciones suma y resta de uno en uno', async () => {
    await setup({ bedrooms: 3 });
    await fireEvent.press(plus(0));
    expect(onChange).toHaveBeenLastCalledWith({ bedrooms: 4 });
    await fireEvent.press(minus(0));
    expect(onChange).toHaveBeenLastCalledWith({ bedrooms: 2 });
  });

  it('baños y estacionamiento actúan sobre su propio campo', async () => {
    await setup({ bathrooms: 2, parking: 1 });
    await fireEvent.press(plus(1));
    expect(onChange).toHaveBeenLastCalledWith({ bathrooms: 3 });
    await fireEvent.press(minus(1));
    expect(onChange).toHaveBeenLastCalledWith({ bathrooms: 1 });
    await fireEvent.press(plus(2));
    expect(onChange).toHaveBeenLastCalledWith({ parking: 2 });
    await fireEvent.press(minus(2));
    expect(onChange).toHaveBeenLastCalledWith({ parking: 0 });
  });

  it('habitaciones y baños no bajan de 1: el botón − se deshabilita', async () => {
    await setup({ bedrooms: 1, bathrooms: 1 });
    expect(isDisabled(minus(0))).toBe(true);
    expect(isDisabled(minus(1))).toBe(true);
    await fireEvent.press(minus(0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('el estacionamiento puede llegar a 0 pero no bajar de ahí', async () => {
    const view = await setup({ parking: 0 });
    expect(isDisabled(minus(2))).toBe(true);
    await view.rerender(<Step2Features data={data({ parking: 1 })} onChange={onChange} />);
    expect(isDisabled(minus(2))).toBe(false);
  });

  it('respeta los máximos: 10 habitaciones, 8 baños y 5 estacionamientos', async () => {
    await setup({ bedrooms: 10, bathrooms: 8, parking: 5 });
    expect(isDisabled(plus(0))).toBe(true);
    expect(isDisabled(plus(1))).toBe(true);
    expect(isDisabled(plus(2))).toBe(true);
    await fireEvent.press(plus(0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('por debajo de los máximos los botones + están habilitados', async () => {
    await setup({ bedrooms: 9, bathrooms: 7, parking: 4 });
    expect(isDisabled(plus(0))).toBe(false);
    expect(isDisabled(plus(1))).toBe(false);
    expect(isDisabled(plus(2))).toBe(false);
  });
});

describe('Step2Features teléfono', () => {
  it('quita lo que no son dígitos y recorta a 9', async () => {
    await setup();
    await fireEvent.changeText(screen.getByPlaceholderText('987654321'), '987-654 3210');
    expect(onChange).toHaveBeenCalledWith({ phone: '987654321' });
  });

  it('con menos de 9 dígitos muestra el error y el avance', async () => {
    await setup({ phone: '98765' });
    expect(screen.getByText('Debe tener exactamente 9 dígitos')).toBeTruthy();
    expect(screen.getByText('5/9 dígitos')).toBeTruthy();
  });

  it('sin teléfono no muestra error', async () => {
    await setup({ phone: '' });
    expect(screen.queryByText('Debe tener exactamente 9 dígitos')).toBeNull();
    expect(screen.getByText('0/9 dígitos')).toBeTruthy();
  });

  it('con 9 dígitos no muestra error', async () => {
    await setup({ phone: '987654321' });
    expect(screen.queryByText('Debe tener exactamente 9 dígitos')).toBeNull();
    expect(screen.getByText('9/9 dígitos')).toBeTruthy();
  });

  it('tolera un teléfono ausente', async () => {
    await setup({ phone: undefined });
    expect(screen.getByText('0/9 dígitos')).toBeTruthy();
  });
});
