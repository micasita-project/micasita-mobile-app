import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { WorkplaceSheet } from '@/widgets/workplace/ui/WorkplaceSheet';
import { usePreferences } from '@/entities/recommendation-preferences';
import { LIMA_LOCATION_ERROR } from '@/shared/utils/geo';
import { makeSuggestion, setNextSuggestion, resetNextSuggestion } from '@/__tests__/_helpers/features/mockFeatureUi';

const mockMut = () => ({ mutateAsync: jest.fn(), isPending: false });
const mockM = {
  createWp: mockMut(),
  updateWp: mockMut(),
  deleteWp: mockMut(),
  createPref: mockMut(),
  updatePref: mockMut(),
  generate: { mutate: jest.fn() },
};
const mockPrefs: { data: any[] } = { data: [] };

jest.mock('@/entities/recommendation-preferences', () => ({
  usePreferences: jest.fn(() => mockPrefs),
  useCreatePreference: () => mockM.createPref,
  useUpdatePreference: () => mockM.updatePref,
}));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({
  useCreateWorkplace: () => mockM.createWp,
  useUpdateWorkplace: () => mockM.updateWp,
  useDeleteWorkplace: () => mockM.deleteWp,
}));
jest.mock('@/features/recommendation/model/useRecommendations', () => ({
  useGenerateRecommendations: () => mockM.generate,
}));
jest.mock('@/shared/ui/BottomSheet', () => require('@/__tests__/_helpers/features/mockFeatureUi').bottomSheetModule);
jest.mock('@/shared/ui/SheetTextInput', () => require('@/__tests__/_helpers/features/mockFeatureUi').sheetTextInputModule);
jest.mock('@/shared/ui/AddressSearchInput', () => require('@/__tests__/_helpers/features/mockFeatureUi').addressSearchModule);
jest.mock('@/widgets/location-picker/MapPickerModal', () => require('@/__tests__/_helpers/features/mockFeatureUi').mapPickerModule);
jest.mock('@react-native-community/slider', () => require('@/__tests__/_helpers/features/mockFeatureUi').sliderModule);

const onClose = jest.fn();
const onSuccess = jest.fn();
let alertSpy: jest.SpyInstance;

const WORKPLACE = { id: 5, user_id: 1, work_address: 'Av. Vieja 1', work_lat: -12.05, work_lon: -77.04 };
const PREF = { id: 9, workplace_id: 5, budget: 2000, preferred_transportation: 'walking', max_distance_km: 7 };
const PLACE = makeSuggestion({ display_name: 'Av. Javier Prado 1234, San Isidro, Lima', latitude: -12.09, longitude: -77.02 });

beforeEach(() => {
  for (const k of ['createWp', 'updateWp', 'deleteWp', 'createPref', 'updatePref'] as const) {
    mockM[k].isPending = false;
    mockM[k].mutateAsync.mockResolvedValue({ id: 99 });
  }
  mockPrefs.data = [];
  resetNextSuggestion();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

type Props = { workplace?: any; allowDelete?: boolean; visible?: boolean };
const element = ({ workplace, allowDelete, visible = true }: Props = {}) => (
  <WorkplaceSheet visible={visible} workplace={workplace} allowDelete={allowDelete} onClose={onClose} onSuccess={onSuccess} />
);
const open = (props: Props = {}) => render(element(props));
const pick = async (s: Record<string, any> = PLACE) => {
  setNextSuggestion(s);
  await fireEvent.press(screen.getByTestId('address-pick'));
};
const budget = (text: string) => fireEvent.changeText(screen.getByPlaceholderText('Presupuesto Mensual (S/)'), text);
const submit = (label: string) => fireEvent.press(screen.getByText(label));
const budgetValue = () => screen.getByPlaceholderText('Presupuesto Mensual (S/)').props.value;

describe('WorkplaceSheet crear', () => {
  it('oculto no pinta nada', async () => {
    await open({ visible: false });
    expect(screen.queryByText('Nuevo Lugar de Trabajo')).toBeNull();
  });

  it('muestra el formulario de alta sin opción de eliminar', async () => {
    await open({ allowDelete: true });
    expect(screen.getByText('Nuevo Lugar de Trabajo')).toBeTruthy();
    expect(screen.getByText('Añadir')).toBeTruthy();
    expect(screen.getByPlaceholderText('Buscar direccion...')).toBeTruthy();
    expect(screen.queryByText('Eliminar lugar de trabajo')).toBeNull();
    expect(screen.getByText('10 km', { exact: true })).toBeTruthy();
    expect(usePreferences).toHaveBeenLastCalledWith(null);
  });

  it.each([['', 'vacío'], ['0', 'cero'], ['-3', 'negativo'], ['abc', 'no numérico']])(
    'un presupuesto %s (%s) se rechaza',
    async (value) => {
      await open();
      await pick();
      await budget(value);
      await submit('Añadir');
      expect(alertSpy).toHaveBeenCalledWith('Presupuesto invalido', 'Ingresa un presupuesto valido.');
      expect(mockM.createWp.mutateAsync).not.toHaveBeenCalled();
    },
  );

  it('sin dirección elegida avisa', async () => {
    await open();
    await budget('1500');
    await submit('Añadir');
    expect(alertSpy).toHaveBeenCalledWith('Direccion faltante', 'Busca o selecciona una direccion.');
    expect(mockM.createWp.mutateAsync).not.toHaveBeenCalled();
  });

  it('una dirección fuera de Lima no se guarda', async () => {
    await open();
    await pick(makeSuggestion({ latitude: -13.52, longitude: -71.97 }));
    await budget('1500');
    await submit('Añadir');
    expect(alertSpy).toHaveBeenCalledWith('Fuera de cobertura', LIMA_LOCATION_ERROR);
    expect(mockM.createWp.mutateAsync).not.toHaveBeenCalled();
  });

  it('crea el lugar y sus preferencias, regenera recomendaciones, cierra y notifica', async () => {
    mockM.createWp.mutateAsync.mockResolvedValue({ id: 77 });
    await open();
    await pick();
    await budget('1750.5');
    await fireEvent.press(screen.getByText('Caminando'));
    await fireEvent(screen.getByTestId('radius-slider'), 'valueChange', 12);
    await submit('Añadir');

    expect(mockM.createWp.mutateAsync).toHaveBeenCalledWith({
      work_address: 'Av. Javier Prado 1234',
      work_lat: PLACE.latitude,
      work_lon: PLACE.longitude,
    });
    expect(mockM.createPref.mutateAsync).toHaveBeenCalledWith({
      workplace_id: 77,
      budget: 1750.5,
      preferred_transportation: 'walking',
      max_distance_km: 12,
    });
    expect(mockM.generate.mutate).toHaveBeenCalledWith({ workplaceId: 77 }, { onError: expect.any(Function) });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(77);
    expect(mockM.updateWp.mutateAsync).not.toHaveBeenCalled();
  });

  it('por defecto usa auto y 10 km', async () => {
    await open();
    await pick();
    await budget('1000');
    await submit('Añadir');
    expect(mockM.createPref.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ preferred_transportation: 'driving', max_distance_km: 10 }),
    );
  });

  it('si el nombre de la dirección queda vacío usa "Mi Trabajo"', async () => {
    await open();
    await pick(makeSuggestion({ display_name: ', Lima' }));
    await budget('1000');
    await submit('Añadir');
    expect(mockM.createWp.mutateAsync.mock.calls[0][0].work_address).toBe('Mi Trabajo');
  });

  it('si falla la creación del lugar avisa y no cierra ni notifica', async () => {
    mockM.createWp.mutateAsync.mockRejectedValue(new Error('500'));
    await open();
    await pick();
    await budget('1000');
    await submit('Añadir');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo agregar el lugar de trabajo.');
    expect(mockM.createPref.mutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('si falla la creación de preferencias avisa y no notifica', async () => {
    mockM.createPref.mutateAsync.mockRejectedValue(new Error('500'));
    await open();
    await pick();
    await budget('1000');
    await submit('Añadir');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo agregar el lugar de trabajo.');
    expect(mockM.generate.mutate).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('Cancelar cierra y descarta lo escrito', async () => {
    await open();
    await pick();
    await budget('1000');
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(budgetValue()).toBe('');
    expect(screen.queryByText('Ubicacion seleccionada')).toBeNull();
    expect(screen.getByTestId('address-input').props.value).toBe('');
  });

  it('Cancelar también restablece el radio y el transporte', async () => {
    await open();
    await fireEvent(screen.getByTestId('radius-slider'), 'valueChange', 20);
    await fireEvent.press(screen.getByText('Bicicleta'));
    expect(screen.getByText('20 km', { exact: true })).toBeTruthy();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.getByText('10 km', { exact: true })).toBeTruthy();
    await pick();
    await budget('1000');
    await submit('Añadir');
    expect(mockM.createPref.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ preferred_transportation: 'driving', max_distance_km: 10 }),
    );
  });

  it.each(['createWp', 'updateWp', 'createPref', 'updatePref'] as const)(
    'con %s en curso el botón oculta su texto',
    async (key) => {
      mockM[key].isPending = true;
      await open();
      expect(screen.queryByText('Añadir')).toBeNull();
    },
  );

  it('elegir una sugerencia muestra la insignia y escribir la descarta', async () => {
    await open();
    await pick();
    expect(screen.getByText('Ubicacion seleccionada')).toBeTruthy();
    expect(screen.getByTestId('address-input').props.value).toBe('Av. Javier Prado 1234');
    await fireEvent.changeText(screen.getByTestId('address-input'), 'Av. Javier');
    expect(screen.queryByText('Ubicacion seleccionada')).toBeNull();
  });

  it('el mapa de alta se abre sin región inicial y confirma una ubicación', async () => {
    await open();
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    expect(screen.getByTestId('map-picker-title').props.children).toBe('Ubicacion de trabajo');
    expect(screen.getByTestId('map-picker-instruction').props.children).toBe('Ubica tu lugar de trabajo en el mapa');
    expect(screen.getByTestId('map-picker-region').props.children).toBe('null');
    setNextSuggestion(PLACE);
    await fireEvent.press(screen.getByTestId('map-picker-confirm'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(screen.getByText('Ubicacion seleccionada')).toBeTruthy();
  });

  it('cerrar el mapa no elige nada', async () => {
    await open();
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    await fireEvent.press(screen.getByTestId('map-picker-close'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(screen.queryByText('Ubicacion seleccionada')).toBeNull();
  });
});

describe('WorkplaceSheet editar', () => {
  it('muestra el formulario de edición con la dirección actual', async () => {
    await open({ workplace: WORKPLACE });
    expect(screen.getByText('Editar Lugar de Trabajo')).toBeTruthy();
    expect(screen.getByText('Guardar')).toBeTruthy();
    expect(screen.getByPlaceholderText('Buscar nueva direccion...')).toBeTruthy();
    expect(screen.getByTestId('address-input').props.value).toBe('Av. Vieja 1');
    expect(screen.getByText('Ubicacion seleccionada')).toBeTruthy();
    expect(usePreferences).toHaveBeenLastCalledWith(5);
  });

  it('el mapa de edición se centra en el lugar actual', async () => {
    await open({ workplace: WORKPLACE });
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    expect(screen.getByTestId('map-picker-title').props.children).toBe('Editar ubicacion');
    expect(screen.getByTestId('map-picker-instruction').props.children).toBe(
      'Ubica el nuevo punto de trabajo en el mapa',
    );
    expect(JSON.parse(screen.getByTestId('map-picker-region').props.children)).toEqual({
      latitude: -12.05,
      longitude: -77.04,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  });

  it('rellena presupuesto, transporte y radio con la preferencia guardada', async () => {
    mockPrefs.data = [PREF];
    await open({ workplace: WORKPLACE });
    expect(budgetValue()).toBe('2000');
    expect(screen.getByText('7 km', { exact: true })).toBeTruthy();
    await submit('Guardar');
    expect(mockM.updatePref.mutateAsync).toHaveBeenCalledWith({
      id: 9,
      data: { budget: 2000, preferred_transportation: 'walking', max_distance_km: 7 },
    });
  });

  it.each([
    ['Auto', 'driving'],
    ['Bicicleta', 'cycling'],
    ['Caminando', 'walking'],
    ['cycling', 'cycling'],
    ['moto', 'driving'],
    [null, 'driving'],
  ])('normaliza el transporte guardado %s como %s', async (stored, expected) => {
    mockPrefs.data = [{ ...PREF, preferred_transportation: stored }];
    await open({ workplace: WORKPLACE });
    await submit('Guardar');
    expect(mockM.updatePref.mutateAsync.mock.calls[0][0].data.preferred_transportation).toBe(expected);
  });

  it('una preferencia sin radio usa 10 km', async () => {
    mockPrefs.data = [{ ...PREF, max_distance_km: null }];
    await open({ workplace: WORKPLACE });
    expect(screen.getByText('10 km', { exact: true })).toBeTruthy();
  });

  it('las preferencias que llegan después también se aplican', async () => {
    const view = await open({ workplace: WORKPLACE });
    expect(budgetValue()).toBe('');
    mockPrefs.data = [PREF];
    await view.rerender(element({ workplace: WORKPLACE }));
    expect(budgetValue()).toBe('2000');
  });

  it('una actualización posterior de las preferencias no pisa lo que escribió el usuario', async () => {
    mockPrefs.data = [PREF];
    const view = await open({ workplace: WORKPLACE });
    await budget('999');
    mockPrefs.data = [{ ...PREF }];
    await view.rerender(element({ workplace: WORKPLACE }));
    expect(budgetValue()).toBe('999');
  });

  it('guarda lugar y preferencias, regenera recomendaciones, cierra y notifica', async () => {
    mockPrefs.data = [PREF];
    await open({ workplace: WORKPLACE });
    await budget('2300');
    await fireEvent.press(screen.getByText('Bicicleta'));
    await submit('Guardar');
    expect(mockM.updateWp.mutateAsync).toHaveBeenCalledWith({
      id: 5,
      data: { work_address: 'Av. Vieja 1', work_lat: -12.05, work_lon: -77.04 },
    });
    expect(mockM.updatePref.mutateAsync).toHaveBeenCalledWith({
      id: 9,
      data: { budget: 2300, preferred_transportation: 'cycling', max_distance_km: 7 },
    });
    expect(mockM.createPref.mutateAsync).not.toHaveBeenCalled();
    expect(mockM.generate.mutate).toHaveBeenCalledWith({ workplaceId: 5 }, { onError: expect.any(Function) });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(5);
  });

  it('si el lugar no tenía preferencias las crea', async () => {
    await open({ workplace: WORKPLACE });
    await budget('1800');
    await submit('Guardar');
    expect(mockM.createPref.mutateAsync).toHaveBeenCalledWith({
      workplace_id: 5,
      budget: 1800,
      preferred_transportation: 'driving',
      max_distance_km: 10,
    });
    expect(mockM.updatePref.mutateAsync).not.toHaveBeenCalled();
  });

  it('una nueva dirección elegida actualiza nombre y coordenadas', async () => {
    mockPrefs.data = [PREF];
    await open({ workplace: WORKPLACE });
    await pick();
    await submit('Guardar');
    expect(mockM.updateWp.mutateAsync).toHaveBeenCalledWith({
      id: 5,
      data: { work_address: 'Av. Javier Prado 1234', work_lat: PLACE.latitude, work_lon: PLACE.longitude },
    });
  });

  it('una nueva dirección fuera de Lima no se guarda', async () => {
    mockPrefs.data = [PREF];
    await open({ workplace: WORKPLACE });
    await pick(makeSuggestion({ latitude: -13.52, longitude: -71.97 }));
    await submit('Guardar');
    expect(alertSpy).toHaveBeenCalledWith('Fuera de cobertura', LIMA_LOCATION_ERROR);
    expect(mockM.updateWp.mutateAsync).not.toHaveBeenCalled();
    expect(mockM.updatePref.mutateAsync).not.toHaveBeenCalled();
  });

  it('con el campo de dirección vacío solo actualiza las preferencias', async () => {
    mockPrefs.data = [PREF];
    await open({ workplace: WORKPLACE });
    await fireEvent.changeText(screen.getByTestId('address-input'), '  ');
    await submit('Guardar');
    expect(mockM.updateWp.mutateAsync).not.toHaveBeenCalled();
    expect(mockM.updatePref.mutateAsync).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(5);
  });

  it('el presupuesto se valida también al editar', async () => {
    await open({ workplace: WORKPLACE });
    await submit('Guardar');
    expect(alertSpy).toHaveBeenCalledWith('Presupuesto invalido', 'Ingresa un presupuesto valido.');
    expect(mockM.updateWp.mutateAsync).not.toHaveBeenCalled();
  });

  it('si falla la actualización avisa y no cierra ni notifica', async () => {
    mockPrefs.data = [PREF];
    mockM.updateWp.mutateAsync.mockRejectedValue(new Error('500'));
    await open({ workplace: WORKPLACE });
    await submit('Guardar');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo actualizar el lugar de trabajo.');
    expect(mockM.updatePref.mutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('si la regeneración de recomendaciones falla avisa sin deshacer el guardado', async () => {
    mockPrefs.data = [PREF];
    await open({ workplace: WORKPLACE });
    await submit('Guardar');
    const { onError } = mockM.generate.mutate.mock.calls[0][1];
    alertSpy.mockClear();
    onError();
    expect(alertSpy).toHaveBeenCalledWith(
      'Recomendaciones',
      'Guardamos tus preferencias, pero no se pudieron actualizar las recomendaciones. Vuelve a intentarlo desde la pestaña IA.',
    );
    expect(onSuccess).toHaveBeenCalledWith(5);
  });
});

describe('WorkplaceSheet eliminar', () => {
  it('solo aparece al editar con allowDelete', async () => {
    await open({ workplace: WORKPLACE });
    expect(screen.queryByText('Eliminar lugar de trabajo')).toBeNull();
    await open({ workplace: WORKPLACE, allowDelete: true });
    expect(screen.getByText('Eliminar lugar de trabajo')).toBeTruthy();
  });

  it('pide confirmación con el nombre del lugar', async () => {
    await open({ workplace: WORKPLACE, allowDelete: true });
    await fireEvent.press(screen.getByText('Eliminar lugar de trabajo'));
    expect(alertSpy).toHaveBeenCalledWith('Eliminar', 'Eliminar "Av. Vieja 1"?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: expect.any(Function) },
    ]);
    expect(mockM.deleteWp.mutateAsync).not.toHaveBeenCalled();
  });

  it('confirmar elimina el lugar, cierra y notifica', async () => {
    await open({ workplace: WORKPLACE, allowDelete: true });
    await fireEvent.press(screen.getByText('Eliminar lugar de trabajo'));
    const confirm = alertSpy.mock.calls[0][2][1];
    await act(async () => {
      await confirm.onPress();
    });
    expect(mockM.deleteWp.mutateAsync).toHaveBeenCalledWith(5);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(5);
  });

  it('si falla la eliminación avisa y no cierra', async () => {
    mockM.deleteWp.mutateAsync.mockRejectedValue(new Error('500'));
    await open({ workplace: WORKPLACE, allowDelete: true });
    await fireEvent.press(screen.getByText('Eliminar lugar de trabajo'));
    const confirm = alertSpy.mock.calls[0][2][1];
    await act(async () => {
      await confirm.onPress();
    });
    expect(alertSpy).toHaveBeenLastCalledWith('Error', 'No se pudo eliminar el lugar de trabajo.');
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
