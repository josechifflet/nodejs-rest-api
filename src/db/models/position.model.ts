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

  @Column({ type: 'numeric' })
  entryPrice: number;

  @Column({ type: 'numeric' })
  markPrice: number;

  @Column({ type: 'numeric' })
  pnl: number;

  @Column({ type: 'numeric' })
  roe: number;

  @Column()
  updateTime: string;

  @Column({ type: 'numeric' })
  amount: number;

  @Column()
  leverage: number;

  @ManyToOne(() => Trader, (trader) => trader.positions)
  trader: Trader;
}
