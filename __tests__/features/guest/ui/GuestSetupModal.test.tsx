import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { GuestSetupModal } from '@/features/guest/ui/GuestSetupModal';
import { LIMA_LOCATION_ERROR } from '@/shared/utils/geo';
import { makeSuggestion, setNextSuggestion, resetNextSuggestion } from '@/__tests__/_helpers/features/mockFeatureUi';

const mockGuest: any = {
  guestHome: null,
  guestWorkplace: null,
  setGuestHome: jest.fn(),
  setGuestWorkplace: jest.fn(),
  saveGuestRecommendations: jest.fn(),
};
const mockMutation = { mutateAsync: jest.fn() };

jest.mock('@/shared/ui/BottomSheet', () => require('@/__tests__/_helpers/features/mockFeatureUi').bottomSheetModule);
jest.mock('@/shared/ui/SheetTextInput', () => require('@/__tests__/_helpers/features/mockFeatureUi').sheetTextInputModule);
jest.mock('@/shared/ui/AddressSearchInput', () => require('@/__tests__/_helpers/features/mockFeatureUi').addressSearchModule);
jest.mock('@/widgets/location-picker/MapPickerModal', () => require('@/__tests__/_helpers/features/mockFeatureUi').mapPickerModule);
jest.mock('@react-native-community/slider', () => require('@/__tests__/_helpers/features/mockFeatureUi').sliderModule);
jest.mock('../../../../features/guest/model/GuestContext', () => ({ useGuest: () => mockGuest }));
jest.mock('@/features/recommendation/model/useRecommendations', () => ({
  useGuestRecommendations: (onResult?: (r: any) => any) => ({
    // Igual que el hook real: guarda el resultado antes de terminar la generación.
    mutateAsync: async (v: any) => {
      const r = await mockMutation.mutateAsync(v);
      await onResult?.(r);
      return r;
    },
  }),
}));

let alertSpy: jest.SpyInstance;
const onClose = jest.fn();

const HOME = makeSuggestion({ display_name: 'Jr. Lima 123, Miraflores, Lima', latitude: -12.12, longitude: -77.03 });
const WORK = makeSuggestion({ display_name: 'Av. Javier Prado 1234, San Isidro, Lima', latitude: -12.09, longitude: -77.02 });

beforeEach(() => {
  mockGuest.guestHome = null;
  mockGuest.guestWorkplace = null;
  mockGuest.setGuestHome.mockResolvedValue(undefined);
  mockGuest.setGuestWorkplace.mockResolvedValue(undefined);
  mockGuest.saveGuestRecommendations.mockResolvedValue(undefined);
  mockMutation.mutateAsync.mockResolvedValue({ items: ['r1'] });
  resetNextSuggestion();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

const subtitle = (n: number, title: string) => `Paso ${n} de 3 — ${title}`;
const isDisabled = (el: any) => el.props.accessibilityState?.disabled === true;
const nextButton = () => screen.getByText('Siguiente').parent!;

async function open(visible = true) {
  return render(<GuestSetupModal visible={visible} onClose={onClose} />);
}

async function pick(s: Record<string, any>) {
  setNextSuggestion(s);
  await fireEvent.press(screen.getByTestId('address-pick'));
}

async function toStep2() {
  await pick(HOME);
  await fireEvent.press(screen.getByText('Siguiente'));
}

async function toStep3() {
  await toStep2();
  await pick(WORK);
  await fireEvent.press(screen.getByText('Siguiente'));
}

describe('GuestSetupModal visibilidad y paso 1', () => {
  it('no pinta nada si no está visible', async () => {
    await open(false);
    expect(screen.queryByText('Configura tu búsqueda')).toBeNull();
  });

  it('empieza en el paso 1 con su título y sin botón Atrás', async () => {
    await open();
    expect(screen.getByText('Configura tu búsqueda')).toBeTruthy();
    expect(screen.getByText(subtitle(1, 'Tu vivienda actual'))).toBeTruthy();
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('Siguiente está deshabilitado hasta elegir una vivienda', async () => {
    await open();
    expect(isDisabled(nextButton())).toBe(true);
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(screen.getByText(subtitle(1, 'Tu vivienda actual'))).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('al elegir una dirección muestra la insignia con su primer tramo y habilita Siguiente', async () => {
    await open();
    await pick(HOME);
    expect(screen.getByText('Jr. Lima 123')).toBeTruthy();
    expect(isDisabled(nextButton())).toBe(false);
  });

  it('editar el texto después de elegir descarta la selección', async () => {
    await open();
    await pick(HOME);
    await fireEvent.changeText(screen.getByTestId('address-input'), 'Jr. Lima 12');
    expect(isDisabled(nextButton())).toBe(true);
    expect(screen.queryByText('Jr. Lima 123')).toBeNull();
  });

  it('ofrece elegir la casa en el mapa', async () => {
    await open();
    expect(screen.getByText('Elegir casa en el mapa')).toBeTruthy();
  });
});

describe('GuestSetupModal mapa', () => {
  it('el mapa de la vivienda se abre con su título e instrucción', async () => {
    await open();
    expect(screen.queryByTestId('map-picker')).toBeNull();
    await fireEvent.press(screen.getByText('Elegir casa en el mapa'));
    expect(screen.getByTestId('map-picker-title').props.children).toBe('Tu vivienda actual');
    expect(screen.getByTestId('map-picker-instruction').props.children).toBe(
      'Mueve el mapa para ubicar tu vivienda actual',
    );
  });

  it('confirmar en el mapa elige la vivienda y lo cierra', async () => {
    await open();
    await fireEvent.press(screen.getByText('Elegir casa en el mapa'));
    setNextSuggestion(HOME);
    await fireEvent.press(screen.getByTestId('map-picker-confirm'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(screen.getByText('Jr. Lima 123')).toBeTruthy();
    expect(isDisabled(nextButton())).toBe(false);
  });

  it('cerrar el mapa no elige nada', async () => {
    await open();
    await fireEvent.press(screen.getByText('Elegir casa en el mapa'));
    await fireEvent.press(screen.getByTestId('map-picker-close'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(isDisabled(nextButton())).toBe(true);
  });

  it('en el paso 2 el mapa pide el lugar de trabajo y lo guarda como trabajo', async () => {
    await open();
    await toStep2();
    await fireEvent.press(screen.getByText('Elegir trabajo en el mapa'));
    expect(screen.getByTestId('map-picker-title').props.children).toBe('Tu lugar de trabajo');
    expect(screen.getByTestId('map-picker-instruction').props.children).toBe(
      'Mueve el mapa para ubicar tu lugar de trabajo',
    );
    setNextSuggestion(WORK);
    await fireEvent.press(screen.getByTestId('map-picker-confirm'));
    expect(screen.getByText('Av. Javier Prado 1234')).toBeTruthy();
    expect(isDisabled(nextButton())).toBe(false);
  });
});

describe('GuestSetupModal paso 2 y navegación', () => {
  it('Siguiente avanza al paso 2 con Atrás visible', async () => {
    await open();
    await toStep2();
    expect(screen.getByText(subtitle(2, 'Tu lugar de trabajo'))).toBeTruthy();
    expect(screen.getByText('Atrás')).toBeTruthy();
  });

  it('el paso 2 exige elegir el trabajo antes de continuar', async () => {
    await open();
    await toStep2();
    expect(isDisabled(nextButton())).toBe(true);
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(screen.getByText(subtitle(2, 'Tu lugar de trabajo'))).toBeTruthy();
  });

  it('Atrás vuelve al paso 1 conservando la vivienda elegida', async () => {
    await open();
    await toStep2();
    await fireEvent.press(screen.getByText('Atrás'));
    expect(screen.getByText(subtitle(1, 'Tu vivienda actual'))).toBeTruthy();
    expect(screen.getByText('Jr. Lima 123')).toBeTruthy();
  });

  it('con trabajo elegido avanza al paso 3', async () => {
    await open();
    await toStep3();
    expect(screen.getByText(subtitle(3, 'Presupuesto y transporte'))).toBeTruthy();
    expect(screen.getByText('Ver recomendaciones')).toBeTruthy();
    expect(screen.queryByText('Siguiente')).toBeNull();
  });

  it('Atrás en el paso 3 vuelve al paso 2', async () => {
    await open();
    await toStep3();
    await fireEvent.press(screen.getByText('Atrás'));
    expect(screen.getByText(subtitle(2, 'Tu lugar de trabajo'))).toBeTruthy();
  });
});

describe('GuestSetupModal paso 3 y guardado', () => {
  it('sin presupuesto avisa y no guarda', async () => {
    await open();
    await toStep3();
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(alertSpy).toHaveBeenCalledWith('Presupuesto inválido', 'Ingresa un presupuesto mensual válido.');
    expect(mockGuest.setGuestHome).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('un presupuesto de cero o negativo también se rechaza', async () => {
    await open();
    await toStep3();
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '0');
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '-5');
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(mockGuest.setGuestWorkplace).not.toHaveBeenCalled();
  });

  it('muestra el radio por defecto de 10 km', async () => {
    await open();
    await toStep3();
    expect(screen.getByText('10 km', { exact: true })).toBeTruthy();
  });

  it('guarda vivienda y trabajo, cierra y lanza la recomendación en segundo plano', async () => {
    await open();
    await toStep3();
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '1800.5');
    await fireEvent.press(screen.getByText('Bicicleta'));
    await fireEvent(screen.getByTestId('radius-slider'), 'valueChange', 15);
    await fireEvent.press(screen.getByText('Ver recomendaciones'));

    expect(mockGuest.setGuestHome).toHaveBeenCalledWith({
      lat: HOME.latitude,
      lon: HOME.longitude,
      address: HOME.display_name,
    });
    expect(mockGuest.setGuestWorkplace).toHaveBeenCalledWith({
      lat: WORK.latitude,
      lon: WORK.longitude,
      budget: 1800.5,
      transport: 'cycling',
      address: WORK.display_name,
      maxDistanceKm: 15,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
      work_lat: WORK.latitude,
      work_lon: WORK.longitude,
      budget: 1800.5,
      preferred_transportation: 'cycling',
      max_distance_km: 15,
      home_lat: HOME.latitude,
      home_lon: HOME.longitude,
    });
    expect(mockGuest.saveGuestRecommendations).toHaveBeenCalledWith({ items: ['r1'] });
  });

  it('usa auto como transporte por defecto', async () => {
    await open();
    await toStep3();
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '1000');
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(mockGuest.setGuestWorkplace.mock.calls[0][0].transport).toBe('driving');
    expect(mockGuest.setGuestWorkplace.mock.calls[0][0].maxDistanceKm).toBe(10);
  });

  it('una vivienda fuera de Lima no se guarda y avisa', async () => {
    await open();
    await pick(makeSuggestion({ display_name: 'Calle Cusco 1, Cusco', latitude: -13.52, longitude: -71.97 }));
    await fireEvent.press(screen.getByText('Siguiente'));
    await pick(WORK);
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '1000');
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(alertSpy).toHaveBeenCalledWith('Fuera de cobertura', `Tu vivienda: ${LIMA_LOCATION_ERROR}`);
    expect(mockGuest.setGuestHome).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('un trabajo fuera de Lima no se guarda y avisa', async () => {
    await open();
    await pick(HOME);
    await fireEvent.press(screen.getByText('Siguiente'));
    await pick(makeSuggestion({ display_name: 'Av. Sol 5, Arequipa', latitude: -16.4, longitude: -71.5 }));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '1000');
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(alertSpy).toHaveBeenCalledWith('Fuera de cobertura', `Tu trabajo: ${LIMA_LOCATION_ERROR}`);
    expect(mockGuest.setGuestWorkplace).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('si no se puede guardar avisa, no cierra y no lanza la recomendación', async () => {
    mockGuest.setGuestHome.mockRejectedValue(new Error('disco lleno'));
    await open();
    await toStep3();
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '1000');
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo guardar. Intenta de nuevo.');
    expect(onClose).not.toHaveBeenCalled();
    expect(mockMutation.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Ver recomendaciones')).toBeTruthy();
  });

  it('si la recomendación falla no muestra error ni guarda resultados', async () => {
    mockMutation.mutateAsync.mockRejectedValue(new Error('500'));
    await open();
    await toStep3();
    await fireEvent.changeText(screen.getByPlaceholderText('1500'), '1000');
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockGuest.saveGuestRecommendations).not.toHaveBeenCalled();
  });
});

describe('GuestSetupModal cierre y edición', () => {
  it('cerrar llama a onClose', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('sheet-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cerrar desde un paso avanzado reinicia el asistente al paso 1', async () => {
    const view = await open();
    await toStep3();
    await fireEvent.press(screen.getByTestId('sheet-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.rerender(<GuestSetupModal visible={false} onClose={onClose} />);
    await view.rerender(<GuestSetupModal visible onClose={onClose} />);
    expect(screen.getByText(subtitle(1, 'Tu vivienda actual'))).toBeTruthy();
  });

  it('al editar rellena vivienda, trabajo, presupuesto, transporte y radio guardados', async () => {
    mockGuest.guestHome = { lat: -12.12, lon: -77.03, address: 'Jr. Lima 123, Miraflores' };
    mockGuest.guestWorkplace = {
      lat: -12.09,
      lon: -77.02,
      budget: 2200,
      transport: 'walking',
      address: 'Av. Javier Prado 1234, San Isidro',
      maxDistanceKm: 7,
    };
    await open();
    expect(screen.getByText(subtitle(1, 'Tu vivienda actual'))).toBeTruthy();
    expect(screen.getByText('Jr. Lima 123')).toBeTruthy();
    expect(isDisabled(nextButton())).toBe(false);
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(screen.getByText('Av. Javier Prado 1234')).toBeTruthy();
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(screen.getByPlaceholderText('1500').props.value).toBe('2200');
    expect(screen.getByText('7 km', { exact: true })).toBeTruthy();
    await fireEvent.press(screen.getByText('Ver recomendaciones'));
    expect(mockGuest.setGuestWorkplace.mock.calls[0][0]).toMatchObject({
      budget: 2200,
      transport: 'walking',
      maxDistanceKm: 7,
    });
  });

  it('si el trabajo guardado no trae radio usa 10 km', async () => {
    mockGuest.guestHome = { lat: -12.12, lon: -77.03, address: 'Jr. Lima 123, Miraflores' };
    mockGuest.guestWorkplace = {
      lat: -12.09,
      lon: -77.02,
      budget: 2200,
      transport: 'driving',
      address: 'Av. Javier Prado 1234, San Isidro',
    };
    await open();
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(screen.getByText('10 km', { exact: true })).toBeTruthy();
  });
});
