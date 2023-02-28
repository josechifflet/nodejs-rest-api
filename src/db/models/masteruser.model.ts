import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from '../../types/enums';
import { Attendance } from './attendance.model';
import { MasterUserToProfile } from './masteruser-profile.model';
import { Session } from './session.model';

@Entity({ name: 'masteruser' })
export class MasterUser {
  @PrimaryGeneratedColumn()
  masteruserPK: number;

  @Column({ unique: true })
  @Generated('uuid')
  masteruserID: string;

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

  @OneToMany(() => Attendance, (attendance) => attendance.masteruser)
  attendances: Attendance[];

  @OneToMany(() => Session, (session) => session.profile)
  sessions: Session[];

  @OneToMany(
    () => MasterUserToProfile,
    (masterUserToProfile) => masterUserToProfile.masteruser
  )
  @JoinColumn({ referencedColumnName: 'masteruserPK' })
  public masterUserToProfiles: MasterUserToProfile[];
}
