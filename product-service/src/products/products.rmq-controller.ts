import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { ProductsService } from './products.service';

@Controller()
export class ProductsRmqController {
  constructor(
    private readonly productsService: ProductsService,
    // Concept: Inject RabbitMQ Client to emit events back to order-service
    @Inject('ORDER_SERVICE_RMQ') private readonly orderServiceClient: ClientProxy,
  ) {}

  // Concept: RMQ listener reacting to stock reservation request as part of the choreography SAGA
  @EventPattern('reserve_stock')
  async handleReserveStock(@Payload() data: { orderId: string; productId: string; quantity: number }) {
    console.log(`[RMQ] Received reserve_stock event for Order: ${data.orderId}, Product: ${data.productId}`);
    
    // Attempt stock reservation atomically
    const reserved = await this.productsService.reserveStock(data.productId, data.quantity);
    
    if (reserved) {
      console.log(`[RMQ] Stock reserved successfully. Emitting stock_reserved event.`);
      const product = await this.productsService.findById(data.productId);
      
      // Concept: Emit event back to order-service with product price info for payment processing
      this.orderServiceClient.emit('stock_reserved', {
        orderId: data.orderId,
        productId: data.productId,
        quantity: data.quantity,
        price: product.price,
      });
    } else {
      console.warn(`[RMQ] Stock reservation failed. Emitting stock_failed event.`);
      // Concept: Compensating rollback event trigger if stock reservation fails
      this.orderServiceClient.emit('stock_failed', {
        orderId: data.orderId,
        reason: 'Insufficient stock or product not found',
      });
    }
  }

  // Concept: Compensating transaction receiver to release reserved inventory back to catalog
  @EventPattern('release_stock')
  async handleReleaseStock(@Payload() data: { productId: string; quantity: number }) {
    console.log(`[RMQ] Received release_stock event for Product: ${data.productId}, Qty: ${data.quantity}`);
    await this.productsService.releaseStock(data.productId, data.quantity);
  }
}
