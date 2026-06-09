import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersRmqController } from './orders.rmq-controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CircuitBreakerService } from './circuit-breaker.service';

@Module({
  imports: [
    // Concept: Register Order and OrderItem entities with TypeORM for SQL queries
    TypeOrmModule.forFeature([Order, OrderItem]),

    // Concept: Dynamic registration of RabbitMQ clients and gRPC stubs
    ClientsModule.registerAsync([
      // RabbitMQ client to talk to notification-service
      {
        name: 'NOTIFICATION_SERVICE_RMQ',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
            queue: 'notification_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },

      // RabbitMQ client to talk to product-service
      {
        name: 'PRODUCT_SERVICE_RMQ',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
            queue: 'product_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      // gRPC client to validate inventory inside product-service
      {
        name: 'PRODUCT_SERVICE_GRPC',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: configService.get<string>('PRODUCT_SERVICE_GRPC') || 'product-service:50051',
            package: 'product',
            protoPath: join(__dirname, '../../../shared/proto/product.proto'),
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController, OrdersRmqController],
  providers: [OrdersService, CircuitBreakerService],
  exports: [OrdersService],
})
export class OrdersModule { }
