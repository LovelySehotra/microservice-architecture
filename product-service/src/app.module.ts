import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ProductsModule } from './products/products.module';

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

    // Concept: Native Prometheus metrics scraping setup
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),

    // Concept: Database-per-service pattern using isolated MongoDB instance via Mongoose
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/shopflow_product',
      }),
    }),

    ProductsModule,
  ],
})
export class AppModule {}
