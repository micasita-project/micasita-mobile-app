import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Step3Photos } from '@/features/publish-housing/ui/Step3Photos';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const permission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const onChange = jest.fn();
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  permission.mockResolvedValue({ status: 'granted' });
  launch.mockResolvedValue({ canceled: true, assets: [] });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

const uris = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `file:///foto${from + i}.jpg`);
const setup = (localImageUris: string[] = []) => render(<Step3Photos data={{ localImageUris }} onChange={onChange} />);
const assets = (list: string[]) => ({ canceled: false, assets: list.map((uri) => ({ uri })) });
const removeButton = (index: number) => {
  const photos = screen.container.queryAll((n) => n.type === 'Image');
  const wrapper = photos[index].parent!;
  return wrapper.children[wrapper.children.length - 1] as any;
};

describe('Step3Photos presentación', () => {
  it('sin fotos invita a agregarlas y muestra el estado vacío', async () => {
    await setup();
    expect(screen.getByText('Toca para agregar fotos')).toBeTruthy();
    expect(screen.getByText('Agregar fotos aumenta un 70% las consultas de tu anuncio')).toBeTruthy();
    expect(screen.queryByText('Fotos seleccionadas')).toBeNull();
  });

  it('con fotos muestra el contador, la cuadrícula y la insignia solo en la primera', async () => {
    await setup(uris(3));
    expect(screen.getByText('Agregar más fotos (3/5)')).toBeTruthy();
    expect(screen.getByText('Fotos seleccionadas')).toBeTruthy();
    expect(screen.getAllByText('Principal')).toHaveLength(1);
    const wrapper = screen.getByText('Principal').parent!.parent!;
    const image = wrapper.queryAll((n) => n.type === 'Image')[0];
    expect(image.props.source).toEqual({ uri: uris(3)[0] });
    expect(screen.queryByText('Agregar fotos aumenta un 70% las consultas de tu anuncio')).toBeNull();
    const images = screen.container.queryAll((n) => n.type === 'Image');
    expect(images.map((i) => i.props.source)).toEqual(uris(3).map((uri) => ({ uri })));
  });
});

describe('Step3Photos selección', () => {
  it('pide permiso y abre la galería con selección múltiple limitada a lo que falta', async () => {
    await setup(uris(2));
    await fireEvent.press(screen.getByText('Agregar más fotos (2/5)'));
    expect(permission).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.5,
      selectionLimit: 3,
    });
  });

  it('agrega las fotos nuevas detrás de las existentes', async () => {
    launch.mockResolvedValue(assets(uris(2, 3)));
    await setup(uris(2));
    await fireEvent.press(screen.getByText('Agregar más fotos (2/5)'));
    expect(onChange).toHaveBeenCalledWith({ localImageUris: uris(4) });
  });

  it('recorta a un máximo de 5 fotos', async () => {
    launch.mockResolvedValue(assets(uris(4, 3)));
    await setup(uris(2));
    await fireEvent.press(screen.getByText('Agregar más fotos (2/5)'));
    expect(onChange).toHaveBeenCalledWith({ localImageUris: uris(5) });
  });

  it('si el usuario cancela no cambia nada', async () => {
    await setup(uris(1));
    await fireEvent.press(screen.getByText('Agregar más fotos (1/5)'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sin permiso avisa y no abre la galería', async () => {
    permission.mockResolvedValue({ status: 'denied' });
    await setup();
    await fireEvent.press(screen.getByText('Toca para agregar fotos'));
    expect(alertSpy).toHaveBeenCalledWith('Permiso requerido', 'Necesitamos acceso a tu galería para subir fotos.');
    expect(launch).not.toHaveBeenCalled();
  });

  it('con 5 fotos avisa del límite sin pedir permiso', async () => {
    await setup(uris(5));
    await fireEvent.press(screen.getByText('Agregar más fotos (5/5)'));
    expect(alertSpy).toHaveBeenCalledWith('Límite alcanzado', 'Puedes subir máximo 5 fotos.');
    expect(permission).not.toHaveBeenCalled();
    expect(launch).not.toHaveBeenCalled();
  });
});

describe('Step3Photos eliminar', () => {
  it('quitar una foto envía la lista sin ella', async () => {
    await setup(uris(3));
    await fireEvent.press(removeButton(1));
    expect(onChange).toHaveBeenCalledWith({ localImageUris: [uris(3)[0], uris(3)[2]] });
  });

  it('quitar la primera foto deja la siguiente como principal', async () => {
    await setup(uris(2));
    await fireEvent.press(removeButton(0));
    expect(onChange).toHaveBeenCalledWith({ localImageUris: [uris(2)[1]] });
  });
});
