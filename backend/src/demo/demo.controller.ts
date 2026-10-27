import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Repo-level demo/ folder (see backend/scripts/generate-demo-audio.mjs).
const DEMO_DIR = join(import.meta.dirname, '..', '..', '..', 'demo');

/** Ready-made recordings so the analysis can be tried without a microphone or an own file. */
@Controller('demo')
export class DemoController {
  @Get()
  async list() {
    const files = await readdir(DEMO_DIR).catch(() => [] as string[]);
    return files.filter((name) => name.endsWith('.wav')).map((name) => ({ name }));
  }

  @Get(':name')
  async download(@Param('name') name: string, @Res() res: Response) {
    const files = await readdir(DEMO_DIR).catch(() => [] as string[]);
    if (!files.includes(name) || !name.endsWith('.wav')) throw new NotFoundException(`No demo recording ${name}`);
    res.sendFile(join(DEMO_DIR, name));
  }
}
