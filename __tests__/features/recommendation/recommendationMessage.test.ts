import {
  scoreLabel,
  buildRecommendationMessage,
  buildInsightTitle,
  buildInsightBody,
} from '@/features/recommendation/model/recommendationMessage';
import type { RecommendationItem } from '@/features/recommendation/api/recommendation.api';

function makeItem(opts: {
  saved?: number | null;
  time?: number;
  score?: number;
  bedrooms?: number;
  area?: number;
  price?: number;
  currency?: string;
} = {}): RecommendationItem {
  return {
    property: {
      bedrooms: opts.bedrooms ?? 2,
      total_area_sqm: opts.area ?? 80,
      price: opts.price ?? 1500,
      currency: opts.currency ?? 'PEN',
    } as any,
    match_score: opts.score ?? 80,
    predicted_time_min: opts.time ?? 25,
    time_saved_mins: opts.saved === undefined ? null : opts.saved,
    franjas: null,
  };
}

describe('scoreLabel', () => {
  it.each([
    [100, 'Excelente'],
    [85, 'Excelente'],
    [84.9, 'Muy bueno'],
    [70, 'Muy bueno'],
    [69, 'Bueno'],
    [55, 'Bueno'],
    [54, 'Regular'],
    [0, 'Regular'],
  ])('score %p -> %s', (score, label) => {
    expect(scoreLabel(score)).toBe(label);
  });
});

describe('buildRecommendationMessage', () => {
  describe('con time_saved_mins', () => {
    it.each([
      [15, 'Ahorra 15 min al trabajo cada día vs tu ubicación actual.'],
      [30, 'Ahorra 30 min al trabajo cada día vs tu ubicación actual.'],
      [14.6, 'Ahorra 15 min al trabajo cada día vs tu ubicación actual.'],
      [14.4, 'Recortas 14 min de viaje diario vs donde vives ahora.'],
      [1, 'Recortas 1 min de viaje diario vs donde vives ahora.'],
      [0.5, 'Recortas 1 min de viaje diario vs donde vives ahora.'],
    ])('ahorro %p', (saved, msg) => {
      expect(buildRecommendationMessage(makeItem({ saved }))).toBe(msg);
    });

    it('redondeo a 0 indica tiempo similar', () => {
      expect(buildRecommendationMessage(makeItem({ saved: 0 }))).toBe(
        'Tiempo de viaje similar al de tu ubicación actual.',
      );
      expect(buildRecommendationMessage(makeItem({ saved: 0.4 }))).toBe(
        'Tiempo de viaje similar al de tu ubicación actual.',
      );
      expect(buildRecommendationMessage(makeItem({ saved: -0.4 }))).toBe(
        'Tiempo de viaje similar al de tu ubicación actual.',
      );
    });

    it('ahorro negativo muestra minutos extra y las características', () => {
      expect(buildRecommendationMessage(makeItem({ saved: -10 }))).toBe(
        '10 min más de viaje, pero 2 hab · 80 m² · S/ 1,500.',
      );
    });

    it('usa USD en las características cuando la moneda es USD', () => {
      expect(buildRecommendationMessage(makeItem({ saved: -5, price: 900, currency: 'USD' }))).toBe(
        '5 min más de viaje, pero 2 hab · 80 m² · USD 900.',
      );
    });

    it('omite de las características los valores en cero', () => {
      expect(buildRecommendationMessage(makeItem({ saved: -5, bedrooms: 0, area: 0, price: 1000 }))).toBe(
        '5 min más de viaje, pero S/ 1,000.',
      );
      expect(buildRecommendationMessage(makeItem({ saved: -5, bedrooms: 3, area: 0, price: 0 }))).toBe(
        '5 min más de viaje, pero 3 hab.',
      );
    });

    it('sin características usa el texto genérico', () => {
      expect(buildRecommendationMessage(makeItem({ saved: -5, bedrooms: 0, area: 0, price: 0 }))).toBe(
        '5 min más de viaje, pero buenas características.',
      );
    });
  });

  describe('sin time_saved_mins (null o no finito)', () => {
    it.each([null, NaN, Infinity, -Infinity])('time_saved_mins=%p usa el tiempo previsto', (saved) => {
      expect(buildRecommendationMessage(makeItem({ saved, time: 10 }))).toBe(
        'A solo 10 min de tu trabajo — excelente ubicación.',
      );
    });

    it.each([
      [20, 'A solo 20 min de tu trabajo — excelente ubicación.'],
      [20.4, 'A solo 20 min de tu trabajo — excelente ubicación.'],
      [20.5, 'Trayecto cómodo de 21 min al trabajo.'],
      [40.4, 'Trayecto cómodo de 40 min al trabajo.'],
      [40.5, '2 hab · 80 m² · S/ 1,500 — ideal si el espacio es prioridad.'],
      [21, 'Trayecto cómodo de 21 min al trabajo.'],
      [40, 'Trayecto cómodo de 40 min al trabajo.'],
      [41, '2 hab · 80 m² · S/ 1,500 — ideal si el espacio es prioridad.'],
    ])('tiempo previsto %p', (time, msg) => {
      expect(buildRecommendationMessage(makeItem({ saved: null, time }))).toBe(msg);
    });

    it('sin características en viaje largo usa el texto genérico', () => {
      expect(buildRecommendationMessage(makeItem({ saved: null, time: 60, bedrooms: 0, area: 0, price: 0 }))).toBe(
        'buenas características — ideal si el espacio es prioridad.',
      );
    });
  });
});

describe('buildInsightTitle', () => {
  it.each([
    [90, 'Excelente opción para ti'],
    [85, 'Excelente opción para ti'],
    [84, 'Muy buena alternativa'],
    [70, 'Muy buena alternativa'],
    [69, 'Una opción a considerar'],
    [55, 'Una opción a considerar'],
    [54, 'Revísala con cuidado'],
  ])('score %p -> %s', (score, title) => {
    expect(buildInsightTitle(makeItem({ score }))).toBe(title);
  });
});

describe('buildInsightBody', () => {
  describe('con time_saved_mins', () => {
    it.each([
      [20, 'Reducirías tu viaje diario en 20 minutos respecto a tu hogar actual. Una diferencia notable en calidad de vida.'],
      [19, 'Ahorrarías 19 minutos al trabajo cada día frente a tu ubicación actual.'],
      [5, 'Ahorrarías 5 minutos al trabajo cada día frente a tu ubicación actual.'],
      [4, 'Tiempo de viaje prácticamente igual al tuyo, con una ligera mejora de 4 min.'],
      [1, 'Tiempo de viaje prácticamente igual al tuyo, con una ligera mejora de 1 min.'],
      [0, 'El tiempo al trabajo es casi idéntico al de tu casa actual. La ventaja está en las características de la propiedad.'],
    ])('ahorro %p', (saved, msg) => {
      expect(buildInsightBody(makeItem({ saved }))).toBe(msg);
    });

    it('ahorro negativo con score >= 70 resalta las características', () => {
      expect(buildInsightBody(makeItem({ saved: -8, score: 70 }))).toBe(
        'Solo 8 min adicionales al trabajo. Las características compensan ampliamente la distancia extra.',
      );
    });

    it('ahorro negativo con score < 70 pide evaluar el cambio', () => {
      expect(buildInsightBody(makeItem({ saved: -8, score: 69 }))).toBe(
        '8 minutos más de viaje respecto a tu ubicación actual — considera si las características justifican el cambio.',
      );
    });
  });

  describe('sin time_saved_mins', () => {
    it.each([null, NaN, Infinity])('time_saved_mins=%p usa el tiempo previsto', (saved) => {
      expect(buildInsightBody(makeItem({ saved, time: 10 }))).toContain('A solo 10 minutos de tu trabajo');
    });

    it.each([
      [15, 'A solo 15 minutos de tu trabajo. Una ubicación privilegiada que puede transformar tu rutina diaria.'],
      [16, 'Trayecto cómodo de 16 minutos al trabajo, perfecto para el día a día.'],
      [30, 'Trayecto cómodo de 30 minutos al trabajo, perfecto para el día a día.'],
      [31, '31 minutos al trabajo, un recorrido manejable con tu modo de transporte habitual.'],
      [45, '45 minutos al trabajo, un recorrido manejable con tu modo de transporte habitual.'],
      [46, 'Con 46 minutos al trabajo, las características de esta vivienda son el punto fuerte a evaluar.'],
    ])('tiempo previsto %p', (time, msg) => {
      expect(buildInsightBody(makeItem({ saved: null, time }))).toBe(msg);
    });
  });
});
