import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    // Concept: Centralized environment configuration management
    ConfigModule.forRoot({ isGlobal: true }),

    // Concept: Structured Logging using Pino, capturing and logging incoming Request IDs
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

    // Concept: Metrics collection using Prometheus, automatically mapping default metrics
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
        url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shopflow_user',
        entities: [User],
        synchronize: true,
      }),
    }),

    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
