import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { MyListingsPanel } from '@/features/publish-housing/ui/MyListingsPanel';
import { getMyListings } from '@/features/publish-housing/model/publishHousing.service';
import { formatPrice } from '@/shared/utils/currency';

const mockRouter = { push: jest.fn() };
const mockAuth: any = { user: { id: 7, email: 'ana@mail.com' } };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/features/publish-housing/model/publishHousing.service', () => ({
  getMyListings: jest.fn(),
}));

const mockDeleteAsync = jest.fn();
jest.mock('@/entities/housing/model/useProperties', () => ({
  useDeleteProperty: () => ({ mutateAsync: (...a: any[]) => mockDeleteAsync(...a) }),
}));

const getMock = getMyListings as jest.Mock;

const listing = (over: Record<string, any> = {}) => ({
  id: '1',
  userId: '7',
  userEmail: '',
  status: 'pending',
  createdAt: '2026-03-15T12:00:00Z',
  updatedAt: '2026-03-15T12:00:00Z',
  address: 'Av. Perú 100',
  district: 'Miraflores',
  latitude: -12.1,
  longitude: -77.0,
  title: 'Depa luminoso',
  property_type: 'Departamento',
  currency: 'PEN',
  price: 2500,
  total_area_sqm: 80,
  bedrooms: 2,
  bathrooms: 2,
  description: 'x',
  images: ['https://img/1.jpg', 'https://img/2.jpg'],
  features: [],
  rejectionReason: null,
  ...over,
});

const PENDING = listing({ id: '1', title: 'Depa pendiente', status: 'pending' });
const APPROVED = listing({ id: '2', title: 'Casa aprobada', status: 'approved', property_type: 'Casa' });
const REJECTED = listing({ id: '3', title: 'Cuarto rechazado', status: 'rejected', rejectionReason: 'Fotos borrosas' });

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  mockAuth.user = { id: 7, email: 'ana@mail.com' };
  getMock.mockResolvedValue([PENDING, APPROVED, REJECTED]);
  mockDeleteAsync.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

// La cabecera se pinta antes que las tarjetas: el primer texto con la etiqueta es la pestaña del filtro.
const tab = (label: string) => screen.getAllByText(label)[0];

describe('MyListingsPanel carga', () => {
  it('muestra el indicador de carga mientras llegan los datos', async () => {
    getMock.mockReturnValue(new Promise(() => {}));
    await render(<MyListingsPanel />);
    expect(screen.getByText('Cargando publicaciones…')).toBeTruthy();
  });

  it('pide las publicaciones del usuario con su id como texto', async () => {
    await render(<MyListingsPanel />);
    expect(getMock).toHaveBeenCalledWith('7');
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('sin usuario no pide nada', async () => {
    mockAuth.user = null;
    await render(<MyListingsPanel />);
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.getByText('Cargando publicaciones…')).toBeTruthy();
  });

  it('con datos oculta la carga y muestra el total', async () => {
    await render(<MyListingsPanel />);
    expect(screen.queryByText('Cargando publicaciones…')).toBeNull();
    expect(screen.getByText('3 propiedades')).toBeTruthy();
  });

  it('el total usa singular con una sola publicación', async () => {
    getMock.mockResolvedValue([PENDING]);
    await render(<MyListingsPanel />);
    expect(screen.getByText('1 propiedad')).toBeTruthy();
  });

  it('sin publicaciones muestra el estado vacío', async () => {
    getMock.mockResolvedValue([]);
    await render(<MyListingsPanel />);
    expect(screen.getByText('0 propiedades')).toBeTruthy();
    expect(screen.getByText('Sin publicaciones')).toBeTruthy();
    expect(screen.getByText('Tus anuncios de vivienda aparecerán aquí.')).toBeTruthy();
  });
});

describe('MyListingsPanel errores', () => {
  it('muestra el mensaje del error y permite reintentar', async () => {
    getMock.mockRejectedValueOnce(new Error('Sin conexión'));
    await render(<MyListingsPanel />);
    expect(screen.getByText('Sin conexión')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Sin conexión')).toBeNull();
    expect(screen.getByText('Depa pendiente')).toBeTruthy();
  });

  it('un error que no es Error usa el mensaje genérico', async () => {
    getMock.mockRejectedValueOnce('boom');
    await render(<MyListingsPanel />);
    expect(screen.getByText('Error al cargar publicaciones')).toBeTruthy();
  });

  it('si el reintento vuelve a fallar sigue mostrando el error', async () => {
    getMock.mockRejectedValue(new Error('Sin conexión'));
    await render(<MyListingsPanel />);
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(screen.getByText('Sin conexión')).toBeTruthy();
  });
});

describe('MyListingsPanel tarjetas', () => {
  it('muestra los datos de cada vivienda', async () => {
    getMock.mockResolvedValue([
      listing({ title: 'Depa uno', district: 'Barranco', bedrooms: 3, bathrooms: 1, total_area_sqm: 95, price: 3100 }),
    ]);
    await render(<MyListingsPanel />);
    expect(screen.getByText('Depa uno')).toBeTruthy();
    expect(screen.getByText('Barranco')).toBeTruthy();
    expect(screen.getByText('Departamento')).toBeTruthy();
    expect(screen.getByText('3 hab.')).toBeTruthy();
    expect(screen.getByText('1 baño')).toBeTruthy();
    expect(screen.getByText('95 m²')).toBeTruthy();
    expect(screen.getByText(formatPrice(3100, 'PEN'))).toBeTruthy();
    expect(screen.getByText('/mes')).toBeTruthy();
    expect(screen.getByText(/^Publicado:/)).toBeTruthy();
  });

  it('pluraliza los baños', async () => {
    getMock.mockResolvedValue([listing({ bathrooms: 2 })]);
    await render(<MyListingsPanel />);
    expect(screen.getByText('2 baños')).toBeTruthy();
  });

  it('usa la primera foto como imagen principal', async () => {
    getMock.mockResolvedValue([listing()]);
    await render(<MyListingsPanel />);
    const image = screen.container.queryAll((n) => n.type === 'Image')[0];
    expect(image.props.source).toEqual({ uri: 'https://img/1.jpg' });
    expect(screen.queryByText('Sin fotos')).toBeNull();
  });

  it('sin fotos muestra el marcador de posición', async () => {
    getMock.mockResolvedValue([listing({ images: [] })]);
    await render(<MyListingsPanel />);
    expect(screen.getByText('Sin fotos')).toBeTruthy();
    expect(screen.container.queryAll((n) => n.type === 'Image')).toHaveLength(0);
  });

  it('un estado desconocido se muestra como pendiente', async () => {
    getMock.mockResolvedValue([listing({ status: 'otro' })]);
    await render(<MyListingsPanel />);
    expect(screen.getAllByText('Pendiente')).toHaveLength(2);
  });

  it('un anuncio rechazado muestra el motivo', async () => {
    getMock.mockResolvedValue([REJECTED]);
    await render(<MyListingsPanel />);
    expect(screen.getByText('Motivo: Fotos borrosas')).toBeTruthy();
  });

  it('un rechazo sin motivo o con motivo en blanco muestra el texto genérico', async () => {
    getMock.mockResolvedValue([
      { ...REJECTED, id: 'a', rejectionReason: null },
      { ...REJECTED, id: 'b', rejectionReason: '   ' },
    ]);
    await render(<MyListingsPanel />);
    expect(screen.getAllByText('Tu anuncio fue rechazado. Contáctanos para más detalles.')).toHaveLength(2);
  });

  it('los anuncios no rechazados no muestran nota de rechazo', async () => {
    getMock.mockResolvedValue([{ ...PENDING, rejectionReason: 'Viejo motivo' }]);
    await render(<MyListingsPanel />);
    expect(screen.queryByText(/Motivo:/)).toBeNull();
  });

  it('Editar navega a la pantalla de edición con la vivienda serializada', async () => {
    getMock.mockResolvedValue([PENDING, APPROVED]);
    await render(<MyListingsPanel />);
    await fireEvent.press(screen.getAllByText('Editar')[1]);
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/edit-housing',
      params: { data: JSON.stringify(APPROVED) },
    });
  });
});

describe('MyListingsPanel filtros', () => {
  it('muestra las pestañas Todas, Pendiente, Aprobado y Rechazado', async () => {
    await render(<MyListingsPanel />);
    expect(screen.getByText('Todas')).toBeTruthy();
    for (const label of ['Pendiente', 'Aprobado', 'Rechazado']) {
      expect(tab(label)).toBeTruthy();
    }
  });

  it('por defecto lista todas las publicaciones', async () => {
    await render(<MyListingsPanel />);
    expect(screen.getByText('Depa pendiente')).toBeTruthy();
    expect(screen.getByText('Casa aprobada')).toBeTruthy();
    expect(screen.getByText('Cuarto rechazado')).toBeTruthy();
  });

  it('filtrar por Aprobado deja solo las aprobadas y conserva el total', async () => {
    await render(<MyListingsPanel />);
    await fireEvent.press(tab('Aprobado'));
    expect(screen.getByText('Casa aprobada')).toBeTruthy();
    expect(screen.queryByText('Depa pendiente')).toBeNull();
    expect(screen.queryByText('Cuarto rechazado')).toBeNull();
    expect(screen.getByText('3 propiedades')).toBeTruthy();
  });

  it('filtrar por Rechazado y por Pendiente muestra cada grupo', async () => {
    await render(<MyListingsPanel />);
    await fireEvent.press(tab('Rechazado'));
    expect(screen.getByText('Cuarto rechazado')).toBeTruthy();
    expect(screen.queryByText('Casa aprobada')).toBeNull();
    await fireEvent.press(tab('Pendiente'));
    expect(screen.getByText('Depa pendiente')).toBeTruthy();
    expect(screen.queryByText('Cuarto rechazado')).toBeNull();
  });

  it('un filtro sin resultados muestra el estado vacío y Todas restaura la lista', async () => {
    getMock.mockResolvedValue([PENDING]);
    await render(<MyListingsPanel />);
    await fireEvent.press(tab('Aprobado'));
    expect(screen.getByText('Sin publicaciones')).toBeTruthy();
    await fireEvent.press(screen.getByText('Todas'));
    expect(screen.getByText('Depa pendiente')).toBeTruthy();
    expect(screen.queryByText('Sin publicaciones')).toBeNull();
  });
});

describe('MyListingsPanel actualizar', () => {
  const scrollWithRefresh = () => screen.container.queryAll((n) => !!n.props.refreshControl)[0];

  it('deslizar para actualizar mantiene la lista visible mientras carga', async () => {
    await render(<MyListingsPanel />);
    let release!: (v: any) => void;
    getMock.mockReturnValue(new Promise((r) => (release = r)));
    await act(async () => {
      scrollWithRefresh().props.refreshControl.props.onRefresh();
    });
    expect(screen.queryByText('Cargando publicaciones…')).toBeNull();
    expect(screen.getByText('Depa pendiente')).toBeTruthy();
    expect(scrollWithRefresh().props.refreshControl.props.refreshing).toBe(true);
    await act(async () => {
      release([APPROVED]);
    });
    expect(scrollWithRefresh().props.refreshControl.props.refreshing).toBe(false);
    expect(screen.getByText('Casa aprobada')).toBeTruthy();
    expect(screen.queryByText('Depa pendiente')).toBeNull();
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});

describe('MyListingsPanel eliminar publicación', () => {
  const confirmButtons = () => alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as any[];
  const pressConfirm = async () => {
    await act(async () => {
      await confirmButtons().find((b) => b.text === 'Eliminar').onPress();
    });
  };

  it('cada tarjeta tiene su botón Eliminar', async () => {
    await render(<MyListingsPanel />);
    expect(screen.getAllByText('Eliminar')).toHaveLength(3);
  });

  it('pide confirmación con el título y no elimina todavía', async () => {
    await render(<MyListingsPanel />);
    await fireEvent.press(screen.getAllByText('Eliminar')[0]);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('Eliminar publicación');
    expect(alertSpy.mock.calls[0][1]).toContain('Depa pendiente');
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('Cancelar no elimina nada', async () => {
    await render(<MyListingsPanel />);
    await fireEvent.press(screen.getAllByText('Eliminar')[0]);
    const cancel = confirmButtons().find((b) => b.text === 'Cancelar');
    expect(cancel.style).toBe('cancel');
    expect(cancel.onPress).toBeUndefined();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    expect(screen.getByText('3 propiedades')).toBeTruthy();
  });

  it('confirmar elimina la publicación elegida con su id numérico y la quita de la lista', async () => {
    await render(<MyListingsPanel />);
    await fireEvent.press(screen.getAllByText('Eliminar')[1]);
    await pressConfirm();
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).toHaveBeenCalledWith(2);
    expect(screen.queryByText('Casa aprobada')).toBeNull();
    expect(screen.getByText('Depa pendiente')).toBeTruthy();
    expect(screen.getByText('Cuarto rechazado')).toBeTruthy();
    expect(screen.getByText('2 propiedades')).toBeTruthy();
  });

  it('si el servidor falla avisa del error y conserva la publicación', async () => {
    mockDeleteAsync.mockRejectedValue(new Error('403'));
    await render(<MyListingsPanel />);
    await fireEvent.press(screen.getAllByText('Eliminar')[1]);
    await pressConfirm();
    expect(alertSpy).toHaveBeenLastCalledWith('Error', 'No se pudo eliminar la publicación.');
    expect(screen.getByText('Casa aprobada')).toBeTruthy();
    expect(screen.getByText('3 propiedades')).toBeTruthy();
    expect(screen.getAllByText('Eliminar')).toHaveLength(3);
  });

  it('mientras elimina deshabilita el botón de esa tarjeta y muestra el indicador', async () => {
    let release!: () => void;
    mockDeleteAsync.mockReturnValue(new Promise<void>((r) => (release = r)));
    await render(<MyListingsPanel />);
    await fireEvent.press(screen.getAllByText('Eliminar')[0]);
    let pending!: Promise<void>;
    await act(async () => {
      pending = confirmButtons().find((b) => b.text === 'Eliminar').onPress();
    });
    expect(screen.getAllByText('Eliminar')).toHaveLength(2);
    const disabled = screen.container.queryAll((n) => n.props.accessibilityState?.disabled === true);
    // Eliminar y Editar de la tarjeta en curso quedan deshabilitados.
    expect(disabled).toHaveLength(2);
    await act(async () => {
      release();
      await pending;
    });
    expect(screen.queryByText('Depa pendiente')).toBeNull();
  });

  it('la publicación se puede eliminar en cualquier estado (pendiente, aprobada o rechazada)', async () => {
    await render(<MyListingsPanel />);
    for (const [i, id] of [[0, 1], [0, 2], [0, 3]] as const) {
      await fireEvent.press(screen.getAllByText('Eliminar')[i]);
      await pressConfirm();
      expect(mockDeleteAsync).toHaveBeenLastCalledWith(id);
    }
    expect(screen.queryByText('Eliminar')).toBeNull();
  });
});
