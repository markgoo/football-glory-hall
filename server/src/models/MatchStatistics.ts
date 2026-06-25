import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Match } from './Match';

@Entity('match_statistics')
export class MatchStatistics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Match, match => match.statistics)
  @JoinColumn()
  match!: Match;

  @Column({ type: 'simple-json' })
  homeStats!: TeamMatchStats;

  @Column({ type: 'simple-json' })
  awayStats!: TeamMatchStats;

  @Column({ type: 'simple-json', nullable: true })
  detailedEvents?: DetailedEvent[];
}

export interface TeamMatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  offsides: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
}

export interface DetailedEvent {
  minute: number;
  type: string;
  player: string;
  team: string;
  description: string;
  impact?: string;
}