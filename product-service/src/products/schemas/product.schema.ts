import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

// Concept: Database schema modeling for MongoDB document collection using Mongoose decorators
@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, default: 0 })
  stock: number;

  @Prop()
  description: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
