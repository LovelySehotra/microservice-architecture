import { Injectable, Inject, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CircuitBreakerService } from './circuit-breaker.service';

interface ValidateStockRequest {
  productId: string;
  quantity: number;
}

interface ValidateStockResponse {
  available: boolean;
  title: string;
  price: number;
  message: string;
}

interface ProductGrpcService {
  validateStock(request: ValidateStockRequest): Observable<ValidateStockResponse>;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private productGrpcService: ProductGrpcService;

  constructor(
    // Concept: Inject the Postgres database repository for Orders
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    // Concept: Inject the Postgres database repository for OrderItems
    @InjectRepository(OrderItem) private readonly orderItemRepository: Repository<OrderItem>,
    // Concept: Inject gRPC client configured to talk to product-service
    @Inject('PRODUCT_SERVICE_GRPC') private readonly grpcClient: ClientGrpc,
    // Concept: Inject RabbitMQ client for notification-service events
    @Inject('NOTIFICATION_SERVICE_RMQ') private readonly notificationServiceClient: ClientProxy,
    // Concept: Inject RabbitMQ client for product-service inventory commands
    @Inject('PRODUCT_SERVICE_RMQ') private readonly productServiceClient: ClientProxy,
    // Concept: Inject Opossum circuit breaker wrapper service
    private readonly circuitBreakerService: CircuitBreakerService,
  ) { }

  onModuleInit() {
    // Concept: Resolve the gRPC ProductService client stub at module initialization
    this.productGrpcService = this.grpcClient.getService<ProductGrpcService>('ProductService');
  }

  // Concept: Step 1 of SAGA choreography: create order as PENDING, validate stock over gRPC, and request stock reservation
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const orderItems: OrderItem[] = [];
    let calculatedTotalPrice = 0;

    // Concept: Validate stock and extract current prices synchronously using gRPC wrapped in Circuit Breaker
    for (const item of createOrderDto.items) {
      const stockResult = await this.circuitBreakerService.fire(async () => {
        return firstValueFrom(this.productGrpcService.validateStock({
          productId: item.productId,
          quantity: item.quantity,
        }));
      });

      if (!stockResult.available) {
        throw new BadRequestException(`Product stock validation failed: ${stockResult.message}`);
      }

      const orderItem = new OrderItem();
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.price = stockResult.price;
      orderItems.push(orderItem);

      calculatedTotalPrice += Number(stockResult.price) * item.quantity;
    }

    // Concept: Save PENDING order to orders_db PostgreSQL database
    const order = new Order();
    order.userId = createOrderDto.userId;
    order.status = 'PENDING';
    order.totalPrice = calculatedTotalPrice;
    order.items = orderItems;
    const savedOrder = await this.orderRepository.save(order);

    // Concept: Step 2 of SAGA choreography: publish reserve_stock command to product-service via RabbitMQ
    for (const item of savedOrder.items) {
      this.productServiceClient.emit('reserve_stock', {
        orderId: savedOrder.id,
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    return savedOrder;
  }

  // Concept: Step 4 of SAGA choreography: confirm the order on positive StockReserved confirmation
  async confirmOrder(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    order.status = 'CONFIRMED';
    await this.orderRepository.save(order);

    console.log(`[Order Service] Order ${orderId} confirmed.`);

    // Concept: Publish OrderConfirmed event to RabbitMQ for notification updates
    this.notificationServiceClient.emit('order_confirmed', {
      orderId: order.id,
      userId: order.userId,
      totalPrice: order.totalPrice,
      status: order.status,
    });
  }

  // Concept: Step 4 of SAGA choreography (Compensating rollback): cancel order and request inventory release
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    order.status = 'CANCELLED';
    await this.orderRepository.save(order);

    console.warn(`[Order Service] Order ${orderId} cancelled. Reason: ${reason}`);

    // Concept: Compensating transaction command: emit release_stock for all items in this order
    for (const item of order.items) {
      this.productServiceClient.emit('release_stock', {
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Concept: Notify notification-service about order cancellation
    this.notificationServiceClient.emit('order_cancelled', {
      orderId: order.id,
      userId: order.userId,
      reason,
    });
  }

  // Concept: Find order details by ID
  async findById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  // Concept: Retrieve all orders
  async findAll(): Promise<Order[]> {
    return this.orderRepository.find();
  }
}
