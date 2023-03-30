import {
  Column,
  Entity,
  Generated,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Trader } from './trader.model';

@Entity()
export class Position {
  @PrimaryGeneratedColumn()
  positionPK: number;

  @Column({ unique: true })
  @Generated('uuid')
  positionID: string;

  @Column()
  symbol: string;

  @Column()
  entryPrice: number;

  @Column()
  markPrice: number;

  @Column()
  pnl: number;

  @Column()
  roe: number;

  @Column()
  updateTime: string;

  @Column()
  amount: number;

  @Column()
  leverage: number;

  @ManyToOne(() => Trader, (trader) => trader.positions)
  trader: Trader;
}
