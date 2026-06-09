import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersRmqController {
  constructor(
    // Concept: Inject OrdersService to handle order status updates
    private readonly ordersService: OrdersService,
  ) {}

  // Concept: Receive positive stock reservation confirmation, updating order status to CONFIRMED
  @EventPattern('stock_reserved')
  async handleStockReserved(@Payload() data: { orderId: string; productId: string; quantity: number; price: number }) {
    console.log(`[RMQ] Received stock_reserved event for Order: ${data.orderId}`);
    await this.ordersService.confirmOrder(data.orderId);
  }

  // Concept: Receive stock reservation failure, updating order status to CANCELLED and triggering compensations
  @EventPattern('stock_failed')
  async handleStockFailed(@Payload() data: { orderId: string; reason: string }) {
    console.warn(`[RMQ] Received stock_failed event for Order: ${data.orderId}. Reason: ${data.reason}`);
    await this.ordersService.cancelOrder(data.orderId, data.reason);
  }
}
