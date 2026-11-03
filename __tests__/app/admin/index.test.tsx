import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import AdminPendingPropertiesScreen from '@/app/(admin)/index';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

const mockGetPending = jest.fn();
const mockUpdateStatus = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native/Libraries/Lists/FlatList', () => require('@/__tests__/_helpers/app/rnPieces').flatListModule);
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => require('@/__tests__/_helpers/app/rnPieces').activityIndicatorModule);
jest.mock('@/features/admin/api/admin.api', () => ({
  getPendingProperties: (...a: any[]) => mockGetPending(...a),
  updatePropertyStatus: (...a: any[]) => mockUpdateStatus(...a),
}));
jest.mock('@/features/admin/ui/AdminPropertyCard', () => ({
  AdminPropertyCard: ({ property, onApprove, onReject, onPress }: any) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <View>
        <Pressable testID={`open-${property.id}`} onPress={() => onPress(property)}>
          <Text>{property.title}</Text>
        </Pressable>
        <Pressable testID={`approve-${property.id}`} onPress={() => onApprove(property.id)} />
        <Pressable testID={`reject-${property.id}`} onPress={() => onReject(property.id)} />
      </View>
    );
  },
}));

const p1 = { id: 'p1', title: 'Casa 1', status: 'pending', publisher_id: 1 };
const p2 = { id: 'p2', title: 'Casa 2', status: 'pending', publisher_id: 2 };
const alertCalls = () => (Alert.alert as jest.Mock).mock.calls;

async function setup() {
  const utils = await render(<AdminPendingPropertiesScreen />);
  await act(async () => {});
  return utils;
}

const confirmLast = async () => {
  const buttons = alertCalls()[alertCalls().length - 1][2];
  await act(async () => {
    await buttons.find((b: any) => b.text === 'Sí, confirmar').onPress();
  });
};

beforeEach(() => {
  resetRouter();
  mockGetPending.mockResolvedValue([p1, p2]);
  mockUpdateStatus.mockResolvedValue({});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('AdminPendingPropertiesScreen carga', () => {
  it('muestra el indicador mientras llegan los datos', async () => {
    mockGetPending.mockReturnValue(new Promise(() => {}));
    await setup();
    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('Todo al día')).toBeNull();
  });

  it('lista las viviendas pendientes al enfocar la pantalla', async () => {
    await setup();
    expect(mockGetPending).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Casa 1')).toBeTruthy();
    expect(screen.getByText('Casa 2')).toBeTruthy();
  });

  it('sin pendientes muestra "Todo al día"', async () => {
    mockGetPending.mockResolvedValue([]);
    await setup();
    expect(screen.getByText('Todo al día')).toBeTruthy();
  });

  it('si falla la carga avisa y deja la lista vacía', async () => {
    mockGetPending.mockRejectedValue(new Error('x'));
    await setup();
    expect(alertCalls()[0]).toEqual(['Error', 'No se pudieron cargar las viviendas pendientes.']);
    expect(screen.queryByTestId('spinner')).toBeNull();
    expect(screen.getByText('Todo al día')).toBeTruthy();
  });

  it('el gesto de refrescar vuelve a consultar', async () => {
    await setup();
    await act(async () => {
      fireEvent.press(screen.getByTestId('refresh'));
    });
    expect(mockGetPending).toHaveBeenCalledTimes(2);
  });

  it('al refrescar mantiene la lista visible sin el indicador de pantalla completa', async () => {
    await setup();
    mockGetPending.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      fireEvent.press(screen.getByTestId('refresh'));
    });
    expect(screen.queryByTestId('spinner')).toBeNull();
    expect(screen.getByText('Casa 1')).toBeTruthy();
  });

  it('pulsar una tarjeta abre el detalle con id y datos', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('open-p1'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/housing-detail',
      params: { id: 'p1', data: JSON.stringify(p1) },
    });
  });
});

describe('AdminPendingPropertiesScreen aprobar', () => {
  it('pide confirmación y no aprueba hasta aceptarla', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('approve-p1'));
    expect(alertCalls()[0][0]).toBe('Aprobar Vivienda');
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('al confirmar aprueba, quita la vivienda de la lista y avisa', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('approve-p1'));
    await confirmLast();
    expect(mockUpdateStatus).toHaveBeenCalledWith('p1', 'approved');
    expect(screen.queryByText('Casa 1')).toBeNull();
    expect(screen.getByText('Casa 2')).toBeTruthy();
    expect(alertCalls()[1]).toEqual(['Aprobada', 'La vivienda ha sido aprobada.']);
  });

  it('si falla conserva la vivienda y avisa del error', async () => {
    mockUpdateStatus.mockRejectedValue(new Error('x'));
    await setup();
    await fireEvent.press(screen.getByTestId('approve-p1'));
    await confirmLast();
    expect(screen.getByText('Casa 1')).toBeTruthy();
    expect(alertCalls()[1]).toEqual(['Error', 'No se pudo aprobar la vivienda.']);
  });
});

describe('AdminPendingPropertiesScreen rechazar', () => {
  const openReject = async (id = 'p1') => {
    await fireEvent.press(screen.getByTestId(`reject-${id}`));
  };

  it('abre el modal de motivo sin llamar al servicio', async () => {
    await setup();
    expect(screen.queryByText('Rechazar Vivienda')).toBeNull();
    await openReject();
    expect(screen.getByText('Rechazar Vivienda')).toBeTruthy();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('exige un motivo no vacío', async () => {
    await setup();
    await openReject();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Las fotos no son claras...'), '   ');
    await act(async () => {
      fireEvent.press(screen.getByText('Confirmar'));
    });
    expect(alertCalls()[0][0]).toBe('Motivo requerido');
    expect(mockUpdateStatus).not.toHaveBeenCalled();
    expect(screen.getByText('Rechazar Vivienda')).toBeTruthy();
  });

  it('envía el motivo recortado, cierra el modal y quita la vivienda', async () => {
    await setup();
    await openReject('p2');
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Las fotos no son claras...'), '  Fotos borrosas ');
    await act(async () => {
      fireEvent.press(screen.getByText('Confirmar'));
    });
    expect(mockUpdateStatus).toHaveBeenCalledWith('p2', 'rejected', 'Fotos borrosas');
    expect(screen.queryByText('Rechazar Vivienda')).toBeNull();
    expect(screen.queryByText('Casa 2')).toBeNull();
    expect(screen.getByText('Casa 1')).toBeTruthy();
    expect(alertCalls()[0]).toEqual(['Rechazada', 'La vivienda ha sido rechazada.']);
  });

  it('si falla mantiene el modal y la vivienda, y avisa', async () => {
    mockUpdateStatus.mockRejectedValue(new Error('x'));
    await setup();
    await openReject();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Las fotos no son claras...'), 'Motivo');
    await act(async () => {
      fireEvent.press(screen.getByText('Confirmar'));
    });
    expect(alertCalls()[0]).toEqual(['Error', 'No se pudo rechazar la vivienda.']);
    expect(screen.getByText('Casa 1')).toBeTruthy();
    expect(screen.getByText('Rechazar Vivienda')).toBeTruthy();
  });

  it('Cancelar cierra el modal sin rechazar', async () => {
    await setup();
    await openReject();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.queryByText('Rechazar Vivienda')).toBeNull();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('al reabrir el modal el motivo anterior se borra', async () => {
    await setup();
    await openReject();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Las fotos no son claras...'), 'Algo');
    await fireEvent.press(screen.getByText('Cancelar'));
    await openReject('p2');
    expect(screen.getByPlaceholderText('Ej. Las fotos no son claras...').props.value).toBe('');
  });
});
