import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const configuredCorsOrigins = (
    configService.get<string>('CORS_ORIGINS') ?? ''
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localOrigins =
    configService.get<string>('NODE_ENV') === 'production'
      ? []
      : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const frontendOrigins = Array.from(
    new Set([
      configService.get<string>('FRONTEND_URL'),
      ...configuredCorsOrigins,
      ...localOrigins,
    ]),
  ).filter((origin): origin is string => Boolean(origin));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: frontendOrigins,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Data Room API')
    .setDescription(
      'API for authentication, virtual data rooms, folders, files, members, and share links.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste the access token returned by login or registration.',
      },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'Data Room API docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  });

  await app.listen(configService.get<number>('PORT') ?? 3000, '0.0.0.0');
}

void bootstrap();
