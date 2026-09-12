import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { setupApi } from '@features/api/setup';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule);
  setupApi(app);
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Core application is running on: http://localhost:${port}`);
}
void bootstrap();
