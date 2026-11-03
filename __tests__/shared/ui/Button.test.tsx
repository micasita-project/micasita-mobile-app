import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Button } from '@/shared/ui/Button';
import { Colors } from '@/shared/config/colors';
import { flat, allByType } from '@/__tests__/_helpers/ui/host';


describe('Button', () => {
  it('muestra el título', async () => {
    const { getByText } = await render(<Button title="Continuar" onPress={() => {}} />);
    expect(getByText('Continuar')).toBeTruthy();
  });

  it('llama a onPress al pulsar', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Continuar" onPress={onPress} />);
    await act(async () => {
      fireEvent.press(getByText('Continuar'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama a onPress cuando está deshabilitado', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Continuar" onPress={onPress} disabled />);
    await act(async () => {
      fireEvent.press(getByText('Continuar'));
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('atenúa el botón al deshabilitarlo', async () => {
    const { root } = await render(<Button title="Continuar" onPress={() => {}} disabled />);
    expect(flat(root!).opacity).toBe(0.5);
  });

  it('no atenúa el botón habilitado', async () => {
    const { root } = await render(<Button title="Continuar" onPress={() => {}} />);
    expect(flat(root!).opacity).not.toBe(0.5);
  });

  describe('estado de carga', () => {
    it('oculta el título y muestra el indicador', async () => {
      const { queryByText, root } = await render(
        <Button title="Guardar" onPress={() => {}} loading />,
      );
      expect(queryByText('Guardar')).toBeNull();
      expect(allByType(root!, 'ActivityIndicator')).toHaveLength(1);
    });

    it('no llama a onPress mientras carga', async () => {
      const onPress = jest.fn();
      const { root } = await render(<Button title="Guardar" onPress={onPress} loading />);
      await act(async () => {
        fireEvent.press(root!);
      });
      expect(onPress).not.toHaveBeenCalled();
    });

    it('queda atenuado mientras carga', async () => {
      const { root } = await render(<Button title="Guardar" onPress={() => {}} loading />);
      expect(flat(root!).opacity).toBe(0.5);
    });

    it('el indicador es claro en primary y del color primario en outline y ghost', async () => {
      const colorOf = async (variant: any) => {
        const { root } = await render(
          <Button title="x" onPress={() => {}} loading variant={variant} />,
        );
        return allByType(root!, 'ActivityIndicator')[0].props.color;
      };
      expect(await colorOf('primary')).toBe(Colors.textOnPrimary);
      expect(await colorOf('secondary')).toBe(Colors.textOnPrimary);
      expect(await colorOf('outline')).toBe(Colors.primary);
      expect(await colorOf('ghost')).toBe(Colors.primary);
    });

    it('no pinta el icono mientras carga', async () => {
      const { queryByTestId } = await render(
        <Button title="x" onPress={() => {}} loading icon={<Text testID="mi-icono">i</Text>} />,
      );
      expect(queryByTestId('mi-icono')).toBeNull();
    });
  });

  it('muestra el icono junto al título', async () => {
    const { getByTestId, getByText } = await render(
      <Button title="x" onPress={() => {}} icon={<Text testID="mi-icono">i</Text>} />,
    );
    expect(getByTestId('mi-icono')).toBeTruthy();
    expect(getByText('x')).toBeTruthy();
  });

  describe('variantes', () => {
    it.each([
      ['primary', Colors.primary, Colors.textOnPrimary],
      ['secondary', Colors.primaryLight, Colors.textOnPrimary],
      ['outline', 'transparent', Colors.primary],
      ['ghost', 'transparent', Colors.primary],
    ] as const)('%s usa fondo y texto propios', async (variant, bg, color) => {
      const { root, getByText } = await render(
        <Button title="x" onPress={() => {}} variant={variant} />,
      );
      expect(flat(root!).backgroundColor).toBe(bg);
      expect(flat(getByText('x')).color).toBe(color);
    });

    it('outline lleva borde del color primario', async () => {
      const { root } = await render(<Button title="x" onPress={() => {}} variant="outline" />);
      expect(flat(root!)).toMatchObject({ borderWidth: 2, borderColor: Colors.primary });
    });

    it('usa primary por defecto', async () => {
      const { root } = await render(<Button title="x" onPress={() => {}} />);
      expect(flat(root!).backgroundColor).toBe(Colors.primary);
    });
  });

  describe('tamaños', () => {
    it.each([
      ['small', 8, 13],
      ['medium', 14, 15],
      ['large', 18, 17],
    ] as const)('%s ajusta relleno y tamaño de letra', async (size, padV, fontSize) => {
      const { root, getByText } = await render(
        <Button title="x" onPress={() => {}} size={size} />,
      );
      expect(flat(root!).paddingVertical).toBe(padV);
      expect(flat(getByText('x')).fontSize).toBe(fontSize);
    });

    it('usa medium por defecto', async () => {
      const { getByText } = await render(<Button title="x" onPress={() => {}} />);
      expect(flat(getByText('x')).fontSize).toBe(15);
    });
  });

  it('aplica style y textStyle del llamador por encima de los propios', async () => {
    const { root, getByText } = await render(
      <Button
        title="x"
        onPress={() => {}}
        style={{ backgroundColor: 'red' }}
        textStyle={{ color: 'blue' }}
      />,
    );
    expect(flat(root!).backgroundColor).toBe('red');
    expect(flat(getByText('x')).color).toBe('blue');
  });
});
