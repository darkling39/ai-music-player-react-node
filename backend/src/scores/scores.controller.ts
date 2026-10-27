import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScoresService } from './scores.service.js';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Get()
  list() {
    return this.scores.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.scores.get(id);
  }

  /** Accepts MusicXML (.musicxml/.xml) or MIDI (.mid/.midi) as multipart field `file`. */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Attach a MusicXML or MIDI file as field "file"');
    try {
      return await this.scores.importFile(file);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Cannot read score');
    }
  }
}
