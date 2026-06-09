import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

// Concept: Relational schema mapping for OrderItems table using TypeORM with relationship mapping
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column('integer')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
