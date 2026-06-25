import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { MatchStatistics } from '../models/MatchStatistics';
import { TeamMatchStats } from '../models/MatchStatistics';

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'injury';
  team: string;
  player: string;
  description: string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  commentary: string[];
  statistics: {
    home: TeamMatchStats;
    away: TeamMatchStats;
  };
}

export class MatchEngine {
  static async simulateMatch(match: Match): Promise<MatchResult> {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;

    // Calculate team strengths
    const homeStrength = this.calculateTeamStrength(homeTeam);
    const awayStrength = this.calculateTeamStrength(awayTeam);

    // Simulate match
    const result = this.generateMatchResult(homeStrength, awayStrength, homeTeam, awayTeam);

    return result;
  }

  private static calculateTeamStrength(team: Team): number {
    const stats = team.stats;
    return (stats.attack * 0.4 + stats.midfield * 0.35 + stats.defense * 0.25);
  }

  private static generateMatchResult(
    homeStrength: number,
    awayStrength: number,
    homeTeam: Team,
    awayTeam: Team
  ): MatchResult {
    const baseHomeAdvantage = 1.1;
    const adjustedHomeStrength = homeStrength * baseHomeAdvantage;
    
    // Calculate expected goals
    const expectedHomeGoals = Math.max(0.5, (adjustedHomeStrength / 100) * 3 + (Math.random() - 0.5));
    const expectedAwayGoals = Math.max(0.5, (awayStrength / 100) * 3 + (Math.random() - 0.5));

    // Generate actual goals using Poisson-like distribution
    const homeGoals = this.poissonRandom(expectedHomeGoals);
    const awayGoals = this.poissonRandom(expectedAwayGoals);

    // Generate match events
    const events = this.generateMatchEvents(homeTeam, awayTeam, homeGoals, awayGoals);
    
    // Generate commentary
    const commentary = this.generateCommentary(homeTeam, awayTeam, homeGoals, awayGoals, events);
    
    // Generate detailed statistics
    const statistics = this.generateStatistics(homeTeam, awayTeam, homeGoals, awayGoals);

    return {
      homeScore: homeGoals,
      awayScore: awayGoals,
      events,
      commentary,
      statistics
    };
  }

  private static poissonRandom(lambda: number): number {
    const L = Math.exp(-lambda);
    let p = 1.0;
    let k = 0;

    do {
      k++;
      p *= Math.random();
    } while (p > L);

    return k - 1;
  }

  private static generateMatchEvents(
    homeTeam: Team,
    awayTeam: Team,
    homeGoals: number,
    awayGoals: number
  ): MatchEvent[] {
    const events: MatchEvent[] = [];

    // Generate goals (no player names)
    for (let i = 0; i < homeGoals; i++) {
      const minute = Math.floor(Math.random() * 90) + 1;
      events.push({
        minute,
        type: 'goal',
        team: homeTeam.name,
        player: '', // Empty string instead of player name
        description: `${homeTeam.name} 进球！`
      });
    }

    for (let i = 0; i < awayGoals; i++) {
      const minute = Math.floor(Math.random() * 90) + 1;
      events.push({
        minute,
        type: 'goal',
        team: awayTeam.name,
        player: '', // Empty string instead of player name
        description: `${awayTeam.name} 进球！`
      });
    }

    // Generate cards (no player names)
    const totalCards = Math.floor(Math.random() * 6);
    for (let i = 0; i < totalCards; i++) {
      const minute = Math.floor(Math.random() * 90) + 1;
      const isHome = Math.random() > 0.5;
      const team = isHome ? homeTeam.name : awayTeam.name;
      const cardType = Math.random() > 0.8 ? 'red_card' : 'yellow_card';

      events.push({
        minute,
        type: cardType,
        team,
        player: '', // Empty string instead of player name
        description: `${team} 获得${cardType === 'red_card' ? '红牌' : '黄牌'}`
      });
    }

    // Sort events by minute
    events.sort((a, b) => a.minute - b.minute);

    return events;
  }

  private static generateCommentary(
    homeTeam: Team,
    awayTeam: Team,
    homeGoals: number,
    awayGoals: number,
    events: MatchEvent[]
  ): string[] {
    const commentary: string[] = [];

    commentary.push(`比赛开始！${homeTeam.name} 主场对阵 ${awayTeam.name}`);

    events.forEach(event => {
      switch (event.type) {
        case 'goal':
          commentary.push(`${event.minute}' ${event.description}`);
          break;
        case 'yellow_card':
          commentary.push(`${event.minute}' ${event.team} 获得黄牌`);
          break;
        case 'red_card':
          commentary.push(`${event.minute}' ${event.team} 被红牌罚下！`);
          break;
      }
    });

    if (homeGoals > awayGoals) {
      commentary.push(`比赛结束！${homeTeam.name} ${homeGoals}-${awayGoals} 战胜 ${awayTeam.name}`);
    } else if (awayGoals > homeGoals) {
      commentary.push(`比赛结束！${awayTeam.name} ${awayGoals}-${homeGoals} 客场战胜 ${homeTeam.name}`);
    } else {
      commentary.push(`比赛结束！双方 ${homeGoals}-${awayGoals} 握手言和`);
    }

    return commentary;
  }

  private static generateStatistics(
    homeTeam: Team,
    awayTeam: Team,
    homeGoals: number,
    awayGoals: number
  ): { home: TeamMatchStats; away: TeamMatchStats } {
    const basePossession = 50 + (Math.random() - 0.5) * 20;

    return {
      home: {
        possession: Math.round(basePossession),
        shots: Math.floor(Math.random() * 20) + 5,
        shotsOnTarget: Math.floor(Math.random() * 10) + 2,
        corners: Math.floor(Math.random() * 8) + 2,
        fouls: Math.floor(Math.random() * 15) + 5,
        yellowCards: Math.floor(Math.random() * 4),
        redCards: Math.floor(Math.random() * 2),
        offsides: Math.floor(Math.random() * 5),
        passes: Math.floor(Math.random() * 300) + 200,
        passAccuracy: Math.floor(Math.random() * 20) + 70,
        tackles: Math.floor(Math.random() * 15) + 5,
        interceptions: Math.floor(Math.random() * 10) + 3
      },
      away: {
        possession: Math.round(100 - basePossession),
        shots: Math.floor(Math.random() * 20) + 5,
        shotsOnTarget: Math.floor(Math.random() * 10) + 2,
        corners: Math.floor(Math.random() * 8) + 2,
        fouls: Math.floor(Math.random() * 15) + 5,
        yellowCards: Math.floor(Math.random() * 4),
        redCards: Math.floor(Math.random() * 2),
        offsides: Math.floor(Math.random() * 5),
        passes: Math.floor(Math.random() * 300) + 200,
        passAccuracy: Math.floor(Math.random() * 20) + 70,
        tackles: Math.floor(Math.random() * 15) + 5,
        interceptions: Math.floor(Math.random() * 10) + 3
      }
    };
  }
}