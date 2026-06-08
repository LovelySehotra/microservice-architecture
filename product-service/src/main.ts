import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  // Concept: Main NestJS hybrid application combining HTTP REST APIs and custom microservices
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Concept: Global structured logging using Pino logger
  app.useLogger(app.get(Logger));

  // Concept: Route parameter validation using global pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Concept: Register gRPC microservice server exposing stock validation endpoint
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${process.env.GRPC_PORT || 50051}`,
      package: 'product',
      protoPath: join(__dirname, '../../shared/proto/product.proto'),
    },
  });

  // Concept: Register RabbitMQ listener for order events like ReserveStock (SAGA choreography)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'product_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Concept: Initialize and spin up all connected background microservices
  await app.startAllMicroservices();

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Product Service (REST) running on: http://localhost:${port}`);
  console.log(`Product Service (gRPC) running on port: ${process.env.GRPC_PORT || 50051}`);
}
bootstrap();
