import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NoteEvent } from '../common/domain/music.types.js';
import type { PrismaService } from '../database/prisma.service.js';
import { parseMusicXml } from '../scores/parsers/musicxml.parser.js';
import type { ScoresService } from '../scores/scores.service.js';
import { RuleBasedFeedbackGenerator } from '../feedback/rule-based-feedback.generator.js';
import type { TranscriptionService } from '../transcription/transcription.service.js';
import { AttemptsService } from './attempts.service.js';

const score = parseMusicXml(readFileSync(join(import.meta.dirname, '..', 'scores', 'seed', 'ode-to-joy.musicxml'), 'utf8'));
const demoNotes = (JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', '..', 'demo', 'ode-to-joy-mistakes.notes.json'), 'utf8'),
) as { notes: NoteEvent[] }).notes;

describe('AttemptsService', () => {
  let uploads: string;
  let rows: Record<string, unknown>[];
  let transcribe: ReturnType<typeof vi.fn>;
  let service: AttemptsService;

  beforeEach(() => {
    uploads = mkdtempSync(join(tmpdir(), 'attempts-'));
    rows = [];
    transcribe = vi.fn().mockResolvedValue({ notes: demoNotes, durationSec: 20 });
    const prisma = {
      attempt: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `a${rows.length + 1}`, createdAt: new Date(), score: { title: score.title }, ...data };
          rows.push(row);
          return row;
        }),
        findMany: vi.fn(async () => [...rows].reverse()),
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null),
      },
    } as unknown as PrismaService;
    const scores = {
      get: vi.fn(async (id: string) => {
        if (id !== 's1') throw new NotFoundException();
        return { id, ...score, measures: score.measureCount };
      }),
    } as unknown as ScoresService;
    service = new AttemptsService(
      prisma,
      { get: () => uploads } as unknown as ConfigService,
      scores,
      { transcribe } as unknown as TranscriptionService,
      new RuleBasedFeedbackGenerator(),
    );
  });

  afterEach(() => rmSync(uploads, { recursive: true, force: true }));

  const file = { buffer: Buffer.from('wav'), originalname: 'take.wav' };

  it('analyses the transcription, stores the recording and returns the report', async () => {
    const attempt = await service.create('s1', file);

    expect(attempt).toMatchObject({ scoreId: 's1', scoreTitle: score.title, accuracy: 87.1, errorCount: 4 });
    expect(attempt.analysis.problemMeasures.sort()).toEqual([3, 5, 6, 7]);
    expect(attempt.feedback.errorMessages).toHaveLength(4);
    expect(attempt.feedback.practicePlan.length).toBeGreaterThan(0);
    expect(existsSync(await service.audioPath(attempt.id))).toBe(true);
  });

  it('lists attempts as summaries without the heavy payload', async () => {
    await service.create('s1', file);
    const [summary] = await service.list();

    expect(summary).toMatchObject({ accuracy: 87.1, errorCount: 4 });
    expect(summary).not.toHaveProperty('analysis');
    expect(summary).not.toHaveProperty('performed');
    expect(summary).not.toHaveProperty('feedback');
  });

  it('refuses unknown scores before doing any transcription work', async () => {
    await expect(service.create('nope', file)).rejects.toThrow(NotFoundException);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('stores nothing when transcription fails', async () => {
    transcribe.mockRejectedValue(new Error('sidecar down'));

    await expect(service.create('s1', file)).rejects.toThrow('sidecar down');
    expect(rows).toHaveLength(0);
  });

  it('reports a missing attempt as 404', async () => {
    await expect(service.get('missing')).rejects.toThrow(NotFoundException);
  });
});
