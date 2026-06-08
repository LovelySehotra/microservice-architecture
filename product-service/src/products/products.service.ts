import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import Redis from 'ioredis';

@Injectable()
export class ProductsService {
  private readonly redisClient: Redis;

  constructor(
    // Concept: Inject the Mongoose Model representing the products collection
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {
    // Concept: Initialize connection to Redis for read caching and fast fallbacks
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Concept: Create product in MongoDB and write it directly to the Redis cache
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = new this.productModel(createProductDto);
    const saved = await product.save();
    
    // Concept: Write-through cache pattern to populate Redis
    await this.redisClient.set(`product:${saved.id}`, JSON.stringify(saved), 'EX', 3600);
    return saved;
  }

  // Concept: Fetch all products from MongoDB
  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  // Concept: Read-aside caching pattern, reading from Redis first, falling back to MongoDB
  async findById(id: string): Promise<Product> {
    const cached = await this.redisClient.get(`product:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Concept: Populate cache for subsequent reads
    await this.redisClient.set(`product:${id}`, JSON.stringify(product), 'EX', 3600);
    return product;
  }

  // Concept: Synchronous stock validation logic called by other services (gRPC context)
  async validateStock(productId: string, quantity: number) {
    try {
      const product = await this.productModel.findById(productId).exec();
      if (!product) {
        return { available: false, title: '', price: 0, message: 'Product not found' };
      }

      if (product.stock >= quantity) {
        return {
          available: true,
          title: product.title,
          price: product.price,
          message: 'Stock is available',
        };
      }

      return {
        available: false,
        title: product.title,
        price: product.price,
        message: `Insufficient stock. Requested: ${quantity}, Available: ${product.stock}`,
      };
    } catch (error) {
      return { available: false, title: '', price: 0, message: `Error checking stock: ${error.message}` };
    }
  }

  // Concept: Atomic MongoDB update to reserve stock without race conditions, invalidating Redis cache
  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const result = await this.productModel.updateOne(
      { _id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
    ).exec();

    if (result.modifiedCount > 0) {
      await this.redisClient.del(`product:${productId}`);
      return true;
    }
    return false;
  }

  // Concept: Compensating transaction in SAGA to rollback stock reservations on order failure
  async releaseStock(productId: string, quantity: number): Promise<void> {
    await this.productModel.updateOne(
      { _id: productId },
      { $inc: { stock: quantity } },
    ).exec();
    await this.redisClient.del(`product:${productId}`);
  }
}
