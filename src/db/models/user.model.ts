import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from '../../types/enums';
import { Attendance } from './attendance.model';
import { Session } from './session.model';

@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn()
  userPK: number;

  @Column({ unique: true })
  @Generated('uuid')
  userID: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column()
  lastname: string;

  @Column()
  totpSecret: string;

  @Column({ nullable: true, unique: true })
  confirmationCode?: string;

  @Column({ nullable: true, unique: true })
  forgotPasswordCode?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: Role, default: Role.user })
  role: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Attendance, (attendance) => attendance.user)
  attendances: Attendance[];

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];
}
