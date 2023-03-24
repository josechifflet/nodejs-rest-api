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

@Entity({ name: 'attendance' })
export class Attendance {
  @PrimaryGeneratedColumn()
  attendancePK: number;

  @Column({ unique: true })
  @Generated('uuid')
  attendanceID: string;

  @Column({ type: 'timestamptz' })
  timeEnter: Date;

  @Column({ nullable: true })
  ipAddressEnter: string;

  @Column({ nullable: true })
  deviceEnter: string;

  @Column({ nullable: true })
  remarksEnter?: string;

  @Column({ nullable: true, type: 'timestamptz' })
  timeLeave?: Date;

  @Column({ nullable: true })
  ipAddressLeave?: string;

  @Column({ nullable: true })
  deviceLeave?: string;

  @Column({ nullable: true })
  remarksLeave?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ nullable: true })
  userPK: number;

  @ManyToOne(() => User, (user) => user.attendances, {
    nullable: true,
  })
  @JoinColumn({ name: 'userPK' })
  user: User;

  @Column({ nullable: true })
  profilePK: number;
}
