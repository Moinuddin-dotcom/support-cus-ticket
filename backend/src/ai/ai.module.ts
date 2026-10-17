import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AI_SETTINGS, AiSettings, aiSettingsFromEnv } from './ai.settings';

@Module({
  controllers: [AiController],
  providers: [
    {
      provide: AI_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        aiSettingsFromEnv({
          AI_PROVIDER: config.get<string>('AI_PROVIDER'),
          AI_API_KEY: config.get<string>('AI_API_KEY'),
          AI_MODEL: config.get<string>('AI_MODEL'),
          AI_TIMEOUT_MS: String(config.get<number>('AI_TIMEOUT_MS') ?? ''),
        }),
    },
    {
      provide: AiService,
      inject: [AI_SETTINGS],
      useFactory: (settings: AiSettings) => new AiService(settings),
    },
  ],
})
export class AiModule {}
