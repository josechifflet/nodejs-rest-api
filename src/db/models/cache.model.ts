import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cache' })
export class Cache {
  @PrimaryColumn()
  id!: string;

  @Column({ nullable: true })
  value: string;

  @Column({ type: 'jsonb', default: '{}', nullable: true })
  data: Record<string, unknown>;

  @UpdateDateColumn({ nullable: false })
  updatedAt!: Date;
}
