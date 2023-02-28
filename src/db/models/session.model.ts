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

@Entity({ name: 'session' })
export class Session {
  @PrimaryGeneratedColumn()
  sessionPK: number;

  @Column({ unique: true })
  @Generated('uuid')
  sessionID: string;

  @Column({ unique: true })
  jwtId: string;

  /** Date.now().toString() */
  @Column()
  lastActive: string;

  @Column()
  sessionInfoIp: string;

  @Column()
  sessionInfoDevice: string;

  /** Date.now().toString() */
  @Column()
  signedIn: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ nullable: true })
  masteruserPK: number;

  @Column({ nullable: true })
  profilePK: number;

  @ManyToOne(() => MasterUser, (masteruser) => masteruser.sessions, {
    nullable: true,
  })
  @JoinColumn({ name: 'masteruserPK' })
  masteruser: MasterUser;

  @ManyToOne(() => Profile, (profile) => profile.sessions, {
    nullable: true,
  })
  @JoinColumn({ name: 'profilePK' })
  profile: Profile;
}
