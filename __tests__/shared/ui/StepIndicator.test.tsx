import React from 'react';
import { render } from '@testing-library/react-native';
import { StepIndicator } from '@/shared/ui/StepIndicator';
import { Colors } from '@/shared/config/colors';
import { flat } from '@/__tests__/_helpers/ui/host';

async function setup(props: { totalSteps: number; currentStep: number; labels?: string[] }) {
  const utils = await render(<StepIndicator {...props} />);
  const circles = utils.root!.queryAll((i) => flat(i).width === 32 && flat(i).height === 32);
  const connectors = utils.root!.queryAll((i) => flat(i).height === 2);
  return { ...utils, circles, connectors };
}

describe('StepIndicator', () => {
  it('dibuja un círculo por paso', async () => {
    const { circles } = await setup({ totalSteps: 4, currentStep: 1 });
    expect(circles).toHaveLength(4);
  });

  it('dibuja un conector entre cada par de pasos', async () => {
    const { connectors } = await setup({ totalSteps: 4, currentStep: 1 });
    expect(connectors).toHaveLength(3);
  });

  it('un solo paso no tiene conectores', async () => {
    const { connectors } = await setup({ totalSteps: 1, currentStep: 1 });
    expect(connectors).toHaveLength(0);
  });

  it('sin pasos no dibuja nada dentro del contenedor', async () => {
    const { circles } = await setup({ totalSteps: 0, currentStep: 1 });
    expect(circles).toHaveLength(0);
  });

  it('numera los pasos pendientes y el activo, y marca con ✓ los completados', async () => {
    const { getByText, queryByText, getAllByText } = await setup({ totalSteps: 4, currentStep: 3 });
    expect(getByText('3')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(queryByText('1')).toBeNull();
    expect(queryByText('2')).toBeNull();
    expect(getAllByText('✓')).toHaveLength(2);
  });

  it('muestra tantos ✓ como pasos completados', async () => {
    const { getAllByText } = await setup({ totalSteps: 5, currentStep: 4 });
    expect(getAllByText('✓')).toHaveLength(3);
  });

  it('en el primer paso no hay ninguno completado', async () => {
    const { queryByText } = await setup({ totalSteps: 3, currentStep: 1 });
    expect(queryByText('✓')).toBeNull();
  });

  it('si el paso actual supera el total, todos quedan completados', async () => {
    const { getAllByText, queryByText } = await setup({ totalSteps: 3, currentStep: 4 });
    expect(getAllByText('✓')).toHaveLength(3);
    expect(queryByText('1')).toBeNull();
  });

  describe('estilos por estado', () => {
    it('el círculo activo usa el color primario', async () => {
      const { circles } = await setup({ totalSteps: 3, currentStep: 2 });
      expect(flat(circles[1])).toMatchObject({
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
      });
    });

    it('el círculo completado usa el color de éxito', async () => {
      const { circles } = await setup({ totalSteps: 3, currentStep: 2 });
      expect(flat(circles[0])).toMatchObject({
        backgroundColor: Colors.success,
        borderColor: Colors.success,
      });
    });

    it('el círculo pendiente conserva el estilo neutro', async () => {
      const { circles } = await setup({ totalSteps: 3, currentStep: 2 });
      expect(flat(circles[2])).toMatchObject({
        backgroundColor: Colors.surfaceElevated,
        borderColor: Colors.border,
      });
    });

    it('el número activo va en el color del texto sobre primario y el pendiente en tono apagado', async () => {
      const { getByText } = await setup({ totalSteps: 3, currentStep: 2 });
      expect(flat(getByText('2')).color).toBe(Colors.textOnPrimary);
      expect(flat(getByText('3')).color).toBe(Colors.textMuted);
    });

    it('un conector se pinta como completado cuando el paso que lo sigue ya está completado', async () => {
      const { connectors } = await setup({ totalSteps: 4, currentStep: 4 });
      expect(connectors.map((c) => flat(c).backgroundColor)).toEqual([
        Colors.success,
        Colors.success,
        Colors.border,
      ]);
    });
  });

  describe('etiquetas', () => {
    const labels = ['Datos', 'Fotos', 'Precio'];

    it('muestra cada etiqueta', async () => {
      const { getByText } = await setup({ totalSteps: 3, currentStep: 1, labels });
      labels.forEach((l) => expect(getByText(l)).toBeTruthy());
    });

    it('no muestra etiquetas si no se pasan', async () => {
      const { queryByText } = await setup({ totalSteps: 3, currentStep: 1 });
      expect(queryByText('Datos')).toBeNull();
    });

    it('omite la etiqueta de un paso sin texto', async () => {
      const { getByText, queryByText } = await setup({
        totalSteps: 3,
        currentStep: 1,
        labels: ['Datos'],
      });
      expect(getByText('Datos')).toBeTruthy();
      expect(queryByText('Fotos')).toBeNull();
    });

    it('colorea la etiqueta activa y la completada y deja neutra la pendiente', async () => {
      const { getByText } = await setup({ totalSteps: 3, currentStep: 2, labels });
      expect(flat(getByText('Datos')).color).toBe(Colors.success);
      expect(flat(getByText('Fotos'))).toMatchObject({ color: Colors.primary, fontWeight: '700' });
      expect(flat(getByText('Precio')).color).toBe(Colors.textMuted);
    });

    it('limita la etiqueta a una línea', async () => {
      const { getByText } = await setup({ totalSteps: 1, currentStep: 1, labels: ['Datos'] });
      expect(getByText('Datos').props.numberOfLines).toBe(1);
    });
  });
});
