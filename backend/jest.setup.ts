import { Logger } from '@nestjs/common';

// Keep test output readable: services log expected warnings (e.g. queue fallbacks).
Logger.overrideLogger(false);
