import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NoteEvent } from '../common/domain/music.types.js';

export interface TranscriptionResult {
  notes: NoteEvent[];
  durationSec: number;
}

/** Client of the Python sidecar (transcriber/), which runs Basic Pitch. */
@Injectable()
export class TranscriptionService {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('TRANSCRIBER_URL', 'http://localhost:8001');
  }

  async transcribe(file: { buffer: Buffer; originalname: string }): Promise<TranscriptionResult> {
    const body = new FormData();
    body.append('file', new Blob([new Uint8Array(file.buffer)]), file.originalname);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/transcribe`, { method: 'POST', body });
    } catch {
      throw new ServiceUnavailableException(
        `Transcriber is not reachable at ${this.baseUrl}. Start it with "npm run dev:asr".`,
      );
    }

    if (response.status === 422) {
      const { detail } = (await response.json()) as { detail: string };
      throw new BadRequestException(detail);
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`Transcriber failed with status ${response.status}`);
    }
    return (await response.json()) as TranscriptionResult;
  }
}
