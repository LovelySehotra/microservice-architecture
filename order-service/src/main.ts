import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Concept: Hybrid NestJS app combining HTTP REST endpoints with background message broker listeners
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Concept: Inject Pino logging framework
  app.useLogger(app.get(Logger));

  // Concept: Enable model validation and DTO parsing
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Concept: Connect RabbitMQ microservice listening to order_queue for SAGA updates
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'order_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Concept: Spin up RabbitMQ background listeners
  await app.startAllMicroservices();

  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`Order Service (REST) running on: http://localhost:${port}`);
}
bootstrap();
