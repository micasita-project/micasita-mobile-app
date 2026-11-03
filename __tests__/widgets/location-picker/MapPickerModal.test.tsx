import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { MapPickerModal } from '@/widgets/location-picker/MapPickerModal';
import { reverseAddress } from '@/shared/api/geocode.service';
import { LIMA_REGION } from '@/shared/config/map';
import { makeSuggestion } from '@/__tests__/_helpers/features/mockFeatureUi';

jest.mock('@/shared/ui/map', () => require('@/__tests__/_helpers/features/mockFeatureUi').mapModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/shared/api/geocode.service', () => ({ reverseAddress: jest.fn() }));

const reverseMock = reverseAddress as jest.Mock;
const onClose = jest.fn();
const onConfirm = jest.fn();
let alertSpy: jest.SpyInstance;
const RESULT = makeSuggestion({ display_name: 'Calle Mar 5, Barranco', latitude: -12.14, longitude: -77.02 });

beforeEach(() => {
  reverseMock.mockResolvedValue(RESULT);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

const open = (props: Record<string, any> = {}) =>
  render(<MapPickerModal visible onClose={onClose} onConfirm={onConfirm} {...props} />);

const moveMap = (region: Record<string, number>) =>
  act(async () => {
    screen.getByTestId('map').props.onRegionChangeComplete(region);
  });

describe('MapPickerModal presentación', () => {
  it('oculto no pinta el mapa', async () => {
    await open({ visible: false });
    expect(screen.queryByTestId('map')).toBeNull();
  });

  it('muestra el título e instrucción por defecto y las acciones', async () => {
    await open();
    expect(screen.getByText('Seleccionar ubicación')).toBeTruthy();
    expect(screen.getByText('Mueve el mapa para ubicar el punto exacto')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Confirmar ubicación')).toBeTruthy();
  });

  it('acepta un título y una instrucción propios', async () => {
    await open({ title: 'Tu casa', instruction: 'Ubica tu casa' });
    expect(screen.getByText('Tu casa')).toBeTruthy();
    expect(screen.getByText('Ubica tu casa')).toBeTruthy();
    expect(screen.queryByText('Seleccionar ubicación')).toBeNull();
  });

  it('sin región inicial abre el mapa en Lima', async () => {
    await open();
    expect(screen.getByTestId('map').props.initialRegion).toEqual(LIMA_REGION);
  });

  it('con región inicial abre el mapa allí', async () => {
    const region = { latitude: -12.1, longitude: -77.0, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    await open({ initialRegion: region });
    expect(screen.getByTestId('map').props.initialRegion).toEqual(region);
  });
});

describe('MapPickerModal cierre', () => {
  it('Cancelar llama a onClose', async () => {
    await open();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('el botón de cerrar del mapa llama a onClose', async () => {
    await open();
    const root = screen.getByTestId('map').parent!;
    await fireEvent.press(root.children[2] as any);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el gesto de retroceso del sistema llama a onClose', async () => {
    await open();
    const modal = screen.container.queryAll((n) => typeof n.props.onRequestClose === 'function')[0];
    modal.props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('MapPickerModal confirmar', () => {
  it('sin mover el mapa resuelve la dirección del centro de Lima', async () => {
    await open();
    await fireEvent.press(screen.getByText('Confirmar ubicación'));
    expect(reverseMock).toHaveBeenCalledWith(LIMA_REGION.latitude, LIMA_REGION.longitude);
    expect(onConfirm).toHaveBeenCalledWith(RESULT);
  });

  it('sin mover el mapa y con región inicial resuelve esa región', async () => {
    await open({ initialRegion: { latitude: -12.1, longitude: -77.0, latitudeDelta: 0.01, longitudeDelta: 0.01 } });
    await fireEvent.press(screen.getByText('Confirmar ubicación'));
    expect(reverseMock).toHaveBeenCalledWith(-12.1, -77.0);
  });

  it('tras mover el mapa resuelve la dirección del nuevo centro', async () => {
    await open();
    await moveMap({ latitude: -12.2, longitude: -77.1, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    await fireEvent.press(screen.getByText('Confirmar ubicación'));
    expect(reverseMock).toHaveBeenCalledWith(-12.2, -77.1);
    expect(onConfirm).toHaveBeenCalledWith(RESULT);
  });

  it('solo cuenta el último movimiento del mapa', async () => {
    await open();
    await moveMap({ latitude: -12.2, longitude: -77.1, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    await moveMap({ latitude: -12.3, longitude: -77.2, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    await fireEvent.press(screen.getByText('Confirmar ubicación'));
    expect(reverseMock).toHaveBeenCalledTimes(1);
    expect(reverseMock).toHaveBeenCalledWith(-12.3, -77.2);
  });

  it('mientras resuelve oculta el texto, deshabilita el botón y evita una segunda llamada', async () => {
    let release!: (v: any) => void;
    reverseMock.mockReturnValue(new Promise((r) => (release = r)));
    await open();
    let press!: Promise<unknown>;
    await act(async () => {
      press = fireEvent.press(screen.getByText('Confirmar ubicación'));
    });
    expect(screen.queryByText('Confirmar ubicación')).toBeNull();
    const disabled = screen.container.queryAll((n) => n.props.accessibilityState?.disabled === true);
    expect(disabled).toHaveLength(1);
    await fireEvent.press(disabled[0]);
    expect(reverseMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      release(RESULT);
      await press;
    });
    expect(screen.getByText('Confirmar ubicación')).toBeTruthy();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('si falla la resolución avisa, no confirma y vuelve a habilitar el botón', async () => {
    reverseMock.mockRejectedValue(new Error('404'));
    await open();
    await fireEvent.press(screen.getByText('Confirmar ubicación'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'No se pudo obtener la dirección. Intenta mover el mapa y vuelve a intentarlo.',
      [{ text: 'Entendido' }],
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Confirmar ubicación')).toBeTruthy();
  });
});
