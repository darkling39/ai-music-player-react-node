import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { AnalysisResult } from '../analysis/analysis.types.js';
import { analyzePerformance } from '../analysis/performance-analyzer.js';
import type { NoteEvent } from '../common/domain/music.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { ScoresService } from '../scores/scores.service.js';
import { TranscriptionService } from '../transcription/transcription.service.js';

export interface AttemptSummary {
  id: string;
  scoreId: string;
  scoreTitle: string;
  createdAt: Date;
  accuracy: number;
  errorCount: number;
}

export interface AttemptDetails extends AttemptSummary {
  analysis: AnalysisResult;
  /** Notes detected in the recording, kept so the analysis can be re-run or inspected. */
  performed: NoteEvent[];
}

interface StoredResult {
  analysis: AnalysisResult;
  performed: NoteEvent[];
}

@Injectable()
export class AttemptsService {
  private readonly uploadsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly scores: ScoresService,
    private readonly transcription: TranscriptionService,
  ) {
    this.uploadsDir = resolve(config.get<string>('UPLOADS_DIR', './uploads'));
  }

  /** Transcribes the recording, compares it with the score and stores recording and result. */
  async create(scoreId: string, file: { buffer: Buffer; originalname: string }): Promise<AttemptDetails> {
    const score = await this.scores.get(scoreId);
    const { notes } = await this.transcription.transcribe(file);
    const analysis = analyzePerformance(
      { tempoBpm: score.tempoBpm, beatsPerMeasure: score.beatsPerMeasure, measureCount: score.measures, notes: score.notes },
      notes,
    );

    await mkdir(this.uploadsDir, { recursive: true });
    const audioPath = resolve(this.uploadsDir, `${randomUUID()}${extname(file.originalname)}`);
    await writeFile(audioPath, file.buffer);
    try {
      const row = await this.prisma.attempt.create({
        data: { scoreId, audioPath, status: 'done', resultJson: JSON.stringify({ analysis, performed: notes } satisfies StoredResult) },
        include: { score: { select: { title: true } } },
      });
      return this.toDetails(row);
    } catch (error) {
      await unlink(audioPath).catch(() => undefined);
      throw error;
    }
  }

  async list(): Promise<AttemptSummary[]> {
    const rows = await this.prisma.attempt.findMany({
      include: { score: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => {
      const { performed: _performed, analysis: _analysis, ...summary } = this.toDetails(row);
      return summary;
    });
  }

  async get(id: string): Promise<AttemptDetails> {
    return this.toDetails(await this.find(id));
  }

  async audioPath(id: string): Promise<string> {
    return (await this.find(id)).audioPath;
  }

  private async find(id: string) {
    const row = await this.prisma.attempt.findUnique({ where: { id }, include: { score: { select: { title: true } } } });
    if (!row) throw new NotFoundException(`Attempt ${id} not found`);
    return row;
  }

  private toDetails(row: {
    id: string;
    scoreId: string;
    createdAt: Date;
    resultJson: string | null;
    score: { title: string };
  }): AttemptDetails {
    const { analysis, performed } = JSON.parse(row.resultJson ?? '{}') as StoredResult;
    return {
      id: row.id,
      scoreId: row.scoreId,
      scoreTitle: row.score.title,
      createdAt: row.createdAt,
      accuracy: analysis.accuracy,
      errorCount: analysis.errors.length,
      analysis,
      performed,
    };
  }
}
