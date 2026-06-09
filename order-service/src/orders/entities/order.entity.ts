import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';

// Concept: Relational schema mapping for Orders table using TypeORM
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'PENDING' }) // PENDING, CONFIRMED, CANCELLED
  status: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalPrice: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
