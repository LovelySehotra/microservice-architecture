import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Concept: Application bootstrapping with buffered logging to allow the custom logger to initialize first
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Concept: Centralized structured logging utilizing Pino to output structured JSON format logs
  app.useLogger(app.get(Logger));

  // Concept: Direct mapping and runtime type validation of request inputs via ValidationPipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`User Service is running on: http://localhost:${port}`);
}
bootstrap();
