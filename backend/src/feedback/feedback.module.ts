import { Module } from '@nestjs/common';
import { FeedbackGenerator } from './feedback.types.js';
import { RuleBasedFeedbackGenerator } from './rule-based-feedback.generator.js';

@Module({
  providers: [{ provide: FeedbackGenerator, useClass: RuleBasedFeedbackGenerator }],
  exports: [FeedbackGenerator],
})
export class FeedbackModule {}
