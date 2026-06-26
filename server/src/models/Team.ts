import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Tournament } from './Tournament';
import { Match } from './Match';

export interface TeamStats {
  attack: number;
  defense: number;
  midfield: number;
  overall: number;
}

export interface TeamPlayer {
  id?: number | string;
  name: string;
  age?: number;
  number?: number;
  position?: string;
  photo?: string;
  rating?: number;
}

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  shortName!: string;

  @Column({ type: 'simple-json' })
  stats!: TeamStats;

  @Column({ type: 'text', nullable: true })
  logo?: string;

  @Column({ type: 'text', nullable: true })
  country?: string;

  @Column({ type: 'integer', nullable: true })
  founded?: number;

  @Column({ type: 'integer', nullable: true })
  externalApiId?: number;

  @Column({ type: 'text', nullable: true })
  playerSource?: 'api-football' | 'generated';

  @Column({ type: 'datetime', nullable: true })
  playersSyncedAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  players?: TeamPlayer[];

  @Column({ type: 'text', nullable: true })
  groupName?: string;

  @Column({ type: 'integer', default: 0 })
  points: number = 0;

  @Column({ type: 'integer', default: 0 })
  wins: number = 0;

  @Column({ type: 'integer', default: 0 })
  draws: number = 0;

  @Column({ type: 'integer', default: 0 })
  losses: number = 0;

  @Column({ type: 'integer', default: 0 })
  goalsFor: number = 0;

  @Column({ type: 'integer', default: 0 })
  goalsAgainst: number = 0;

  @ManyToOne(() => Tournament, tournament => tournament.teams)
  tournament!: Tournament;

  @ManyToMany(() => Match)
  @JoinTable()
  matches?: Match[];
}
