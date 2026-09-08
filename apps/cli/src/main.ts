import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CliModule);
  console.log('CLI application initialized');
  await app.close();
}

void bootstrap();
