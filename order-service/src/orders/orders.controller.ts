import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CircuitBreakerService } from './circuit-breaker.service';

@Controller('orders')
export class OrdersController {
  constructor(
    // Concept: Inject OrdersService to manage order operations
    private readonly ordersService: OrdersService,
    // Concept: Inject CircuitBreakerService to query breaker health status
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  // Concept: REST endpoint to create order and initiate the SAGA flow
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  // Concept: REST endpoint to retrieve all orders
  @Get()
  async findAll() {
    return this.ordersService.findAll();
  }

  // Concept: REST endpoint to retrieve a single order by ID
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  // Concept: Health endpoint exposing current state of the opossum circuit breaker (CLOSED, OPEN, HALF-OPEN)
  @Get('health/circuit')
  getCircuitStatus() {
    return this.circuitBreakerService.getBreakerState();
  }
}
