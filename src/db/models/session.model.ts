import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './user.model';

@Entity({ name: 'session' })
export class Session {
  @PrimaryGeneratedColumn()
  sessionPK: number;

  @Column({ unique: true })
  @Generated('uuid')
  sessionID: string;

  @Column({ unique: true })
  jwtId: string;

  @Column()
  lastActive: string;

  @Column()
  sessionInfoIp: string;

  @Column()
  sessionInfoDevice: string;

  @Column()
  signedIn: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ nullable: true })
  userPK: number;

  @ManyToOne(() => User, (user) => user.sessions, {
    nullable: true,
  })
  @JoinColumn({ name: 'userPK' })
  user: User;
}
