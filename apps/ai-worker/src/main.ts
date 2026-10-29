import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AiWorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.create(AiWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();

  app
    .getHttpAdapter()
    .getInstance()
    .get(
      '/health',
      (
        _request: unknown,
        response: {
          status: (code: number) => { json: (body: unknown) => void };
        },
      ) => {
        response.status(200).json({ status: 'ok', service: 'ai-worker' });
      },
    );

  const port = process.env.AI_WORKER_PORT ?? 3001;
  await app.listen(port);
  new Logger('AiWorker').log(
    `AI reply worker initialized on http://localhost:${port}`,
  );
}

void bootstrap();
