import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

export type AchievementType = 'tournament_winner' | 'tournament_runner_up' | 'best_team' | 'best_manager';

@Entity('historical_records')
export class HistoricalRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  tournamentName!: string;

  @Column({ type: 'integer' })
  year!: number;

  @Column({ type: 'text' })
  winner!: string;

  @Column({ type: 'simple-json' })
  runnerUp!: string;

  @Column({ type: 'simple-json' })
  topTeams!: string[];

  @Column({ type: 'text' })
  achievementType!: AchievementType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-json', nullable: true })
  statistics?: Record<string, any>;

  @ManyToOne(() => User, user => user.historicalRecords)
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}