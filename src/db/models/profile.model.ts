import { registerEnumType } from 'type-graphql';
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

import { Attendance } from './attendance.model';
import { MasterUserToProfile } from './masteruser-profile.model';
import { Session } from './session.model';

export enum WeightUnit {
  kg = 'kg',
  lb = 'lb',
}

registerEnumType(WeightUnit, {
  name: "WeightUnit",
  description: "Enum of weight units"
});

export enum HeightUnit {
  cm = 'cm',
  ft = 'ft',
}

registerEnumType(HeightUnit, {
  name: "HeightUnit",
  description: "Enum of height units"
});

export enum ExperienceType {
  begineer = 'begineer',
  intermediate = 'intermediate',
  advanced ='advanced',
}

registerEnumType(ExperienceType, {
  name: "ExperienceType",
  description: "Enum of experience types"
});

// If there's any new attribute that can be public, add it here
export interface PublicAttributes {
  age: boolean;
  gender: boolean;
  location: boolean;
}

@Entity({ name: 'profile' })
export class Profile {
  @PrimaryGeneratedColumn()
  profilePK: number;

  @Column({ unique: true })
  @Generated('uuid')
  profileID: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column()
  lastname: string;

  @Column({ nullable: true })
  birthdate?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  gender?: string; // Should be enum?

  @Column({ nullable: true })
  experience?: ExperienceType;
  
  @Column({ nullable: true })
  brightness?: number;
  
  @Column({ nullable: true })
  volume?: number;
  
  @Column({ nullable: true })
  height?: number;

  @Column({ nullable: true })
  heightUnit?: HeightUnit;
  
  @Column({ nullable: true })
  weight?: number;

  @Column({ nullable: true })
  weightUnit?: WeightUnit;

  @Column({ nullable: true })
  profileImg?: string;
    
  @Column({ nullable: true })
  maxHR?: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, unique: true })
  confirmationCode?: string;

  @Column({ nullable: true, unique: true })
  forgotPasswordCode?: string;

  @Column({ type: 'jsonb', nullable: true, default: {age: false, gender: false, location: false} })
  public publicAttributes: PublicAttributes;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Attendance, (attendance) => attendance.profile)
  attendances: Attendance[];

  @OneToMany(() => Session, (session) => session.profile)
  sessions: Session[];

  @OneToMany(
    () => MasterUserToProfile,
    (masterUserToProfile) => masterUserToProfile.profile
  )
  @JoinColumn({ referencedColumnName: 'profilePK' })
  public masterUserToProfiles: MasterUserToProfile[];
}
