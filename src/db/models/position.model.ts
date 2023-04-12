import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Trader } from './trader.model';

@ObjectType()
@Entity()
export class Position {
  @Field()
  @PrimaryGeneratedColumn()
  PK: number;

  @Field()
  @Column({ unique: true })
  @Generated('uuid')
  ID: string;

  @Field()
  @Column()
  symbol: string;

  @Field()
  @Column({ type: 'numeric' })
  entryPrice: number;

  @Field()
  @Column({ type: 'numeric' })
  markPrice: number;

  @Field()
  @Column({ type: 'numeric' })
  pnl: number;

  @Field()
  @Column({ type: 'numeric' })
  roe: number;

  @Field()
  @Column({ type: 'numeric' })
  amount: number;

  @Field()
  @Column()
  updateTime: Date;

  @Field()
  @Column()
  updateTimeStamp: string;

  @Field()
  @Column()
  yellow: boolean;

  @Field()
  @Column()
  leverage: number;

  @Field()
  @Column()
  tradeBefore: boolean;

  @Field()
  @Column()
  tradeType: string;

  @Field()
  @DeleteDateColumn()
  closedAproxAtMs?: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @Column({ nullable: true })
  entryAproxAtMs?: string;

  @Field()
  @Column()
  traderPK: number;

  @ManyToOne(() => Trader, (trader) => trader.positions)
  @JoinColumn({ name: 'traderPK' })
  trader: Trader;
}
