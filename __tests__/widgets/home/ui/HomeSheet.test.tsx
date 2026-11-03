import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { HomeSheet } from '@/widgets/home/ui/HomeSheet';
import { useWorkplaces } from '@/entities/workplace/model/useWorkplaces';
import { LIMA_LOCATION_ERROR } from '@/shared/utils/geo';
import { makeSuggestion, setNextSuggestion, resetNextSuggestion } from '@/__tests__/_helpers/features/mockFeatureUi';

const mockAuth: any = { user: null, setHome: jest.fn() };
const mockGuest: any = { guestHome: null, guestWorkplace: null, setGuestHome: jest.fn(), saveGuestRecommendations: jest.fn() };
const mockGenerate = { mutate: jest.fn() };
const mockGuestRecs = { mutateAsync: jest.fn() };
const mockSelected: any = { selectedWorkplaceId: null };
const mockWorkplaces: { data: any[] } = { data: [] };

jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/features/guest', () => ({ useGuest: () => mockGuest }));
jest.mock('@/features/recommendation/model/useRecommendations', () => ({
  useGenerateRecommendations: () => mockGenerate,
  useGuestRecommendations: () => mockGuestRecs,
}));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({
  useWorkplaces: jest.fn(() => mockWorkplaces),
}));
jest.mock('@/shared/model/SelectedWorkplaceContext', () => ({
  useSelectedWorkplace: () => mockSelected,
}));
jest.mock('@/shared/ui/BottomSheet', () => require('@/__tests__/_helpers/features/mockFeatureUi').bottomSheetModule);
jest.mock('@/shared/ui/AddressSearchInput', () => require('@/__tests__/_helpers/features/mockFeatureUi').addressSearchModule);
jest.mock('@/widgets/location-picker/MapPickerModal', () => require('@/__tests__/_helpers/features/mockFeatureUi').mapPickerModule);

const onClose = jest.fn();
const onSaved = jest.fn();
let alertSpy: jest.SpyInstance;

const HOME = makeSuggestion({ display_name: 'Jr. Lima 123, Miraflores, Lima', latitude: -12.12, longitude: -77.03 });
const USER = { id: 1, email: 'a@b.c', home_address: 'Av. Antigua 5, Barranco, Lima, Perú' };

beforeEach(() => {
  mockAuth.user = null;
  mockAuth.setHome.mockResolvedValue(true);
  mockGuest.guestHome = null;
  mockGuest.guestWorkplace = null;
  mockGuest.setGuestHome.mockResolvedValue(undefined);
  mockGuest.saveGuestRecommendations.mockResolvedValue(undefined);
  mockGuestRecs.mutateAsync.mockResolvedValue({ items: ['fresh'] });
  mockSelected.selectedWorkplaceId = null;
  mockWorkplaces.data = [];
  resetNextSuggestion();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

const open = (visible = true) => render(<HomeSheet visible={visible} onClose={onClose} onSaved={onSaved} />);
const pick = async (s: Record<string, any> = HOME) => {
  setNextSuggestion(s);
  await fireEvent.press(screen.getByTestId('address-pick'));
};
const save = () => fireEvent.press(screen.getByText('Guardar'));

describe('HomeSheet presentación', () => {
  it('oculto no pinta nada', async () => {
    await open(false);
    expect(screen.queryByText('Mi Vivienda Actual')).toBeNull();
  });

  it('visible muestra el título y las acciones', async () => {
    await open();
    expect(screen.getByText('Mi Vivienda Actual')).toBeTruthy();
    expect(screen.getByText('Guardar')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Elegir en el mapa')).toBeTruthy();
  });

  it('con usuario autenticado precarga sus dos primeros tramos de dirección', async () => {
    mockAuth.user = USER;
    await open();
    expect(screen.getByTestId('address-input').props.value).toBe('Av. Antigua 5, Barranco');
  });

  it('un invitado precarga la dirección de su vivienda guardada', async () => {
    mockGuest.guestHome = { lat: -12.1, lon: -77, address: 'Calle Sol 9, Surco, Lima' };
    await open();
    expect(screen.getByTestId('address-input').props.value).toBe('Calle Sol 9, Surco');
  });

  it('con usuario ignora la vivienda de invitado', async () => {
    mockAuth.user = { ...USER, home_address: 'Av. Antigua 5, Barranco' };
    mockGuest.guestHome = { lat: -12.1, lon: -77, address: 'Otra 1, Otro' };
    await open();
    expect(screen.getByTestId('address-input').props.value).toBe('Av. Antigua 5, Barranco');
  });

  it('sin dirección guardada el campo queda vacío', async () => {
    mockAuth.user = { ...USER, home_address: null };
    await open();
    expect(screen.getByTestId('address-input').props.value).toBe('');
  });

  it('consulta los lugares de trabajo solo si hay usuario', async () => {
    await open();
    expect(useWorkplaces).toHaveBeenLastCalledWith(false);
    mockAuth.user = USER;
    await open();
    expect(useWorkplaces).toHaveBeenLastCalledWith(true);
  });
});

describe('HomeSheet selección', () => {
  it('elegir una sugerencia muestra la insignia y su primer tramo en el campo', async () => {
    await open();
    await pick();
    expect(screen.getByText('Ubicación seleccionada')).toBeTruthy();
    expect(screen.getByTestId('address-input').props.value).toBe('Jr. Lima 123');
  });

  it('escribir después de elegir descarta la selección', async () => {
    await open();
    await pick();
    await fireEvent.changeText(screen.getByTestId('address-input'), 'Jr. Lima');
    expect(screen.queryByText('Ubicación seleccionada')).toBeNull();
  });

  it('el mapa se abre con su título e instrucción', async () => {
    await open();
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    expect(screen.getByTestId('map-picker-title').props.children).toBe('Ubicación de tu casa');
    expect(screen.getByTestId('map-picker-instruction').props.children).toBe('Ubica tu vivienda actual en el mapa');
  });

  it('confirmar en el mapa elige la ubicación y cierra el mapa', async () => {
    await open();
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    setNextSuggestion(HOME);
    await fireEvent.press(screen.getByTestId('map-picker-confirm'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(screen.getByText('Ubicación seleccionada')).toBeTruthy();
  });

  it('cerrar el mapa no elige nada', async () => {
    await open();
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    await fireEvent.press(screen.getByTestId('map-picker-close'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(screen.queryByText('Ubicación seleccionada')).toBeNull();
  });
});

describe('HomeSheet validaciones y cierre', () => {
  it('guardar sin elegir dirección avisa', async () => {
    await open();
    await save();
    expect(alertSpy).toHaveBeenCalledWith('Dirección faltante', 'Busca o selecciona una dirección.');
    expect(mockAuth.setHome).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('una dirección fuera de Lima no se guarda', async () => {
    mockAuth.user = USER;
    await open();
    await pick(makeSuggestion({ latitude: -13.52, longitude: -71.97 }));
    await save();
    expect(alertSpy).toHaveBeenCalledWith('Fuera de cobertura', LIMA_LOCATION_ERROR);
    expect(mockAuth.setHome).not.toHaveBeenCalled();
    expect(mockGuest.setGuestHome).not.toHaveBeenCalled();
  });

  it('Cancelar cierra sin guardar', async () => {
    await open();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockAuth.setHome).not.toHaveBeenCalled();
  });

  it('cerrar el panel descarta la selección', async () => {
    const view = await open();
    await pick();
    await fireEvent.press(screen.getByTestId('sheet-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.rerender(<HomeSheet visible onClose={onClose} onSaved={onSaved} />);
    expect(screen.queryByText('Ubicación seleccionada')).toBeNull();
    expect(screen.getByTestId('address-input').props.value).toBe('');
  });
});

describe('HomeSheet guardar con usuario autenticado', () => {
  beforeEach(() => {
    mockAuth.user = USER;
  });

  it('guarda la vivienda en el servidor, avisa y cierra', async () => {
    await open();
    await pick();
    await save();
    expect(mockAuth.setHome).toHaveBeenCalledWith({
      home_lat: HOME.latitude,
      home_lon: HOME.longitude,
      home_address: HOME.display_name,
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockGuest.setGuestHome).not.toHaveBeenCalled();
  });

  it('regenera las recomendaciones del primer lugar de trabajo si no hay uno elegido', async () => {
    mockWorkplaces.data = [{ id: 11 }, { id: 22 }];
    await open();
    await pick();
    await save();
    expect(mockGenerate.mutate).toHaveBeenCalledWith({ workplaceId: 11 });
  });

  it('regenera las del lugar de trabajo seleccionado', async () => {
    mockWorkplaces.data = [{ id: 11 }, { id: 22 }];
    mockSelected.selectedWorkplaceId = 22;
    await open();
    await pick();
    await save();
    expect(mockGenerate.mutate).toHaveBeenCalledWith({ workplaceId: 22 });
  });

  it('si el lugar seleccionado ya no existe usa el primero', async () => {
    mockWorkplaces.data = [{ id: 11 }, { id: 22 }];
    mockSelected.selectedWorkplaceId = 99;
    await open();
    await pick();
    await save();
    expect(mockGenerate.mutate).toHaveBeenCalledWith({ workplaceId: 11 });
  });

  it('sin lugares de trabajo no regenera nada', async () => {
    await open();
    await pick();
    await save();
    expect(mockGenerate.mutate).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('si el servidor falla avisa y no cierra ni notifica', async () => {
    mockAuth.setHome.mockRejectedValue(new Error('500'));
    await open();
    await pick();
    await save();
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo actualizar la vivienda.');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Guardar')).toBeTruthy();
  });

  it('si setHome informa false (no se guardó) avisa del error y no cierra', async () => {
    mockAuth.setHome.mockResolvedValue(false);
    mockWorkplaces.data = [{ id: 11 }];
    await open();
    await pick();
    await save();
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo actualizar la vivienda.');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockGenerate.mutate).not.toHaveBeenCalled();
  });

  it('mientras guarda oculta el texto del botón', async () => {
    let release!: (v: boolean) => void;
    mockAuth.setHome.mockReturnValue(new Promise<boolean>((r) => (release = r)));
    await open();
    await pick();
    let press!: Promise<unknown>;
    await act(async () => {
      press = save();
    });
    expect(screen.queryByText('Guardar')).toBeNull();
    await act(async () => {
      release(true);
      await press;
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('HomeSheet guardar como invitado', () => {
  const WORKPLACE = { lat: -12.0, lon: -77.1, budget: 1800, transport: 'walking', address: 'Trabajo', maxDistanceKm: 7 };

  it('guarda la vivienda localmente y cierra', async () => {
    await open();
    await pick();
    await save();
    expect(mockGuest.setGuestHome).toHaveBeenCalledWith({
      lat: HOME.latitude,
      lon: HOME.longitude,
      address: HOME.display_name,
    });
    expect(mockAuth.setHome).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sin trabajo guardado no recalcula recomendaciones', async () => {
    await open();
    await pick();
    await save();
    expect(mockGuestRecs.mutateAsync).not.toHaveBeenCalled();
  });

  it('con trabajo guardado recalcula con la nueva vivienda y guarda el resultado', async () => {
    mockGuest.guestWorkplace = WORKPLACE;
    await open();
    await pick();
    await save();
    expect(mockGuestRecs.mutateAsync).toHaveBeenCalledWith({
      work_lat: -12.0,
      work_lon: -77.1,
      budget: 1800,
      preferred_transportation: 'walking',
      max_distance_km: 7,
      home_lat: HOME.latitude,
      home_lon: HOME.longitude,
    });
    expect(mockGuest.saveGuestRecommendations).toHaveBeenCalledWith({ items: ['fresh'] });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('si el recálculo falla avisa y no cierra', async () => {
    mockGuest.guestWorkplace = WORKPLACE;
    mockGuestRecs.mutateAsync.mockRejectedValue(new Error('500'));
    await open();
    await pick();
    await save();
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo actualizar la vivienda.');
    expect(mockGuest.saveGuestRecommendations).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('funciona sin onSaved', async () => {
    await render(<HomeSheet visible onClose={onClose} />);
    await pick();
    await save();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
