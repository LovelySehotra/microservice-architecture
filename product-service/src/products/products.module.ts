import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsRmqController } from './products.rmq-controller';
import { Product, ProductSchema } from './schemas/product.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // Concept: Register schema entity with Mongoose for MongoDB database access
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),

    // Concept: Register RabbitMQ ClientProxy for dispatching compensation/reservation events back to order-service
    ClientsModule.registerAsync([
      {
        name: 'ORDER_SERVICE_RMQ',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
            queue: 'order_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [ProductsController, ProductsRmqController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
