import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Position } from './position.model';
import { TraderPerformance } from './trader_performance.model';

@ObjectType()
@Entity()
export class Trader {
  @Field()
  @PrimaryGeneratedColumn()
  PK: number;

  @Field()
  @Column({ unique: true })
  @Generated('uuid')
  ID: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  futureUid?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  nickName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  userPhotoUrl?: string;

  @Field()
  @Column()
  rank: number;

  @Field()
  @Column({ default: false })
  positionShared: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  twitterUrl?: string;

  @Field()
  @Column()
  encryptedUid: string;

  @Field()
  @Column()
  updateTime: string;

  @Field()
  @Column()
  followerCount: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  twShared?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  isTwTrader?: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  openId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  tradeType?: string;

  @Field()
  @Column({ type: 'numeric', nullable: true })
  pnl?: number;

  @Field()
  @Column({ type: 'numeric', nullable: true })
  roi?: number;

  @OneToMany(() => Position, (position) => position.trader)
  @JoinColumn({ referencedColumnName: 'traderPK' })
  positions: Position[];

  @OneToMany(() => TraderPerformance, (performance) => performance.trader)
  @JoinColumn({ referencedColumnName: 'traderPK' })
  performances: TraderPerformance[];
}
