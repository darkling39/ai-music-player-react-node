import { Injectable } from '@nestjs/common';
import type { AnalysisResult } from '../analysis/analysis.types.js';
import type { PerformanceError } from '../common/domain/music.types.js';
import { pitchLabel } from '../common/domain/pitch.js';
import { Feedback, FeedbackGenerator, PracticeStep, Recommendation } from './feedback.types.js';

const SLOW_TEMPO = 0.6;
const WARM_TEMPO = 0.8;
const METRONOME_TEMPO = 0.75;
const TEMPO_DEVIATION_LIMIT = 0.1;
const MAX_PLAN_RANGES = 3;

const measuresText = (measures: number[]) =>
  measures.length === 1
    ? `такт ${measures[0]}`
    : `такты ${measures.slice(0, -1).join(', ')} и ${measures[measures.length - 1]}`;

/** Prepositional case, for "в ...": "в такте 6", "в тактах 3, 5 и 7". */
const inMeasures = (measures: number[]) =>
  measures.length === 1
    ? `такте ${measures[0]}`
    : `тактах ${measures.slice(0, -1).join(', ')} и ${measures[measures.length - 1]}`;

const unique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

function explain(error: PerformanceError): string {
  const expected = error.expectedPitch === undefined ? '' : pitchLabel(error.expectedPitch);
  const played = error.playedPitch === undefined ? '' : pitchLabel(error.playedPitch);
  const ms = Math.abs(error.deviationMs ?? 0);
  switch (error.type) {
    case 'wrong_pitch':
      return `Вместо ${expected} сыграна ${played}`;
    case 'missed':
      return `Пропущена нота ${expected}`;
    case 'extra':
      return `Лишняя нота ${played}`;
    case 'late':
      return `Нота ${expected} вступила позже на ${ms} мс`;
    case 'early':
      return `Нота ${expected} вступила раньше на ${ms} мс`;
  }
}

function levelText(accuracy: number): string {
  if (accuracy >= 95) return 'Отличное исполнение';
  if (accuracy >= 85) return 'Хорошее исполнение, есть над чем поработать';
  if (accuracy >= 70) return 'Неплохо, но ошибки заметны';
  return 'Пьесу стоит ещё разучить';
}

/** Splits measure numbers into runs of neighbours: [3, 4, 7] -> [[3, 4], [7]]. */
function runs(measures: number[]): number[][] {
  return unique(measures).reduce<number[][]>((groups, measure) => {
    const last = groups[groups.length - 1];
    if (last && measure - last[last.length - 1] <= 1) last.push(measure);
    else groups.push([measure]);
    return groups;
  }, []);
}

/** Deterministic, template-based feedback: no model, no network, the same input gives the same text. */
@Injectable()
export class RuleBasedFeedbackGenerator extends FeedbackGenerator {
  generate(analysis: AnalysisResult): Feedback {
    return {
      summary: this.summary(analysis),
      errorMessages: analysis.errors.map(explain),
      recommendations: this.recommendations(analysis),
      practicePlan: this.practicePlan(analysis),
    };
  }

  private summary({ accuracy, errors, problemMeasures }: AnalysisResult): string {
    if (errors.length === 0) return `Точность ${accuracy}%. Ошибок не найдено: исполнение совпадает с нотами.`;
    return `Точность ${accuracy}%. ${levelText(accuracy)}. Найдено ошибок: ${errors.length}, больше всего в ${inMeasures(problemMeasures)}.`;
  }

  private recommendations(analysis: AnalysisResult): Recommendation[] {
    const { errors, tempo, counts } = analysis;
    const ofType = (...types: PerformanceError['type'][]) => errors.filter((error) => types.includes(error.type));
    const where = (list: PerformanceError[]) => unique(list.map((error) => error.measure));
    const result: Recommendation[] = [];

    const noteErrors = ofType('wrong_pitch', 'missed');
    if (noteErrors.length) {
      const measures = where(noteErrors);
      result.push({
        title: 'Точность нот',
        detail: `В ${inMeasures(measures)} ноты сыграны неверно или пропущены. Сыграйте эти места без спешки: назовите ноты вслух, проверьте положение пальцев и только потом возвращайтесь к темпу.`,
        measures,
      });
    }

    const timing = ofType('late', 'early');
    if (timing.length) {
      const measures = where(timing);
      const late = counts.late >= counts.early;
      result.push({
        title: 'Ритм',
        detail: `${late ? 'Вы запаздываете' : 'Вы торопитесь'} в ${inMeasures(measures)}. Сыграйте с метрономом на ${Math.round(tempo.referenceBpm * METRONOME_TEMPO)} BPM и считайте доли вслух.`,
        measures,
      });
    }

    const extra = ofType('extra');
    if (extra.length) {
      const measures = where(extra);
      result.push({
        title: 'Лишние звуки',
        detail: `В ${inMeasures(measures)} прозвучала нота, которой нет в нотах. Обычно это задетая соседняя клавиша: следите за положением кисти и не прижимайте клавиши лишний раз.`,
        measures,
      });
    }

    const ratio = tempo.playedBpm / tempo.referenceBpm;
    if (Math.abs(ratio - 1) > TEMPO_DEVIATION_LIMIT) {
      const percent = Math.round(Math.abs(ratio - 1) * 100);
      result.push({
        title: 'Темп',
        detail:
          ratio > 1
            ? `Вы играете примерно на ${percent}% быстрее эталона (${tempo.playedBpm} вместо ${tempo.referenceBpm} BPM). Начните медленнее, чтобы ровнее держать ритм.`
            : `Вы играете примерно на ${percent}% медленнее эталона (${tempo.playedBpm} вместо ${tempo.referenceBpm} BPM). Для разучивания это нормально: ускоряйтесь постепенно, когда ноты станут уверенными.`,
        measures: [],
      });
    }

    const byPitch = new Map<number, PerformanceError[]>();
    for (const error of errors) {
      if (error.type === 'extra' || error.expectedPitch === undefined) continue;
      byPitch.set(error.expectedPitch, [...(byPitch.get(error.expectedPitch) ?? []), error]);
    }
    for (const [pitch, list] of byPitch) {
      if (list.length < 2) continue;
      const measures = where(list);
      result.push({
        title: `Сложная нота: ${pitchLabel(pitch)}`,
        detail: `Эта нота вызвала ошибки несколько раз (${measuresText(measures)}). Выделите для неё отдельное упражнение.`,
        measures,
      });
    }

    if (errors.length === 0 && result.length === 0) {
      result.push({
        title: 'Следующий шаг',
        detail: `Попробуйте сыграть чуть быстрее (${Math.round(tempo.referenceBpm * 1.1)} BPM) или выберите более сложное произведение.`,
        measures: [],
      });
    }
    return result;
  }

  private practicePlan({ problemMeasures, measures, tempo, errors }: AnalysisResult): PracticeStep[] {
    if (errors.length === 0) return [];
    const errorsIn = (group: number[]) => group.reduce((sum, m) => sum + (measures[m - 1]?.errors ?? 0), 0);
    const ranges = runs(problemMeasures)
      .sort((a, b) => errorsIn(b) - errorsIn(a) || a[0] - b[0])
      .slice(0, MAX_PLAN_RANGES);

    const slow = Math.round(tempo.referenceBpm * SLOW_TEMPO);
    const warm = Math.round(tempo.referenceBpm * WARM_TEMPO);
    const steps: PracticeStep[] = ranges.map((group) => {
      const range = { from: group[0], to: group[group.length - 1] };
      return {
        title: range.from === range.to ? `Такт ${range.from}` : `Такты ${range.from}–${range.to}`,
        detail: `Сыграйте медленно (${slow} BPM) три раза подряд без ошибок, затем ускорьтесь до ${warm} BPM.`,
        measures: range,
        tempoBpm: slow,
      };
    });
    steps.push({
      title: 'Соберите всё вместе',
      detail: `Сыграйте произведение целиком в темпе ${warm} BPM и загрузите новую попытку, чтобы сравнить результат.`,
      tempoBpm: warm,
    });
    return steps;
  }
}
