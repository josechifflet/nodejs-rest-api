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

import { MasterUser } from './masteruser.model';
import { Profile } from './profile.model';

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
  masteruserPK: number;

  @ManyToOne(() => MasterUser, (masteruser) => masteruser.attendances, {
    nullable: true,
  })
  @JoinColumn({ name: 'masteruserPK' })
  masteruser: MasterUser;

  @Column({ nullable: true })
  profilePK: number;

  @ManyToOne(() => Profile, (profile) => profile.attendances, {
    nullable: true,
  })
  @JoinColumn({ name: 'profilePK' })
  profile: Profile;
}
