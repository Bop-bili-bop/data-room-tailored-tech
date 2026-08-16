import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigins = Array.from(
    new Set([
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
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

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
