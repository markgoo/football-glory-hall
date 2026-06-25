import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Team } from './Team';
import { Match } from './Match';

export type TournamentStatus = 'draft' | 'active' | 'completed';
export type TournamentType = 'league' | 'knockout' | 'group_knockout';

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', default: 'draft' })
  status: TournamentStatus = 'draft';

  @Column({ type: 'text', default: 'knockout' })
  type: TournamentType = 'knockout';

  @Column({ type: 'integer', default: 16 })
  teamCount: number = 16;

  @Column({ type: 'integer', nullable: true })
  groupSize?: number;

  @Column({ type: 'simple-json', nullable: true })
  teamCountries?: string[];

  @Column({ type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ type: 'integer', default: 0 })
  currentRound: number = 0;

  @Column({ type: 'text', nullable: true })
  winner?: string;

  @ManyToOne(() => User, user => user.tournaments)
  user!: User;

  @OneToMany(() => Team, team => team.tournament, { cascade: true })
  teams?: Team[];

  @OneToMany(() => Match, match => match.tournament, { cascade: true })
  matches?: Match[];

  @CreateDateColumn()
  createdAt!: Date;
}
