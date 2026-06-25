export interface User {
  id: string;
  username: string;
  email: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
  country?: string;
  founded?: number;
  groupName?: string;
  stats: TeamStats;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface TeamCandidate {
  id: string;
  name: string;
  shortName: string;
  country?: string;
  founded?: number;
  logo?: string | null;
  strength: number;
}

export interface TeamStats {
  attack: number;
  defense: number;
  midfield: number;
  overall: number;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  type: 'league' | 'knockout' | 'group_knockout';
  teamCount: number;
  groupSize?: number;
  teamCountries?: string[];
  startTime?: string;
  currentRound: number;
  winner?: string;
  teams: Team[];
  createdAt: string;
}

export interface Match {
  id: string;
  round: number;
  groupName?: string;
  stage?: 'third_place';
  scheduledAt?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  homeTeam: Team;
  awayTeam: Team;
  tournament: Tournament;
  homeScore?: number;
  awayScore?: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  resultMode?: 'auto' | 'manual';
  manualDetails?: any;
  commentary?: string;
  events?: MatchEvent[];
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'injury';
  team: string;
  player: string;
  description: string;
}

export interface MatchStatistics {
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
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

export interface HistoricalRecord {
  id: string;
  tournamentName: string;
  year: number;
  winner: string;
  runnerUp: string;
  topTeams: string[];
  achievementType: string;
  description?: string;
  statistics?: Record<string, any>;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
