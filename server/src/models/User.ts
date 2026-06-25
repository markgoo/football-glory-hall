import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tournament } from './Tournament';
import { HistoricalRecord } from './HistoricalRecord';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  username!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'text' })
  password!: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean = false;

  @Column({ type: 'datetime', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'text', default: 'user' })
  role: 'user' | 'admin' = 'user';

  @OneToMany(() => Tournament, tournament => tournament.user)
  tournaments?: Tournament[];

  @OneToMany(() => HistoricalRecord, record => record.user)
  historicalRecords?: HistoricalRecord[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
