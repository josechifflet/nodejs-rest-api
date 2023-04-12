import { Field, ID, ObjectType } from 'type-graphql';
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

@ObjectType()
@Entity({ name: 'attendance' })
export class Attendance {
  @PrimaryGeneratedColumn()
  PK: number;

  @Field(() => ID)
  @Column({ unique: true })
  @Generated('uuid')
  ID: string;

  @Field()
  @Column({ type: 'timestamptz' })
  timeEnter: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  ipAddressEnter: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  deviceEnter: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  remarksEnter?: string;

  @Field()
  @Column({ nullable: true, type: 'timestamptz' })
  timeLeave?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  ipAddressLeave?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  deviceLeave?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  remarksLeave?: string;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Field()
  @Column()
  userPK: number;

  @ManyToOne(() => User, (user) => user.attendances)
  @JoinColumn({ name: 'userPK' })
  user: User;
}
