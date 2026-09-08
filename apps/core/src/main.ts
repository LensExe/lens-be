import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Core application is running on: http://localhost:${port}`);
}
void bootstrap();
