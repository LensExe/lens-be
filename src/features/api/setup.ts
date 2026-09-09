import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApi(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  const builder = new DocumentBuilder()
    .setTitle('Lens API')
    .setDescription(
      'Lens HTTP API. Use a Keycloak access token with the Authorize button. Amounts are integer VND; dates are ISO 8601 with timezone.',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Keycloak access token (do not use an ID token)',
    });
  const publicUrl = process.env.API_PUBLIC_URL?.trim();
  if (publicUrl)
    builder.addServer(publicUrl.replace(/\/$/, ''), 'Deployed API');
  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
  return document;
}
