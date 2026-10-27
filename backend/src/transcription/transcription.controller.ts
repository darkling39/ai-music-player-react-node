import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TranscriptionService } from './transcription.service.js';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

@Controller('transcriptions')
export class TranscriptionController {
  constructor(private readonly transcription: TranscriptionService) {}

  /** Audio or video as multipart field `file`; returns the notes detected in it. */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  transcribe(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Attach an audio or video file as field "file"');
    return this.transcription.transcribe(file);
  }
}
