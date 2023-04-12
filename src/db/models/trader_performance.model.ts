import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Trader } from './trader.model';

@ObjectType()
@Entity()
export class TraderPerformance {
  @Field()
  @PrimaryGeneratedColumn()
  PK: number;

  @Field()
  @Column({ unique: true })
  @Generated('uuid')
  ID: string;

  @Field()
  @Column()
  periodType: string;

  @Field()
  @Column()
  statisticsType: string;

  @Field({ nullable: true })
  @Column({ type: 'numeric', nullable: true })
  value: number;

  @Field()
  @Column()
  rank: number;

  @Field()
  @Column()
  traderPK: number;

  @ManyToOne(() => Trader, (trader) => trader.performances)
  @JoinColumn({ name: 'traderPK' })
  trader: Trader;
}
