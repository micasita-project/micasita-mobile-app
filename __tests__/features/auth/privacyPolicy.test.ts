import {
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_DATE,
  PRIVACY_POLICY_SECTIONS,
} from '@/features/auth/model/privacyPolicy';

describe('privacyPolicy', () => {
  it('expone la versión 1.0 que debe coincidir con el backend', () => {
    expect(PRIVACY_POLICY_VERSION).toBe('1.0');
  });

  it('expone una fecha con formato dd/MM/yyyy válida', () => {
    expect(PRIVACY_POLICY_DATE).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    const [d, m] = PRIVACY_POLICY_DATE.split('/').map(Number);
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThanOrEqual(31);
    expect(m).toBeGreaterThanOrEqual(1);
    expect(m).toBeLessThanOrEqual(12);
  });

  it('tiene 8 secciones', () => {
    expect(PRIVACY_POLICY_SECTIONS).toHaveLength(8);
  });

  it('numera los títulos de forma consecutiva desde 1', () => {
    PRIVACY_POLICY_SECTIONS.forEach((section, i) => {
      expect(section.title.startsWith(`${i + 1}. `)).toBe(true);
    });
  });

  it('cada sección tiene al menos un párrafo y ninguno vacío', () => {
    for (const section of PRIVACY_POLICY_SECTIONS) {
      expect(section.paragraphs.length).toBeGreaterThan(0);
      for (const p of section.paragraphs) {
        expect(p.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('no repite títulos', () => {
    const titles = PRIVACY_POLICY_SECTIONS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('cubre los temas legales clave (Ley 29733, derechos, conservación)', () => {
    const all = PRIVACY_POLICY_SECTIONS.map((s) => `${s.title} ${s.paragraphs.join(' ')}`).join(' ');
    expect(all).toContain('29733');
    expect(all).toContain('Tus derechos');
    expect(all).toContain('Cuánto tiempo los conservamos');
    expect(all).toContain('Modo invitado');
  });

  it('no contiene voseo', () => {
    const all = PRIVACY_POLICY_SECTIONS.map((s) => s.paragraphs.join(' ')).join(' ');
    expect(all).not.toMatch(/\b(tenés|podés|querés|vos|sos)\b/i);
  });
});
