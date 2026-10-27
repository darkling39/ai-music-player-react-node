import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AttemptsService } from './attempts.service.js';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  /** Multipart: `file` (audio or video of the performance) and `scoreId`. Responds once analysis is done. */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  create(@Body('scoreId') scoreId?: string, @UploadedFile() file?: Express.Multer.File) {
    if (!scoreId) throw new BadRequestException('"scoreId" is required');
    if (!file) throw new BadRequestException('Attach an audio or video file as field "file"');
    return this.attempts.create(scoreId, file);
  }

  @Get()
  list() {
    return this.attempts.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.attempts.get(id);
  }

  /** The stored recording; sendFile handles Range requests so the browser can seek. */
  @Get(':id/audio')
  async audio(@Param('id') id: string, @Res() res: Response) {
    res.sendFile(await this.attempts.audioPath(id));
  }
}
