import {
  Column,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Position } from './position.model';

@Entity()
export class Trader {
  @PrimaryGeneratedColumn()
  traderPK: number;

  @Column({ unique: true })
  @Generated('uuid')
  traderID: string;

  @Column()
  nickname: string;

  @Column({ nullable: true })
  futureUid: number;

  @Column()
  encryptedUid: string;

  @Column()
  rank: number;

  @Column({ type: 'numeric' })
  pnl: number;

  @Column({ type: 'numeric' })
  roi: number;

  @Column()
  positionShared: boolean;

  @Column()
  updateTime: string;

  @OneToMany(() => Position, (position) => position.trader)
  positions: Position[];
}
