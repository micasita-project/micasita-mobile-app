import React from 'react';
import { Dimensions } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { resetGestures, flushReactions, slideGestures } from '@/__tests__/_helpers/ui/mockGestures';
import { allByType, flat } from '@/__tests__/_helpers/ui/host';

jest.mock('react-native-gesture-handler', () => require('@/__tests__/_helpers/ui/mockGestures').gestureHandlerModule);
jest.mock('react-native-reanimated', () => require('@/__tests__/_helpers/ui/mockGestures').reanimatedModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/ui/mockIcons'));

const W = Dimensions.get('window').width;
const sources = [{ uri: 'a.jpg' }, { uri: 'b.jpg' }, { uri: 'c.jpg' }];

beforeEach(resetGestures);

const scroller = (root: any) => root.queryAll((i: any) => i.props.horizontal === true)[0];

describe('ImageLightbox', () => {
  it('no renderiza nada sin imágenes', async () => {
    const { toJSON } = await render(<ImageLightbox sources={[]} onClose={() => {}} />);
    expect(toJSON()).toBeNull();
  });

  it('muestra el contador 1 / N por defecto', async () => {
    const { getByText } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
    expect(getByText('1 / 3')).toBeTruthy();
  });

  it('initialIndex fija el contador inicial', async () => {
    const { getByText } = await render(
      <ImageLightbox sources={sources} initialIndex={2} onClose={() => {}} />,
    );
    expect(getByText('3 / 3')).toBeTruthy();
  });

  it('initialIndex posiciona la lista en esa imagen', async () => {
    const { root } = await render(<ImageLightbox sources={sources} initialIndex={2} onClose={() => {}} />);
    expect(scroller(root).props.initialScrollIndex).toBe(2);
  });

  it('muestra las imágenes con sus fuentes', async () => {
    const { getAllByTestId } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
    expect(getAllByTestId('lightbox-image').map((i) => i.props.source)).toEqual(sources);
    expect(getAllByTestId('lightbox-image')[0].props.resizeMode).toBe('contain');
  });

  it('el botón de cierre llama a onClose', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(<ImageLightbox sources={sources} onClose={onClose} />);
    await act(async () => {
      fireEvent.press(getByTestId('icon-close'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el botón atrás del sistema (onRequestClose) llama a onClose', async () => {
    const onClose = jest.fn();
    const { root } = await render(<ImageLightbox sources={sources} onClose={onClose} />);
    const modal = allByType(root!, 'Modal')[0];
    await act(async () => modal.props.onRequestClose());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el modal es visible y transparente', async () => {
    const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
    const modal = allByType(root!, 'Modal')[0];
    expect(modal.props.visible).toBe(true);
    expect(modal.props.transparent).toBe(true);
  });

  it('el cierre queda por debajo del área segura superior', async () => {
    const { getByTestId } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
    expect(flat(getByTestId('icon-close').parent!).top).toBe(50);
  });

  describe('indicadores de puntos', () => {
    const dots = (root: any) => root.queryAll((i: any) => flat(i).width === 6 || flat(i).width === 18);

    it('hay un punto por imagen', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      expect(dots(root)).toHaveLength(3);
    });

    it('con una sola imagen no hay puntos', async () => {
      const { root } = await render(<ImageLightbox sources={[sources[0]]} onClose={() => {}} />);
      expect(dots(root)).toHaveLength(0);
    });

    it('el punto activo es el más ancho', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      expect(dots(root).map((d: any) => flat(d).width)).toEqual([18, 6, 6]);
    });
  });

  describe('deslizamiento', () => {
    it('al terminar de deslizar actualiza el contador y el punto activo', async () => {
      const { root, getByText } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      await act(async () => {
        fireEvent(scroller(root), 'momentumScrollEnd', {
          nativeEvent: { contentOffset: { x: W * 2 } },
        });
      });
      expect(getByText('3 / 3')).toBeTruthy();
      const dots = root!.queryAll((i: any) => flat(i).width === 6 || flat(i).width === 18);
      expect(dots.map((d: any) => flat(d).width)).toEqual([6, 6, 18]);
    });

    it('redondea el desplazamiento a la imagen más cercana', async () => {
      const { root, getByText } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      await act(async () => {
        fireEvent(scroller(root), 'momentumScrollEnd', {
          nativeEvent: { contentOffset: { x: W * 0.9 } },
        });
      });
      expect(getByText('2 / 3')).toBeTruthy();
    });

    it('la lista pagina en horizontal y se puede deslizar por defecto', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      expect(scroller(root).props.pagingEnabled).toBe(true);
      expect(scroller(root).props.scrollEnabled).toBe(true);
    });

    it('getItemLayout asigna a cada imagen el ancho de pantalla', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      expect(scroller(root).props.getItemLayout(null, 2)).toEqual({ length: W, offset: W * 2, index: 2 });
    });
  });

  describe('zoom', () => {
    it('al ampliar una imagen se bloquea el deslizamiento entre imágenes', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { tap } = slideGestures(0);
      await act(async () => {
        tap.handlers.onEnd();
        flushReactions();
      });
      expect(scroller(root).props.scrollEnabled).toBe(false);
    });

    it('un segundo doble toque restablece el zoom y devuelve el deslizamiento', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { tap } = slideGestures(0);
      await act(async () => {
        tap.handlers.onEnd();
        flushReactions();
      });
      await act(async () => {
        tap.handlers.onEnd();
        flushReactions();
      });
      expect(scroller(root).props.scrollEnabled).toBe(true);
    });

    it('el doble toque amplía a 2.5x', async () => {
      const { getAllByTestId, rerender } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      await act(async () => slideGestures(0).tap.handlers.onEnd());
      await rerender(<ImageLightbox sources={sources} onClose={() => {}} />);
      const t = flat(getAllByTestId('lightbox-image')[0]).transform;
      expect(t).toContainEqual({ scale: 2.5 });
    });

    it('el doble toque solo exige dos toques rápidos', async () => {
      await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { tap } = slideGestures(0);
      expect(tap.config.numberOfTaps).toBe(2);
      expect(tap.config.maxDuration).toBe(300);
    });

    it('al pellizcar se marca como ampliado y se limita la escala entre 1x y 5x', async () => {
      const { getAllByTestId, root, rerender } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { pinch } = slideGestures(0);
      const scaleOf = async () => {
        await rerender(<ImageLightbox sources={sources} onClose={() => {}} />);
        return flat(getAllByTestId('lightbox-image')[0]).transform.find((t: any) => 'scale' in t).scale;
      };
      await act(async () => {
        pinch.handlers.onStart();
        flushReactions();
      });
      expect(scroller(root).props.scrollEnabled).toBe(false);
      await act(async () => pinch.handlers.onUpdate({ scale: 3 }));
      expect(await scaleOf()).toBe(3);
      await act(async () => pinch.handlers.onUpdate({ scale: 9 }));
      expect(await scaleOf()).toBe(5);
      await act(async () => pinch.handlers.onUpdate({ scale: 0.2 }));
      expect(await scaleOf()).toBe(1);
    });

    it('al soltar un pellizco casi sin zoom se restablece y desbloquea el deslizamiento', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { pinch } = slideGestures(0);
      await act(async () => {
        pinch.handlers.onStart();
        pinch.handlers.onUpdate({ scale: 1.02 });
        pinch.handlers.onEnd();
        flushReactions();
      });
      expect(scroller(root).props.scrollEnabled).toBe(true);
    });

    it('al soltar un pellizco con zoom real se mantiene ampliado', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { pinch } = slideGestures(0);
      await act(async () => {
        pinch.handlers.onStart();
        pinch.handlers.onUpdate({ scale: 2 });
        pinch.handlers.onEnd();
        flushReactions();
      });
      expect(scroller(root).props.scrollEnabled).toBe(false);
    });

    it('un pellizco por encima de 1.05x se conserva al soltarlo', async () => {
      const { root } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { pinch } = slideGestures(0);
      await act(async () => {
        pinch.handlers.onStart();
        pinch.handlers.onUpdate({ scale: 1.3 });
        pinch.handlers.onEnd();
        flushReactions();
      });
      expect(scroller(root).props.scrollEnabled).toBe(false);
    });

    it('tras restablecer el zoom, un nuevo pellizco parte de la escala 1x', async () => {
      const { getAllByTestId, rerender } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { tap, pinch } = slideGestures(0);
      await act(async () => {
        tap.handlers.onEnd();
        tap.handlers.onEnd();
        pinch.handlers.onUpdate({ scale: 2 });
      });
      await rerender(<ImageLightbox sources={sources} onClose={() => {}} />);
      const t = flat(getAllByTestId('lightbox-image')[0]).transform;
      expect(t).toContainEqual({ scale: 2 });
    });

    it('el arrastre de un dedo solo se activa con zoom; sin zoom cede el gesto a la lista', async () => {
      await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { pan, pinch } = slideGestures(0);
      const manager = { activate: jest.fn(), fail: jest.fn() };
      await act(async () => pan.handlers.onTouchesMove({}, manager));
      expect(manager.fail).toHaveBeenCalledTimes(1);
      expect(manager.activate).not.toHaveBeenCalled();

      await act(async () => {
        pinch.handlers.onStart();
        pinch.handlers.onUpdate({ scale: 2 });
      });
      await act(async () => pan.handlers.onTouchesMove({}, manager));
      expect(manager.activate).toHaveBeenCalledTimes(1);
    });

    it('el arrastre desplaza la imagen acumulando sobre la posición guardada', async () => {
      const { getAllByTestId, rerender } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      const { pan } = slideGestures(0);
      await act(async () => {
        pan.handlers.onUpdate({ translationX: 30, translationY: -10 });
        pan.handlers.onEnd();
        pan.handlers.onUpdate({ translationX: 5, translationY: 5 });
      });
      await rerender(<ImageLightbox sources={sources} onClose={() => {}} />);
      const t = flat(getAllByTestId('lightbox-image')[0]).transform;
      expect(t).toContainEqual({ translateX: 35 });
      expect(t).toContainEqual({ translateY: -5 });
    });

    it('el arrastre usa activación manual', async () => {
      await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      expect(slideGestures(0).pan.config.manualActivation).toBe(true);
    });

    it('cada imagen lleva su propio estado de zoom', async () => {
      const { getAllByTestId, rerender } = await render(<ImageLightbox sources={sources} onClose={() => {}} />);
      await act(async () => slideGestures(0).tap.handlers.onEnd());
      await rerender(<ImageLightbox sources={sources} onClose={() => {}} />);
      const scale = (i: number) =>
        flat(getAllByTestId('lightbox-image')[i]).transform.find((t: any) => 'scale' in t).scale;
      expect(scale(0)).toBe(2.5);
      expect(scale(1)).toBe(1);
    });
  });
});
