import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzePerformance } from '../analysis/performance-analyzer.js';
import type { NoteEvent } from '../common/domain/music.types.js';
import { parseMusicXml } from '../scores/parsers/musicxml.parser.js';
import { RuleBasedFeedbackGenerator } from './rule-based-feedback.generator.js';

const root = join(import.meta.dirname, '..', '..', '..');
const score = parseMusicXml(readFileSync(join(import.meta.dirname, '..', 'scores', 'seed', 'ode-to-joy.musicxml'), 'utf8'));
const demo = (name: string) =>
  (JSON.parse(readFileSync(join(root, 'demo', `${name}.notes.json`), 'utf8')) as { notes: NoteEvent[] }).notes;
const perfect = (transform: (note: NoteEvent, index: number) => NoteEvent | null = (note) => note): NoteEvent[] =>
  score.notes.flatMap(({ pitch, onset, duration }, index) => {
    const note = transform({ pitch, onset, duration, velocity: 0.8 }, index);
    return note ? [note] : [];
  });

const feedback = new RuleBasedFeedbackGenerator();
const titles = (notes: NoteEvent[]) => feedback.generate(analyzePerformance(score, notes)).recommendations.map((r) => r.title);

describe('RuleBasedFeedbackGenerator', () => {
  it('explains every error in plain language, in the analysis order', () => {
    const analysis = analyzePerformance(score, demo('ode-to-joy-mistakes'));
    const { errorMessages } = feedback.generate(analysis);

    expect(errorMessages).toEqual([
      'Вместо Ми (E4) сыграна Ре (D4)',
      'Пропущена нота Ми (E4)',
      expect.stringMatching(/^Нота Соль \(G4\) вступила позже на 1\d\d мс$/),
      'Лишняя нота Ля (A4)',
    ]);
  });

  it('summarises the demo mistakes and points at the problem measures', () => {
    const result = feedback.generate(analyzePerformance(score, demo('ode-to-joy-mistakes')));

    expect(result.summary).toContain('87.1%');
    expect(result.summary).toContain('в тактах 3, 5, 6 и 7');
    expect(result.recommendations.map((r) => r.title)).toEqual(['Точность нот', 'Ритм', 'Лишние звуки', 'Сложная нота: Ми (E4)']);
    expect(result.recommendations[1].detail).toContain('метрономом на 72 BPM'); // 75% of 96
  });

  it('builds a practice plan, worst places first, and ends with a full run', () => {
    const { practicePlan } = feedback.generate(analyzePerformance(score, demo('ode-to-joy-mistakes')));

    expect(practicePlan.map((step) => step.title)).toEqual(['Такты 5–7', 'Такт 3', 'Соберите всё вместе']);
    expect(practicePlan[0]).toMatchObject({ measures: { from: 5, to: 7 }, tempoBpm: 58 }); // 60% of 96
    expect(practicePlan[2].tempoBpm).toBe(77); // 80% of 96
  });

  it('praises a clean performance and suggests a next step instead of exercises', () => {
    const result = feedback.generate(analyzePerformance(score, demo('ode-to-joy-clean')));

    expect(result.summary).toContain('Ошибок не найдено');
    expect(result.recommendations.map((r) => r.title)).toEqual(['Следующий шаг']);
    expect(result.practicePlan).toEqual([]);
  });

  it('tells a hurried player apart from a late one', () => {
    const hurried = perfect((note, i) => (i === 5 || i === 6 ? { ...note, onset: note.onset - 0.2 } : note));

    const result = feedback.generate(analyzePerformance(score, hurried));

    expect(result.recommendations[0]).toMatchObject({ title: 'Ритм', measures: [2] });
    expect(result.recommendations[0].detail).toContain('Вы торопитесь');
  });

  it('comments on a tempo that differs a lot from the score', () => {
    expect(titles(perfect((note) => ({ ...note, onset: note.onset * 1.5 })))).toEqual(['Темп']);
    const slow = feedback.generate(analyzePerformance(score, perfect((note) => ({ ...note, onset: note.onset * 1.5 }))));
    expect(slow.recommendations[0].detail).toContain('медленнее эталона');
  });

  it('does not repeat itself for a single isolated slip', () => {
    const result = feedback.generate(analyzePerformance(score, perfect((note, i) => (i === 3 ? null : note))));

    expect(result.recommendations.map((r) => r.title)).toEqual(['Точность нот']);
    expect(result.recommendations[0].detail).toContain('В такте 1');
  });
});
