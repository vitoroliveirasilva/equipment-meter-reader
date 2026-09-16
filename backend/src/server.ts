import { GeminiMeterReader } from './integrations/gemini/gemini-meter-reader.js';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { PrismaReadingRepository } from './modules/reading/reading.repository.js';
import { ReadingService } from './modules/reading/reading.service.js';
import { prisma } from './shared/database/prisma.js';

const readingRepository = new PrismaReadingRepository(prisma);
const meterReader = new GeminiMeterReader(env.GEMINI_API_KEY);

const readingService = new ReadingService(readingRepository, meterReader, env.UPLOADS_DIR);

const app = buildApp({
  readingService,
});

try {
  await app.listen({
    host: '0.0.0.0',
    port: env.PORT,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
