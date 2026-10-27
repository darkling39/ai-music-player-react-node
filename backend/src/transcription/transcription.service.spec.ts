import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscriptionService } from './transcription.service.js';

const file = { buffer: Buffer.from('audio'), originalname: 'take.wav' };
const service = new TranscriptionService({ get: (_key: string, fallback: string) => fallback } as ConfigService);

const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('TranscriptionService', () => {
  it('posts the file to the sidecar and returns its notes', async () => {
    const result = { notes: [{ pitch: 60, onset: 0, duration: 0.5, velocity: 0.8 }], durationSec: 0.5 };
    const fetchMock = reply(200, result);
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.transcribe(file)).resolves.toEqual(result);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8001/transcribe');
    expect((fetchMock.mock.calls[0][1].body as FormData).get('file')).toBeInstanceOf(Blob);
  });

  it('maps undecodable media (422) to 400', async () => {
    vi.stubGlobal('fetch', reply(422, { detail: 'ffmpeg could not decode the file' }));
    await expect(service.transcribe(file)).rejects.toThrow(BadRequestException);
  });

  it('reports a helpful 503 when the sidecar is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(service.transcribe(file)).rejects.toThrow(ServiceUnavailableException);
    await expect(service.transcribe(file)).rejects.toThrow(/dev:asr/);
  });
});
