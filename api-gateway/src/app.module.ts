import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GatewayController } from './controllers/gateway.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Concept: Centralized environment configuration
    ConfigModule.forRoot({ isGlobal: true }),

    // Concept: Pino HTTP logging setup
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

    // Concept: Prometheus metrics endpoint
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),

    // Concept: Downstream service HTTP communication client
    HttpModule,

    // Concept: Rate limiting middleware with Throttler module (100 requests per 60 seconds)
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 100,
    }]),

    // Concept: Passport integration to support bearer JWT validation directly on the gateway
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super_secret_key_shopflow',
      }),
    }),
  ],
  controllers: [GatewayController],
  providers: [JwtStrategy],
})
export class AppModule {}
