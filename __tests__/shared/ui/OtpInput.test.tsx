import React, { useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { OtpInput, normalizeOtp } from '@/shared/ui/OtpInput';

/** OtpInput es controlado: el arnés guarda el estado real para ver cómo se reparten los dígitos. */
function Harness({
  length = 6,
  onComplete,
  initial = '',
}: {
  length?: number;
  onComplete?: (v: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <OtpInput length={length} value={value} onChange={setValue} onComplete={onComplete} autoFocus={false} />
  );
}

async function setup(props?: { length?: number; onComplete?: (v: string) => void; initial?: string }) {
  const utils = await render(<Harness {...props} />);
  const digits = () => utils.getAllByTestId('otp-digit').map((d) => d.props.children);
  const input = () => utils.getByTestId('otp-input');
  return { ...utils, digits, input };
}

// Lo que escribe o pega el usuario llega entero a onChangeText del único campo.
async function enter(input: () => any, text: string) {
  await act(async () => {
    fireEvent.changeText(input(), text);
  });
}

describe('OtpInput rendering', () => {
  it('muestra `length` casillas (6 por defecto)', async () => {
    const { getAllByTestId } = await setup();
    expect(getAllByTestId('otp-box')).toHaveLength(6);
  });

  it('muestra un número personalizado de casillas', async () => {
    const { getAllByTestId } = await setup({ length: 4 });
    expect(getAllByTestId('otp-box')).toHaveLength(4);
  });

  it('empieza con todas las casillas vacías', async () => {
    const { digits } = await setup();
    expect(digits()).toEqual(['', '', '', '', '', '']);
  });

  it('oculta el texto sin hacer intocable el campo nativo en iOS', async () => {
    const { input } = await setup({ initial: '528301' });
    const style = Object.assign({}, ...[input().props.style].flat());
    expect(style.opacity ?? 1).toBeGreaterThanOrEqual(0.01);
    expect(style.color).toBe('transparent');
    expect(input().props.caretHidden).toBe(true);
  });

  it('usa el teclado numérico', async () => {
    const { input } = await setup();
    expect(input().props.keyboardType).toBe('number-pad');
  });
});

describe('OtpInput escritura', () => {
  it('reparte cada dígito en su casilla', async () => {
    const { input, digits } = await setup();
    await enter(input, '1');
    await enter(input, '12');
    await enter(input, '123');
    expect(digits()).toEqual(['1', '2', '3', '', '', '']);
  });

  it('ignora los caracteres que no son dígitos', async () => {
    const { input, digits } = await setup();
    await enter(input, 'a');
    expect(digits()).toEqual(['', '', '', '', '', '']);
  });

  it('llama a onComplete al llenar la última casilla', async () => {
    const onComplete = jest.fn();
    const { input } = await setup({ length: 4, onComplete });
    await enter(input, '123');
    expect(onComplete).not.toHaveBeenCalled();
    await enter(input, '1234');
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('no vuelve a llamar a onComplete si el código completo no cambió', async () => {
    const onComplete = jest.fn();
    const { input } = await setup({ initial: '528301', onComplete });
    await enter(input, '528301');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('borrar quita el último dígito', async () => {
    const { input, digits } = await setup({ initial: '123' });
    await enter(input, '12');
    expect(digits()).toEqual(['1', '2', '', '', '', '']);
  });

  it('borrar todo vacía las casillas', async () => {
    const { input, digits } = await setup({ initial: '12' });
    await enter(input, '');
    expect(digits()).toEqual(['', '', '', '', '', '']);
  });
});

describe('OtpInput pegado', () => {
  it('reparte un código completo entre todas las casillas', async () => {
    const { input, digits } = await setup();
    await enter(input, '528301');
    expect(digits()).toEqual(['5', '2', '8', '3', '0', '1']);
  });

  it('llama a onComplete tras pegar el código completo', async () => {
    const onComplete = jest.fn();
    const { input } = await setup({ onComplete });
    await enter(input, '528301');
    expect(onComplete).toHaveBeenCalledWith('528301');
  });

  it('quita espacios y guiones al pegar', async () => {
    const { input, digits } = await setup();
    await enter(input, '528 301');
    expect(digits()).toEqual(['5', '2', '8', '3', '0', '1']);
    await enter(input, '528-301');
    expect(digits()).toEqual(['5', '2', '8', '3', '0', '1']);
  });

  it('recorta un pegado más largo que las casillas', async () => {
    const onComplete = jest.fn();
    const { input, digits } = await setup({ onComplete });
    await enter(input, '52830199');
    expect(digits()).toEqual(['5', '2', '8', '3', '0', '1']);
    expect(onComplete).toHaveBeenCalledWith('528301');
  });

  it('un pegado parcial llena las primeras casillas sin completar', async () => {
    const onComplete = jest.fn();
    const { input, digits } = await setup({ onComplete });
    await enter(input, '528');
    expect(digits()).toEqual(['5', '2', '8', '', '', '']);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('pegar el código completo detrás de un dígito ya escrito lo reemplaza', async () => {
    const { input, digits } = await setup({ initial: '5' });
    // El campo conserva el "5" y añade lo pegado.
    await enter(input, '5528301');
    expect(digits()).toEqual(['5', '2', '8', '3', '0', '1']);
  });

  it('pegar un código distinto detrás de dígitos escritos usa solo el pegado', async () => {
    const { input, digits } = await setup({ initial: '12' });
    await enter(input, '12987654');
    expect(digits()).toEqual(['9', '8', '7', '6', '5', '4']);
  });

  it('pegar sobre una selección completa sustituye todo el código', async () => {
    const { input, digits } = await setup({ initial: '111111' });
    await enter(input, '528301');
    expect(digits()).toEqual(['5', '2', '8', '3', '0', '1']);
  });
});

describe('normalizeOtp', () => {
  it('deja solo dígitos y recorta a la longitud', () => {
    expect(normalizeOtp('a1b2c3', '', 6)).toBe('123');
    expect(normalizeOtp('1234567', '', 6)).toBe('123456');
  });

  it('con prefijo ya escrito, un añadido más corto que el código se conserva', () => {
    expect(normalizeOtp('1234', '123', 6)).toBe('1234');
  });
});
