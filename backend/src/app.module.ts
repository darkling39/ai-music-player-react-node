import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { ScoresModule } from './scores/scores.module.js';
import { TranscriptionModule } from './transcription/transcription.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, ScoresModule, TranscriptionModule],
  controllers: [HealthController],
})
export class AppModule {}
