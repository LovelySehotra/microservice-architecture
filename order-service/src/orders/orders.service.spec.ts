import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Repository } from 'typeorm';
import { of } from 'rxjs';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockProductGrpcService: any;
  let mockRmqClient: any;

  beforeEach(async () => {
    mockProductGrpcService = {
      validateStock: jest.fn().mockReturnValue(of({ available: true, price: 99.99, title: 'Test Product', message: 'OK' })),
    };

    const mockGrpcClient = {
      getService: jest.fn().mockReturnValue(mockProductGrpcService),
    };

    mockRmqClient = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        CircuitBreakerService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            save: jest.fn().mockImplementation((order) => Promise.resolve({ id: 'mock-order-id', ...order })),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {},
        },
        {
          provide: 'PRODUCT_SERVICE_GRPC',
          useValue: mockGrpcClient,
        },
        {
          provide: 'NOTIFICATION_SERVICE_RMQ',
          useValue: mockRmqClient,
        },
        {
          provide: 'PRODUCT_SERVICE_RMQ',
          useValue: mockRmqClient,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    service.onModuleInit(); // Initialize gRPC mocks
  });

  it('should create order as PENDING and emit reserve_stock event', async () => {
    const createOrderDto = {
      userId: 'user-123',
      items: [{ productId: 'prod-999', quantity: 2 }],
    };

    const result = await service.createOrder(createOrderDto);

    expect(result).toBeDefined();
    expect(result.id).toBe('mock-order-id');
    expect(result.status).toBe('PENDING');
    expect(result.totalPrice).toBe(199.98); // 99.99 * 2
    expect(mockProductGrpcService.validateStock).toHaveBeenCalledWith({ productId: 'prod-999', quantity: 2 });
    expect(mockRmqClient.emit).toHaveBeenCalledWith('reserve_stock', {
      orderId: 'mock-order-id',
      productId: 'prod-999',
      quantity: 2,
    });
  });
});
