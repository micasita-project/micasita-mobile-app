import React, { useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AddressSearchInput } from '@/shared/ui/AddressSearchInput';
import { searchAddress, type GeocodeSuggestion } from '@/shared/api/geocode.service';
import { allByType, flat } from '@/__tests__/_helpers/ui/host';

jest.mock('@/shared/api/geocode.service', () => ({ searchAddress: jest.fn() }));
jest.mock('@gorhom/bottom-sheet', () => require('@/__tests__/_helpers/ui/mockGorhom').gorhomModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/ui/mockIcons'));

const mockSearch = searchAddress as jest.Mock;

const s1: GeocodeSuggestion = {
  display_name: 'Av. Larco 123, Miraflores',
  latitude: -12.12,
  longitude: -77.03,
  place_type: 'road',
  district: 'Miraflores',
};
const s2: GeocodeSuggestion = {
  display_name: 'Av. Larco 900, Miraflores',
  latitude: -12.13,
  longitude: -77.04,
  place_type: 'road',
};

function Harness({
  onChangeText,
  onSelect,
  initial = '',
  ...rest
}: {
  onChangeText?: (t: string) => void;
  onSelect?: (s: GeocodeSuggestion) => void;
  initial?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <AddressSearchInput
      value={value}
      onChangeText={(t) => {
        setValue(t);
        onChangeText?.(t);
      }}
      onSelect={onSelect ?? (() => {})}
      {...rest}
    />
  );
}

async function setup(props: React.ComponentProps<typeof Harness> = {}) {
  const utils = await render(<Harness {...props} />);
  const input = () => utils.getByPlaceholderText(props.placeholder ?? 'Buscar dirección...');
  const type = async (text: string) => {
    await act(async () => {
      fireEvent.changeText(input(), text);
    });
  };
  const advance = async (ms: number) => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms);
    });
  };
  const spinners = () => allByType(utils.root!, 'ActivityIndicator');
  return { ...utils, input, type, advance, spinners };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockSearch.mockReset();
  mockSearch.mockResolvedValue([s1, s2]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AddressSearchInput campo', () => {
  it('usa el marcador de posición por defecto y uno personalizado', async () => {
    const a = await setup();
    expect(a.getByPlaceholderText('Buscar dirección...')).toBeTruthy();
    await a.unmount();
    const b = await setup({ placeholder: 'Tu dirección' });
    expect(b.getByPlaceholderText('Tu dirección')).toBeTruthy();
  });

  it('muestra el valor recibido y avisa de cada cambio con onChangeText', async () => {
    const onChangeText = jest.fn();
    const { type, getByDisplayValue } = await setup({ initial: 'hola', onChangeText });
    expect(getByDisplayValue('hola')).toBeTruthy();
    await type('ho');
    expect(onChangeText).toHaveBeenCalledWith('ho');
  });

  it('reenvía autoFocus al campo', async () => {
    const { input } = await setup({ autoFocus: true });
    expect(input().props.autoFocus).toBe(true);
  });

  it('autoFocus es false por defecto', async () => {
    const { input } = await setup();
    expect(input().props.autoFocus).toBeFalsy();
  });
});

describe('AddressSearchInput búsqueda con debounce', () => {
  it('no busca con menos de 3 caracteres', async () => {
    const { type, advance, spinners } = await setup();
    await type('ca');
    await advance(1000);
    expect(mockSearch).not.toHaveBeenCalled();
    expect(spinners()).toHaveLength(0);
  });

  it('los espacios no cuentan para el mínimo de 3 caracteres', async () => {
    const { type, advance } = await setup();
    await type('  a ');
    await advance(1000);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('espera 400 ms antes de buscar', async () => {
    const { type, advance } = await setup();
    await type('lar');
    await advance(399);
    expect(mockSearch).not.toHaveBeenCalled();
    await advance(1);
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('lar');
  });

  it('cada pulsación reinicia el temporizador y solo se busca el último texto', async () => {
    const { type, advance } = await setup();
    await type('lar');
    await advance(300);
    await type('larc');
    await advance(300);
    await type('larco');
    await advance(399);
    expect(mockSearch).not.toHaveBeenCalled();
    await advance(1);
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('larco');
  });

  it('borrar por debajo de 3 caracteres cancela la búsqueda pendiente', async () => {
    const { type, advance } = await setup();
    await type('lar');
    await advance(200);
    await type('la');
    await advance(1000);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('muestra el indicador de carga mientras espera y mientras consulta', async () => {
    let resolve!: (v: GeocodeSuggestion[]) => void;
    mockSearch.mockReturnValue(new Promise((r) => (resolve = r)));
    const { type, advance, spinners } = await setup();
    await type('lar');
    expect(spinners()).toHaveLength(1);
    await advance(400);
    expect(spinners()).toHaveLength(1);
    await act(async () => resolve([s1]));
    expect(spinners()).toHaveLength(0);
  });
});

describe('AddressSearchInput sugerencias', () => {
  it('muestra todas las sugerencias devueltas', async () => {
    const { type, advance, getByText } = await setup();
    await type('larco');
    await advance(400);
    expect(getByText(s1.display_name)).toBeTruthy();
    expect(getByText(s2.display_name)).toBeTruthy();
  });

  it('no muestra sugerencias antes de que termine el debounce', async () => {
    const { type, queryByText } = await setup();
    await type('larco');
    expect(queryByText(s1.display_name)).toBeNull();
  });

  it('al elegir una sugerencia llama a onSelect con ella y cierra la lista', async () => {
    const onSelect = jest.fn();
    const { type, advance, getByText, queryByText } = await setup({ onSelect });
    await type('larco');
    await advance(400);
    await act(async () => {
      fireEvent.press(getByText(s2.display_name));
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(s2);
    expect(queryByText(s1.display_name)).toBeNull();
    expect(queryByText(s2.display_name)).toBeNull();
  });

  it('tras elegir no aparece "sin resultados"', async () => {
    const { type, advance, getByText, queryByText } = await setup();
    await type('larco');
    await advance(400);
    await act(async () => {
      fireEvent.press(getByText(s1.display_name));
    });
    expect(queryByText(/Sin resultados/)).toBeNull();
  });

  it('borrar el texto por debajo de 3 caracteres oculta las sugerencias', async () => {
    const { type, advance, queryByText } = await setup();
    await type('larco');
    await advance(400);
    await type('la');
    expect(queryByText(s1.display_name)).toBeNull();
  });

  it('el campo se puede volver a buscar tras elegir', async () => {
    const { type, advance } = await setup();
    await type('larco');
    await advance(400);
    await type('larcos');
    await advance(400);
    expect(mockSearch).toHaveBeenCalledTimes(2);
    expect(mockSearch).toHaveBeenLastCalledWith('larcos');
  });
});

describe('AddressSearchInput sin resultados y errores', () => {
  const MSG = 'Sin resultados. Intenta con otra dirección o elige en el mapa.';

  it('muestra el aviso cuando la búsqueda no devuelve nada', async () => {
    mockSearch.mockResolvedValue([]);
    const { type, advance, getByText } = await setup();
    await type('zzzz');
    await advance(400);
    expect(getByText(MSG)).toBeTruthy();
  });

  it('no muestra el aviso mientras busca', async () => {
    mockSearch.mockReturnValue(new Promise(() => {}));
    const { type, advance, queryByText } = await setup();
    await type('zzzz');
    await advance(400);
    expect(queryByText(MSG)).toBeNull();
  });

  it('no muestra el aviso si el texto es corto', async () => {
    const { type, advance, queryByText } = await setup();
    await type('zz');
    await advance(400);
    expect(queryByText(MSG)).toBeNull();
  });

  it('un error del servicio se trata como sin resultados y apaga el indicador', async () => {
    mockSearch.mockRejectedValue(new Error('red caída'));
    const { type, advance, getByText, spinners } = await setup();
    await type('larco');
    await advance(400);
    expect(getByText(MSG)).toBeTruthy();
    expect(spinners()).toHaveLength(0);
  });

  it('tras un error una nueva búsqueda correcta muestra las sugerencias', async () => {
    mockSearch.mockRejectedValueOnce(new Error('falla'));
    const { type, advance, getByText, queryByText } = await setup();
    await type('larco');
    await advance(400);
    await type('larcos');
    await advance(400);
    expect(queryByText(MSG)).toBeNull();
    expect(getByText(s1.display_name)).toBeTruthy();
  });
});

describe('AddressSearchInput foco y desenfoque', () => {
  it('al perder el foco cierra la lista tras 160 ms de gracia', async () => {
    const { type, advance, input, getByText, queryByText } = await setup();
    await type('larco');
    await advance(400);
    await act(async () => {
      fireEvent(input(), 'blur');
    });
    await advance(159);
    expect(getByText(s1.display_name)).toBeTruthy();
    await advance(1);
    expect(queryByText(s1.display_name)).toBeNull();
  });

  it('una sugerencia se puede elegir dentro del margen de gracia del desenfoque', async () => {
    const onSelect = jest.fn();
    const { type, advance, input, getByText } = await setup({ onSelect });
    await type('larco');
    await advance(400);
    await act(async () => {
      fireEvent(input(), 'blur');
    });
    await advance(100);
    await act(async () => {
      fireEvent.press(getByText(s1.display_name));
    });
    expect(onSelect).toHaveBeenCalledWith(s1);
  });

  it('al volver al foco reabre las sugerencias existentes', async () => {
    const { type, advance, input, getByText, queryByText } = await setup();
    await type('larco');
    await advance(400);
    await act(async () => {
      fireEvent(input(), 'blur');
    });
    await advance(200);
    expect(queryByText(s1.display_name)).toBeNull();
    await act(async () => {
      fireEvent(input(), 'focus');
    });
    expect(getByText(s1.display_name)).toBeTruthy();
  });

  it('al volver al foco reabre el aviso de sin resultados', async () => {
    mockSearch.mockResolvedValue([]);
    const { type, advance, input, getByText, queryByText } = await setup();
    await type('zzzz');
    await advance(400);
    await act(async () => {
      fireEvent(input(), 'blur');
    });
    await advance(200);
    expect(queryByText(/Sin resultados/)).toBeNull();
    await act(async () => {
      fireEvent(input(), 'focus');
    });
    expect(getByText(/Sin resultados/)).toBeTruthy();
  });

  it('el foco sin búsquedas previas no abre nada', async () => {
    const { input, queryByText, spinners } = await setup({ initial: 'larco' });
    await act(async () => {
      fireEvent(input(), 'focus');
    });
    expect(queryByText(/Sin resultados/)).toBeNull();
    expect(spinners()).toHaveLength(0);
  });
});

describe('AddressSearchInput estado intermedio', () => {
  const MSG = 'Sin resultados. Intenta con otra dirección o elige en el mapa.';
  const dropdown = (root: any) => root.queryAll((i: any) => flat(i).elevation === 8);

  it('muestra la lista (aún vacía) mientras busca', async () => {
    const { type, root } = await setup();
    await type('larco');
    expect(dropdown(root)).toHaveLength(1);
  });

  it('no muestra la lista con un texto corto', async () => {
    const { type, root } = await setup();
    await type('la');
    expect(dropdown(root)).toHaveLength(0);
  });

  it('borrar por debajo de 3 caracteres con una búsqueda pendiente cierra la lista', async () => {
    const { type, root } = await setup();
    await type('lar');
    await type('la');
    expect(dropdown(root)).toHaveLength(0);
  });

  it('el aviso de sin resultados se oculta mientras corre una nueva búsqueda', async () => {
    mockSearch.mockResolvedValueOnce([]);
    const { type, advance, getByText, queryByText } = await setup();
    await type('zzzz');
    await advance(400);
    expect(getByText(MSG)).toBeTruthy();
    mockSearch.mockReturnValue(new Promise(() => {}));
    await type('zzzzz');
    expect(queryByText(MSG)).toBeNull();
  });

  it('elegir una sugerencia mientras hay otra búsqueda pendiente no reabre la lista al llegar sus resultados', async () => {
    const { type, advance, getByText, queryByText } = await setup();
    await type('larco');
    await advance(400);
    await type('larcos');
    await act(async () => {
      fireEvent.press(getByText(s1.display_name));
    });
    await advance(400);
    expect(queryByText(s1.display_name)).toBeNull();
    expect(queryByText(s2.display_name)).toBeNull();
  });

  it('borrar por debajo de 3 caracteres con una búsqueda pendiente apaga el indicador de carga', async () => {
    const { type, advance, spinners } = await setup();
    await type('lar');
    await advance(100);
    await type('la');
    await advance(1000);
    expect(spinners()).toHaveLength(0);
  });
});

describe('AddressSearchInput respuestas fuera de orden', () => {
  it('una respuesta tardía de un texto anterior no debe pisar la del texto actual', async () => {
    const resolvers: Array<(v: GeocodeSuggestion[]) => void> = [];
    mockSearch.mockImplementation(() => new Promise((r) => resolvers.push(r)));
    const { type, advance, queryByText } = await setup();
    await type('larc');
    await advance(400);
    await type('larco');
    await advance(400);
    await act(async () => resolvers[1]([s2]));
    await act(async () => resolvers[0]([s1]));
    expect(queryByText(s1.display_name)).toBeNull();
    expect(queryByText(s2.display_name)).toBeTruthy();
  });

  it('una respuesta pendiente no debe reabrir sugerencias tras borrar el texto', async () => {
    let resolve!: (v: GeocodeSuggestion[]) => void;
    mockSearch.mockReturnValue(new Promise((r) => (resolve = r)));
    const { type, advance, input, queryByText } = await setup();
    await type('larc');
    await advance(400);
    await type('la');
    await act(async () => resolve([s1]));
    await type('lar');
    await act(async () => {
      fireEvent(input(), 'focus');
    });
    expect(queryByText(s1.display_name)).toBeNull();
  });
});
