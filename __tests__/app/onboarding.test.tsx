import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import OnboardingScreen from '@/app/onboarding';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';
import { LIMA_LOCATION_ERROR } from '@/shared/utils/geo';

const mockAuth = jest.fn();
const mockSetHome = jest.fn();
const mockCreateWorkplace = jest.fn();
const mockCreatePreference = jest.fn();
const mockGenerate = jest.fn();
const mockMapPicker = jest.fn();
let mockNextSuggestion: any;

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({
  useCreateWorkplace: () => ({ mutateAsync: (...a: any[]) => mockCreateWorkplace(...a) }),
}));
jest.mock('@/entities/recommendation-preferences', () => ({
  createPreference: (...a: any[]) => mockCreatePreference(...a),
}));
jest.mock('@/features/recommendation/model/useRecommendations', () => ({
  useGenerateRecommendations: () => ({ mutateAsync: (...a: any[]) => mockGenerate(...a) }),
}));
jest.mock('@react-native-community/slider', () => ({
  __esModule: true,
  default: (props: any) => {
    const { View } = require('react-native');
    return <View testID="slider" {...props} />;
  },
}));
jest.mock('@/shared/ui/AddressSearchInput', () => ({
  AddressSearchInput: ({ value, onChangeText, onSelect }: any) => {
    const { TextInput, Pressable } = require('react-native');
    return (
      <>
        <TextInput testID="address-input" value={value} onChangeText={onChangeText} />
        <Pressable testID="pick-address" onPress={() => onSelect(mockNextSuggestion)} />
      </>
    );
  },
}));
jest.mock('@/widgets/location-picker/MapPickerModal', () => ({
  MapPickerModal: (props: any) => {
    mockMapPicker(props);
    const { Pressable } = require('react-native');
    if (!props.visible) return null;
    return (
      <>
        <Pressable testID="map-confirm" onPress={() => props.onConfirm(mockNextSuggestion)} />
        <Pressable testID="map-close" onPress={props.onClose} />
      </>
    );
  },
}));

const lima = (name: string, lat = -12.1, lon = -77.03) => ({
  display_name: name,
  latitude: lat,
  longitude: lon,
  place_type: 'address',
});
const HOME = lima('Av. Larco 123, Miraflores, Lima, Perú');
const WORK = lima('Av. Javier Prado 500, San Isidro, Lima, Perú', -12.09, -77.02);
const OUTSIDE = lima('Cusco, Perú', -13.5, -71.9);

const alertCalls = () => (Alert.alert as jest.Mock).mock.calls;
const lastMapProps = () => mockMapPicker.mock.calls[mockMapPicker.mock.calls.length - 1][0];

async function pick(suggestion: any) {
  mockNextSuggestion = suggestion;
  await fireEvent.press(screen.getByTestId('pick-address'));
}

async function reachPreferences({ home = HOME, work = WORK, withHome = false } = {}) {
  await render(<OnboardingScreen />);
  if (!withHome) await pick(home);
  await pick(work);
}

const setBudget = (v: string) => fireEvent.changeText(screen.getByPlaceholderText('1500'), v);
const submit = async () => {
  await act(async () => {
    fireEvent.press(screen.getByText('Buscar mi vivienda ideal'));
  });
};

beforeEach(() => {
  resetRouter();
  mockAuth.mockReturnValue({ user: { home_address: null }, setHome: mockSetHome });
  mockSetHome.mockResolvedValue(undefined);
  mockCreateWorkplace.mockResolvedValue({ id: 77 });
  mockCreatePreference.mockResolvedValue({});
  mockGenerate.mockResolvedValue({});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('OnboardingScreen pasos', () => {
  it('sin casa registrada empieza en el paso de casa sin botón Atrás', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByText('Tu casa actual')).toBeTruthy();
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('con casa registrada salta al paso de trabajo y no ofrece Atrás', async () => {
    mockAuth.mockReturnValue({ user: { home_address: 'Av. X' }, setHome: mockSetHome });
    await render(<OnboardingScreen />);
    expect(screen.getByText('¿Dónde trabajas?')).toBeTruthy();
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('elegir la casa pasa al paso de trabajo y permite volver con Atrás', async () => {
    await render(<OnboardingScreen />);
    await pick(HOME);
    expect(screen.getByText('¿Dónde trabajas?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Atrás'));
    expect(screen.getByText('Tu casa actual')).toBeTruthy();
  });

  it('elegir el trabajo pasa a preferencias y propone las dos primeras partes como nombre', async () => {
    await reachPreferences();
    expect(screen.getByText('Tus preferencias')).toBeTruthy();
    expect(screen.getByPlaceholderText('Ej: Oficina San Isidro').props.value).toBe(
      'Av. Javier Prado 500, San Isidro',
    );
  });

  it('el nombre propuesto se recorta si la parte 2 trae espacios', async () => {
    await reachPreferences({ work: lima('Calle A,  Distrito B  ,Lima', -12.09, -77.02) });
    expect(screen.getByPlaceholderText('Ej: Oficina San Isidro').props.value).toBe('Calle A,  Distrito B');
  });

  it('seleccionar una dirección limpia el texto de búsqueda', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.changeText(screen.getByTestId('address-input'), 'Larco');
    expect(screen.getByTestId('address-input').props.value).toBe('Larco');
    await pick(HOME);
    expect(screen.getByTestId('address-input').props.value).toBe('');
  });

  it('la flecha de preferencias vuelve al paso de trabajo', async () => {
    await reachPreferences();
    await fireEvent.press(screen.getByTestId('icon-arrow-back'));
    expect(screen.getByText('¿Dónde trabajas?')).toBeTruthy();
  });
});

describe('OnboardingScreen selector de mapa', () => {
  it('empieza cerrado', async () => {
    await render(<OnboardingScreen />);
    expect(lastMapProps().visible).toBe(false);
  });

  it('en el paso de casa abre el mapa con título e instrucción de casa', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    expect(lastMapProps().visible).toBe(true);
    expect(lastMapProps().title).toBe('Ubicación de tu casa');
    expect(lastMapProps().instruction).toBe('Mueve el mapa para ubicar tu casa');
  });

  it('en el paso de trabajo usa los textos de trabajo', async () => {
    mockAuth.mockReturnValue({ user: { home_address: 'Av. X' }, setHome: mockSetHome });
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    expect(lastMapProps().title).toBe('Ubicación de tu trabajo');
    expect(lastMapProps().instruction).toBe('Mueve el mapa para ubicar tu trabajo');
  });

  it('confirmar en el mapa selecciona la dirección, avanza y cierra el mapa', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    mockNextSuggestion = HOME;
    await fireEvent.press(screen.getByTestId('map-confirm'));
    expect(screen.getByText('¿Dónde trabajas?')).toBeTruthy();
    expect(lastMapProps().visible).toBe(false);
  });

  it('cerrar el mapa no avanza de paso', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    await fireEvent.press(screen.getByTestId('map-close'));
    expect(lastMapProps().visible).toBe(false);
    expect(screen.getByText('Tu casa actual')).toBeTruthy();
  });
});

describe('OnboardingScreen preferencias', () => {
  it('el radio de búsqueda parte en 10 km y se redondea al cambiar', async () => {
    await reachPreferences();
    expect(screen.getByText('10 km')).toBeTruthy();
    await act(async () => screen.getByTestId('slider').props.onValueChange(7.6));
    expect(screen.getByText('8 km')).toBeTruthy();
  });

  it('el slider acepta de 1 a 30 km', async () => {
    await reachPreferences();
    expect(screen.getByTestId('slider').props.minimumValue).toBe(1);
    expect(screen.getByTestId('slider').props.maximumValue).toBe(30);
  });

  it('muestra los tres modos de transporte', async () => {
    await reachPreferences();
    expect(screen.getByText('Auto')).toBeTruthy();
    expect(screen.getByText('Bicicleta')).toBeTruthy();
    expect(screen.getByText('Caminando')).toBeTruthy();
  });
});

describe('OnboardingScreen validaciones al guardar', () => {
  it.each([[''], ['   '], ['abc'], ['0'], ['-50']])('presupuesto "%s" se rechaza', async (value) => {
    await reachPreferences();
    await setBudget(value);
    await submit();
    expect(alertCalls()[0]).toEqual(['Presupuesto inválido', 'Ingresa un presupuesto mensual válido.']);
    expect(mockSetHome).not.toHaveBeenCalled();
    expect(mockCreateWorkplace).not.toHaveBeenCalled();
    expect(screen.getByText('Tus preferencias')).toBeTruthy();
  });

  it('una casa fuera de Lima se rechaza sin guardar nada', async () => {
    await reachPreferences({ home: OUTSIDE });
    await setBudget('1500');
    await submit();
    expect(alertCalls()[0]).toEqual(['Fuera de cobertura', LIMA_LOCATION_ERROR]);
    expect(mockSetHome).not.toHaveBeenCalled();
    expect(mockCreateWorkplace).not.toHaveBeenCalled();
    expect(screen.getByText('Tus preferencias')).toBeTruthy();
  });

  it('un trabajo fuera de Lima se rechaza sin guardar nada', async () => {
    await reachPreferences({ work: OUTSIDE });
    await setBudget('1500');
    await submit();
    expect(alertCalls()[0]).toEqual(['Fuera de cobertura', LIMA_LOCATION_ERROR]);
    expect(mockSetHome).not.toHaveBeenCalled();
    expect(mockCreateWorkplace).not.toHaveBeenCalled();
  });

  it('con casa ya registrada solo valida el trabajo', async () => {
    mockAuth.mockReturnValue({ user: { home_address: 'Av. X' }, setHome: mockSetHome });
    await reachPreferences({ withHome: true, work: OUTSIDE });
    await setBudget('1500');
    await submit();
    expect(alertCalls()[0]).toEqual(['Fuera de cobertura', LIMA_LOCATION_ERROR]);
  });
});

describe('OnboardingScreen guardado', () => {
  it('guarda casa, trabajo, preferencias, genera recomendaciones y entra a las pestañas', async () => {
    await reachPreferences();
    await setBudget('1500.5');
    await fireEvent.press(screen.getByText('Bicicleta'));
    await act(async () => screen.getByTestId('slider').props.onValueChange(15));
    await submit();

    expect(mockSetHome).toHaveBeenCalledWith({
      home_lat: HOME.latitude,
      home_lon: HOME.longitude,
      home_address: HOME.display_name,
    });
    expect(mockCreateWorkplace).toHaveBeenCalledWith({
      work_address: 'Av. Javier Prado 500, San Isidro',
      work_lat: WORK.latitude,
      work_lon: WORK.longitude,
    });
    expect(mockCreatePreference).toHaveBeenCalledWith({
      workplace_id: 77,
      budget: 1500.5,
      preferred_transportation: 'cycling',
      max_distance_km: 15,
    });
    expect(mockGenerate).toHaveBeenCalledWith({ workplaceId: 77, options: { max_distance_km: 15 } });
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('elegir Caminando envía walking', async () => {
    await reachPreferences();
    await setBudget('1000');
    await fireEvent.press(screen.getByText('Caminando'));
    await submit();
    expect(mockCreatePreference).toHaveBeenCalledWith(
      expect.objectContaining({ preferred_transportation: 'walking' }),
    );
  });

  it('por defecto usa auto y 10 km', async () => {
    await reachPreferences();
    await setBudget('1000');
    await submit();
    expect(mockCreatePreference).toHaveBeenCalledWith(
      expect.objectContaining({ preferred_transportation: 'driving', max_distance_km: 10 }),
    );
  });

  it('los pasos se ejecutan en orden: casa, trabajo, preferencias, recomendaciones', async () => {
    const order: string[] = [];
    mockSetHome.mockImplementation(async () => void order.push('home'));
    mockCreateWorkplace.mockImplementation(async () => (order.push('workplace'), { id: 1 }));
    mockCreatePreference.mockImplementation(async () => void order.push('preference'));
    mockGenerate.mockImplementation(async () => void order.push('generate'));
    await reachPreferences();
    await setBudget('1000');
    await submit();
    expect(order).toEqual(['home', 'workplace', 'preference', 'generate']);
  });

  it('con casa ya registrada no vuelve a guardar la casa', async () => {
    mockAuth.mockReturnValue({ user: { home_address: 'Av. X' }, setHome: mockSetHome });
    await reachPreferences({ withHome: true });
    await setBudget('1000');
    await submit();
    expect(mockSetHome).not.toHaveBeenCalled();
    expect(mockCreateWorkplace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('un nombre de trabajo vacío se guarda como "Mi trabajo"', async () => {
    await reachPreferences();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej: Oficina San Isidro'), '   ');
    await setBudget('1000');
    await submit();
    expect(mockCreateWorkplace).toHaveBeenCalledWith(expect.objectContaining({ work_address: 'Mi trabajo' }));
  });

  it('un nombre de trabajo editado se envía recortado', async () => {
    await reachPreferences();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej: Oficina San Isidro'), '  Mi oficina ');
    await setBudget('1000');
    await submit();
    expect(mockCreateWorkplace).toHaveBeenCalledWith(expect.objectContaining({ work_address: 'Mi oficina' }));
  });

  it('mientras guarda muestra la pantalla de carga', async () => {
    mockGenerate.mockReturnValue(new Promise(() => {}));
    await reachPreferences();
    await setBudget('1000');
    await submit();
    expect(screen.getByText('Configurando tu perfil')).toBeTruthy();
    expect(screen.getByText('Analizando tu rutina de trabajo...')).toBeTruthy();
    expect(screen.queryByText('Tus preferencias')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('OnboardingScreen errores al guardar', () => {
  it('vuelve a preferencias y muestra el detalle del servidor', async () => {
    mockCreatePreference.mockRejectedValue({ response: { data: { detail: 'Presupuesto fuera de rango' } } });
    await reachPreferences();
    await setBudget('1000');
    await submit();
    expect(alertCalls()[0]).toEqual(['Error', 'Presupuesto fuera de rango']);
    expect(screen.getByText('Tus preferencias')).toBeTruthy();
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sin detalle usa el mensaje genérico', async () => {
    mockCreateWorkplace.mockRejectedValue(new Error('red'));
    await reachPreferences();
    await setBudget('1000');
    await submit();
    expect(alertCalls()[0]).toEqual(['Error', 'Ocurrió un error. Intenta de nuevo.']);
    expect(mockCreatePreference).not.toHaveBeenCalled();
  });

  it('si falla guardar la casa no crea el trabajo', async () => {
    mockSetHome.mockRejectedValue(new Error('x'));
    await reachPreferences();
    await setBudget('1000');
    await submit();
    expect(mockCreateWorkplace).not.toHaveBeenCalled();
    expect(screen.getByText('Tus preferencias')).toBeTruthy();
  });

  it('si falla generar recomendaciones no entra a las pestañas', async () => {
    mockGenerate.mockRejectedValue(new Error('x'));
    await reachPreferences();
    await setBudget('1000');
    await submit();
    expect(router.replace).not.toHaveBeenCalled();
    expect(alertCalls()[0][0]).toBe('Error');
  });
});
