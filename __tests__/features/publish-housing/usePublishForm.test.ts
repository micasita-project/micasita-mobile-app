jest.mock('@/features/publish-housing/model/publishHousing.service', () => ({
  submitHousingListing: jest.fn(),
  updateHousingListing: jest.fn(),
}));

import { act } from 'react-test-renderer';
import {
  submitHousingListing,
  updateHousingListing,
} from '@/features/publish-housing/model/publishHousing.service';
import { usePublishForm } from '@/features/publish-housing/model/usePublishForm';
import { mountHook } from '../../_helpers/state/mountHook';

const mockSubmit = submitHousingListing as jest.Mock;
const mockUpdate = updateHousingListing as jest.Mock;

const CUSTOM = {
  address: 'Av. Test 1',
  district: 'Surco',
  latitude: -12.1,
  longitude: -77.0,
  title: 'Mi depa',
  property_type: 'Casa',
  currency: 'USD',
  price: 500,
  total_area_sqm: 80,
  covered_area_sqm: 70,
  bedrooms: 3,
  bathrooms: 2,
  parking: 1,
  antiquity: 5,
  description: 'desc',
  phone: '999',
  localImageUris: ['a.jpg'],
  features: ['Piscina'],
} as any;

describe('usePublishForm: estado inicial', () => {
  it('arranca en el paso 1 con el borrador por defecto', () => {
    const { result } = mountHook(() => usePublishForm());
    expect(result.current.currentStep).toBe(1);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.draft).toMatchObject({
      address: '',
      district: '',
      latitude: -12.0464,
      longitude: -77.0428,
      property_type: 'Departamento',
      currency: 'PEN',
      price: 0,
      bedrooms: 1,
      bathrooms: 1,
      parking: 0,
      localImageUris: [],
      features: [],
    });
  });

  it('usa el borrador inicial recibido', () => {
    const { result } = mountHook(() => usePublishForm(CUSTOM));
    expect(result.current.draft).toEqual(CUSTOM);
  });
});

describe('usePublishForm: navegación', () => {
  it('nextStep avanza hasta el paso 4 y no pasa de ahí', () => {
    const { result } = mountHook(() => usePublishForm());
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(2);
    act(() => result.current.nextStep());
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(4);
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(4);
  });

  it('prevStep retrocede hasta el paso 1 y no baja de ahí', () => {
    const { result } = mountHook(() => usePublishForm());
    act(() => result.current.nextStep());
    act(() => result.current.nextStep());
    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(2);
    act(() => result.current.prevStep());
    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(1);
  });
});

describe('usePublishForm: updateDraft', () => {
  it('fusiona parcialmente sin perder el resto de campos', () => {
    const { result } = mountHook(() => usePublishForm());
    act(() => result.current.updateDraft({ title: 'Nuevo', price: 900 }));
    expect(result.current.draft.title).toBe('Nuevo');
    expect(result.current.draft.price).toBe(900);
    expect(result.current.draft.currency).toBe('PEN');
  });

  it('actualizaciones sucesivas se acumulan', () => {
    const { result } = mountHook(() => usePublishForm());
    act(() => result.current.updateDraft({ title: 'A' }));
    act(() => result.current.updateDraft({ district: 'B' }));
    expect(result.current.draft).toMatchObject({ title: 'A', district: 'B' });
  });
});

describe('usePublishForm: submit', () => {
  it('envía el borrador actual con usuario y correo y devuelve true', async () => {
    mockSubmit.mockResolvedValue(undefined);
    const { result } = mountHook(() => usePublishForm());
    act(() => result.current.updateDraft({ title: 'Nuevo' }));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit('u1', 'u@x.com');
    });
    expect(ok).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nuevo' }),
      'u1',
      'u@x.com',
    );
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('isSubmitting es true mientras envía', async () => {
    let resolve!: () => void;
    mockSubmit.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { result } = mountHook(() => usePublishForm());
    let p!: Promise<boolean>;
    act(() => {
      p = result.current.submit('u', 'e');
    });
    expect(result.current.isSubmitting).toBe(true);
    await act(async () => {
      resolve();
      await p;
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('error con Error: devuelve false y guarda el mensaje', async () => {
    mockSubmit.mockRejectedValue(new Error('Sin conexión'));
    const { result } = mountHook(() => usePublishForm());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit('u', 'e');
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('error que no es Error usa el mensaje desconocido', async () => {
    mockSubmit.mockRejectedValue('boom');
    const { result } = mountHook(() => usePublishForm());
    await act(async () => {
      await result.current.submit('u', 'e');
    });
    expect(result.current.error).toBe('Error desconocido');
  });

  it('un nuevo envío limpia el error previo', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(undefined);
    const { result } = mountHook(() => usePublishForm());
    await act(async () => {
      await result.current.submit('u', 'e');
    });
    expect(result.current.error).toBe('x');
    await act(async () => {
      await result.current.submit('u', 'e');
    });
    expect(result.current.error).toBeNull();
  });
});

describe('usePublishForm: update', () => {
  it('actualiza con el id y el borrador actual y devuelve true', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const { result } = mountHook(() => usePublishForm(CUSTOM));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.update('p1');
    });
    expect(ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith('p1', CUSTOM);
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('error con Error: devuelve false y guarda el mensaje', async () => {
    mockUpdate.mockRejectedValue(new Error('Falló'));
    const { result } = mountHook(() => usePublishForm());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.update('p1');
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('Falló');
  });

  it('error que no es Error usa el mensaje de actualización desconocido', async () => {
    mockUpdate.mockRejectedValue(null);
    const { result } = mountHook(() => usePublishForm());
    await act(async () => {
      await result.current.update('p1');
    });
    expect(result.current.error).toBe('Error desconocido al actualizar');
  });
});

describe('usePublishForm: reset', () => {
  it('vuelve al paso 1, borrador inicial y sin error', async () => {
    mockSubmit.mockRejectedValue(new Error('x'));
    const { result } = mountHook(() => usePublishForm());
    act(() => result.current.updateDraft({ title: 'Nuevo', price: 5 }));
    act(() => result.current.nextStep());
    await act(async () => {
      await result.current.submit('u', 'e');
    });
    expect(result.current.error).toBe('x');

    act(() => result.current.reset());
    expect(result.current.currentStep).toBe(1);
    expect(result.current.error).toBeNull();
    expect(result.current.draft.title).toBe('');
    expect(result.current.draft.price).toBe(0);
  });

  it('reset restaura el borrador pasado como inicial y no lo vacía', () => {
    const { result } = mountHook(() => usePublishForm(CUSTOM));
    act(() => result.current.updateDraft({ title: 'cambiado' }));
    act(() => result.current.reset());
    expect(result.current.draft.title).toBe(CUSTOM.title);
    expect(result.current.draft.address).toBe(CUSTOM.address);
  });
});
