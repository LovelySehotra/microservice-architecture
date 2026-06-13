import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Concept: Integrate Pino structured logging
  app.useLogger(app.get(Logger));

  // Concept: Enable global parameter validation pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Concept: Enable CORS for cross-domain frontends
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
}
bootstrap();
