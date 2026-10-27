import { Module } from '@nestjs/common';
import { ScoresModule } from '../scores/scores.module.js';
import { TranscriptionModule } from '../transcription/transcription.module.js';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';

@Module({
  imports: [ScoresModule, TranscriptionModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
