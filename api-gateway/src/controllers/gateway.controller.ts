import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, Req, SetMetadata } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/gateway-roles.guard';
import { TimeoutInterceptor } from '../interceptors/timeout.interceptor';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import axiosRetry from 'axios-retry';

// Concept: Roles meta annotation binding
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller()
@UseInterceptors(TimeoutInterceptor)
export class GatewayController {
  private readonly redisClient: Redis;
  private readonly userServiceUrl: string;
  private readonly productServiceUrl: string;
  private readonly orderServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001';
    this.productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
    this.orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://order-service:3003';

    // Concept: Connect to shared Redis clust
    // er for rate limit storage and fallback caches
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

    // Concept: Configure Axios Retry with exponential backoff delays on transient HTTP failures
    axiosRetry(this.httpService.axiosRef, {
      retries: 3,
      retryDelay: (retryCount) => {
        console.log(`[HTTP RETRY] Attempt number: ${retryCount}...`);
        return retryCount * 1000; // Backoff interval multiplier
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               (error.response && error.response.status >= 500);
      },
    });
  }

  // --- AUTH ROUTES ---
  @Post('auth/register')
  async register(@Body() body: any) {
    const response = await firstValueFrom(this.httpService.post(`${this.userServiceUrl}/auth/register`, body));
    return response.data;
  }

  @Post('auth/login')
  async login(@Body() body: any) {
    const response = await firstValueFrom(this.httpService.post(`${this.userServiceUrl}/auth/login`, body));
    return response.data;
  }

  // --- PRODUCT CATALOG ROUTES ---
  @Get('products')
  async getProducts() {
    const response = await firstValueFrom(this.httpService.get(`${this.productServiceUrl}/products`));
    return response.data;
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    try {
      const response = await firstValueFrom(this.httpService.get(`${this.productServiceUrl}/products/${id}`));
      // Concept: Cache detail item in Redis to survive downstream service failures
      await this.redisClient.set(`product:${id}`, JSON.stringify(response.data), 'EX', 3600);
      return response.data;
    } catch (error) {
      console.warn(`[Gateway Fallback] Product service unavailable. Fetching cached detail for: ${id}`);
      
      // Concept: Fallback implementation (Graceful Degradation) from Redis cache
      const cached = await this.redisClient.get(`product:${id}`);
      if (cached) {
        return {
          ...JSON.parse(cached),
          _meta: { fallback: true, source: 'cache', timestamp: new Date() },
        };
      }
      throw error;
    }
  }

  @Post('products')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async createProduct(@Body() body: any) {
    const response = await firstValueFrom(this.httpService.post(`${this.productServiceUrl}/products`, body));
    return response.data;
  }

  @Delete('products/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async deleteProduct(@Param('id') id: string) {
    const response = await firstValueFrom(this.httpService.delete(`${this.productServiceUrl}/products/${id}`));
    return response.data;
  }

  // --- ORDER LIFECYCLE ROUTES ---
  @Get('orders')
  @UseGuards(AuthGuard('jwt'))
  async getOrders() {
    const response = await firstValueFrom(this.httpService.get(`${this.orderServiceUrl}/orders`));
    return response.data;
  }

  @Post('orders')
  @UseGuards(AuthGuard('jwt'))
  async createOrder(@Body() body: any, @Req() req: any) {
    const orderPayload = {
      ...body,
      userId: req.user.id,
    };
    const response = await firstValueFrom(this.httpService.post(`${this.orderServiceUrl}/orders`, orderPayload));
    return response.data;
  }

  // Concept: Response Aggregation merging Order, User, and Product metadata in one request
  @Get('orders/:id')
  @UseGuards(AuthGuard('jwt'))
  async getOrderByIdAggregated(@Param('id') id: string) {
    const orderResponse = await firstValueFrom(this.httpService.get(`${this.orderServiceUrl}/orders/${id}`));
    const order = orderResponse.data;

    let userProfile = null;
    try {
      const userResponse = await firstValueFrom(this.httpService.get(`${this.userServiceUrl}/users/${order.userId}`));
      userProfile = userResponse.data;
    } catch (e) {
      console.warn(`[Aggregation] Failed to fetch User profile: ${e.message}`);
    }

    const itemsWithDetails = await Promise.all(
      order.items.map(async (item: any) => {
        let productDetails = null;
        try {
          const prodResponse = await firstValueFrom(this.httpService.get(`${this.productServiceUrl}/products/${item.productId}`));
          productDetails = prodResponse.data;
        } catch (e) {
          const cached = await this.redisClient.get(`product:${item.productId}`);
          if (cached) {
            productDetails = {
              ...JSON.parse(cached),
              _meta: { fallback: true, source: 'cache' },
            };
          }
        }
        return {
          ...item,
          product: productDetails,
        };
      }),
    );

    return {
      order: {
        id: order.id,
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      items: itemsWithDetails,
      user: userProfile,
    };
  }
}
