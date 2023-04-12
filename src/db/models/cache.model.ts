import { Field, ID, ObjectType } from 'type-graphql';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@ObjectType()
@Entity({ name: 'cache' })
export class Cache {
  @Field(() => ID)
  @PrimaryColumn()
  id!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  value: string;

  @Field(() => JSON, { nullable: true })
  @Column({ type: 'jsonb', default: '{}', nullable: true })
  data: Record<string, unknown>;

  @Field({ nullable: false })
  @UpdateDateColumn({ nullable: false })
  updatedAt!: Date;
}
