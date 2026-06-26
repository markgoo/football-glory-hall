import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Match } from './Match';
import { User } from './User';

export type AIMatchSessionStatus = 'ready' | 'running' | 'finished' | 'saved';

@Entity('ai_match_sessions')
export class AIMatchSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Match, { nullable: false })
  match!: Match;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @Column({ type: 'integer', default: 8 })
  durationMinutes: number = 8;

  @Column({ type: 'text', default: 'ready' })
  status: AIMatchSessionStatus = 'ready';

  @Column({ type: 'integer', default: 0 })
  currentMinute: number = 0;

  @Column({ type: 'integer', default: 0 })
  homeScore: number = 0;

  @Column({ type: 'integer', default: 0 })
  awayScore: number = 0;

  @Column({ type: 'simple-json', nullable: true })
  homePlan?: any;

  @Column({ type: 'simple-json', nullable: true })
  awayPlan?: any;

  @Column({ type: 'simple-json', nullable: true })
  events?: any[];

  @Column({ type: 'simple-json', nullable: true })
  statistics?: any;

  @Column({ type: 'simple-json', nullable: true })
  engineState?: any;

  @Column({ type: 'text', nullable: true })
  model?: string;

  @Column({ type: 'text', default: 'zh' })
  language: 'zh' | 'en' = 'zh';

  @Column({ type: 'boolean', default: false })
  savedToMatch: boolean = false;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
