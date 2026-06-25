import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne } from 'typeorm';
import { Tournament } from './Tournament';
import { Team } from './Team';
import { MatchStatistics } from './MatchStatistics';

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed';
export type MatchStage = 'third_place';
export type MatchResultMode = 'auto' | 'manual';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  round!: number;

  @Column({ type: 'text', default: 'scheduled' })
  status: MatchStatus = 'scheduled';

  @Column({ type: 'text', nullable: true })
  groupName?: string;

  @Column({ type: 'text', nullable: true })
  stage?: MatchStage;

  @ManyToOne(() => Team)
  homeTeam!: Team;

  @ManyToOne(() => Team)
  awayTeam!: Team;

  @Column({ type: 'integer', nullable: true })
  homeScore?: number;

  @Column({ type: 'integer', nullable: true })
  awayScore?: number;

  @Column({ type: 'integer', nullable: true })
  homePenaltyScore?: number;

  @Column({ type: 'integer', nullable: true })
  awayPenaltyScore?: number;

  @Column({ type: 'text', nullable: true })
  commentary?: string;

  @Column({ type: 'text', nullable: true })
  resultMode?: MatchResultMode;

  @Column({ type: 'simple-json', nullable: true })
  manualDetails?: any;

  @Column({ type: 'simple-json', nullable: true })
  events?: MatchEvent[];

  @ManyToOne(() => Tournament, tournament => tournament.matches)
  tournament!: Tournament;

  @OneToOne(() => MatchStatistics, statistics => statistics.match, { cascade: true })
  statistics?: MatchStatistics;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'injury';
  team: string;
  player: string;
  description: string;
}
