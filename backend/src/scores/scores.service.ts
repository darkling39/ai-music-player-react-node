import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ParsedScore, ScoreNote } from '../common/domain/music.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { parseMidi } from './parsers/midi.parser.js';
import { parseMusicXml } from './parsers/musicxml.parser.js';

const SEED_FILES = ['ode-to-joy.musicxml'];

export interface ScoreDetails {
  id: string;
  title: string;
  composer: string | null;
  tempoBpm: number;
  beatsPerMeasure: number;
  measures: number;
  notes: ScoreNote[];
}

@Injectable()
export class ScoresService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if ((await this.prisma.score.count()) > 0) return;
    for (const file of SEED_FILES) {
      const xml = await readFile(join(import.meta.dirname, 'seed', file), 'utf8');
      await this.save(parseMusicXml(xml));
    }
  }

  list() {
    return this.prisma.score.findMany({
      select: { id: true, title: true, composer: true, tempoBpm: true, measures: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(id: string): Promise<ScoreDetails> {
    const row = await this.prisma.score.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Score ${id} not found`);
    const { notesJson, ...rest } = row;
    return { ...rest, notes: JSON.parse(notesJson) as ScoreNote[] };
  }

  async importFile(file: Express.Multer.File): Promise<ScoreDetails> {
    const name = file.originalname.toLowerCase();
    const parsed = /\.(mid|midi)$/.test(name)
      ? parseMidi(file.buffer, file.originalname.replace(/\.[^.]+$/, ''))
      : parseMusicXml(file.buffer.toString('utf8'));
    return this.get((await this.save(parsed)).id);
  }

  private save(parsed: ParsedScore) {
    return this.prisma.score.create({
      data: {
        title: parsed.title,
        composer: parsed.composer,
        tempoBpm: parsed.tempoBpm,
        beatsPerMeasure: parsed.beatsPerMeasure,
        measures: parsed.measureCount,
        notesJson: JSON.stringify(parsed.notes),
      },
    });
  }
}
