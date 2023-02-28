import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { MasterUser } from './masteruser.model';
import { Profile } from './profile.model';

@Entity()
export class MasterUserToProfile {
  @PrimaryGeneratedColumn()
  masterUserToProfilePK: number;

  @Column({ unique: true })
  @Generated('uuid')
  masterUserToProfileID: string;

  @Column()
  public masteruserPK: number;

  @Column()
  public profilePK: number;

  @Column()
  public order: number;

  @ManyToOne(() => MasterUser, (masteruser) => masteruser.masterUserToProfiles)
  @JoinColumn({ name: 'masteruserPK' })
  public masteruser: MasterUser;

  @ManyToOne(() => Profile, (profile) => profile.masterUserToProfiles)
  @JoinColumn({ name: 'profilePK' })
  public profile: Profile;
}
