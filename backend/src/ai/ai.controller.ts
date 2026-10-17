import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService, AiSuggestion } from './ai.service';
import { SuggestDto } from './dto/suggest.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Suggest category, priority and a short summary for a draft ticket',
    description:
      'Always responds 200. If the AI provider fails or times out, a safe default is returned with source="fallback".',
  })
  suggest(@Body() dto: SuggestDto): Promise<AiSuggestion> {
    return this.aiService.suggest(dto);
  }
}
