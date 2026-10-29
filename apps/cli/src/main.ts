import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli.module';

/**
 * Initialize the CLI application and start accepting requests.
 *
 * @returns No value is returned.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CliModule);
  console.log('CLI application initialized');
  await app.close();
}

void bootstrap();
