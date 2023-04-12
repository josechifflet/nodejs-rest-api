import { Field, ID, ObjectType } from 'type-graphql';
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

@ObjectType()
@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn()
  PK: number;

  @Field(() => ID)
  @Column({ unique: true })
  @Generated('uuid')
  ID: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  lastname: string;

  @Field()
  @Column({ unique: true })
  username: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column({ unique: true })
  phoneNumber: string;

  @Field()
  @Column()
  password: string;

  @Field()
  @Column()
  totpSecret: string;

  @Field()
  @Column()
  fullName: string;

  @Field({ nullable: true })
  @Column({ nullable: true, unique: true })
  confirmationCode?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, unique: true })
  forgotPasswordCode?: string;

  @Field({ defaultValue: true })
  @Column({ default: true })
  isActive: boolean;

  @Field(() => Role, { defaultValue: Role.user })
  @Column({ type: 'enum', enum: Role, default: Role.user })
  role: string;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Attendance, (attendance) => attendance.user)
  attendances: Attendance[];
}
