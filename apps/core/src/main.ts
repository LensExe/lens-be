import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { setupApi } from '@features/api/setup';
import { requestLoggingMiddleware } from '@shared/platform/logger/request-logging.middleware';

/**
 * Initialize the API application and start accepting requests.
 *
 * @returns No value is returned.
 */
async function bootstrap() {
  const app = await NestFactory.create(CoreModule);
  app.use(requestLoggingMiddleware);
  setupApi(app);
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Core application is running on: http://localhost:${port}`);
}
void bootstrap();
