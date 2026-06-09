import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';

@Module({
  imports: [
    // Concept: Global environment configurations
    ConfigModule.forRoot({ isGlobal: true }),

    // Concept: Pino HTTP logging configuration, capturing trace context
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (req) => ({
          requestId: req.headers['x-request-id'] || 'no-request-id',
        }),
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      },
    }),

    // Concept: Prometheus metrics scraping endpoint
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),

    // Concept: Isolated database connection (Database-per-Service pattern) using PostgreSQL and TypeORM
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shopflow_order',
        entities: [Order, OrderItem],
        synchronize: true, // Only for development/learning
      }),
    }),

    OrdersModule,
  ],
})
export class AppModule {}
