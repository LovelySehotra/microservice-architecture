import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    // Concept: Inject ProductsService to manage catalog and perform validations
    private readonly productsService: ProductsService,
  ) {}

  // Concept: REST endpoint to register new products in the catalog
  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // Concept: REST endpoint to fetch all products from the catalog
  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

  // Concept: REST endpoint to fetch a single product by its unique MongoDB ObjectId
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  // Concept: gRPC method matching the service definition in product.proto for fast synchronous stock checks
  @GrpcMethod('ProductService', 'ValidateStock')
  async validateStock(data: { productId: string; quantity: number }) {
    console.log(`[gRPC] ValidateStock called for Product: ${data.productId}, Qty: ${data.quantity}`);
    return this.productsService.validateStock(data.productId, data.quantity);
  }
}
