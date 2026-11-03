import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Step4Amenities } from '@/features/publish-housing/ui/Step4Amenities';

const onChange = jest.fn();
const setup = (features: string[] = []) => render(<Step4Amenities data={{ features }} onChange={onChange} />);

describe('Step4Amenities', () => {
  it('muestra las amenidades disponibles', async () => {
    await setup();
    expect(screen.getByText('Áreas comunes y servicios')).toBeTruthy();
    for (const label of ['Gimnasio', 'Piscina', 'Pet friendly', 'Vista panorámica']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('sin selección no muestra el resumen', async () => {
    await setup();
    expect(screen.queryByText(/seleccionada/)).toBeNull();
  });

  it('seleccionar una amenidad la agrega al final de la lista', async () => {
    await setup(['Piscina']);
    await fireEvent.press(screen.getByText('WiFi'));
    expect(onChange).toHaveBeenCalledWith({ features: ['Piscina', 'WiFi'] });
  });

  it('pulsar una amenidad ya elegida la quita sin tocar las demás', async () => {
    await setup(['Piscina', 'WiFi', 'Jardín']);
    await fireEvent.press(screen.getByText('WiFi'));
    expect(onChange).toHaveBeenCalledWith({ features: ['Piscina', 'Jardín'] });
  });

  it('el resumen usa singular con una amenidad', async () => {
    await setup(['Piscina']);
    expect(screen.getByText('1 amenidad seleccionada')).toBeTruthy();
  });

  it('el resumen usa plural con varias amenidades', async () => {
    await setup(['Piscina', 'WiFi']);
    expect(screen.getByText('2 amenidades seleccionadas')).toBeTruthy();
  });
});
