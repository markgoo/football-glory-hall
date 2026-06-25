import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { MatchStatistics } from '../models/MatchStatistics';
import { Tournament } from '../models/Tournament';
import { MatchEngine } from '../services/matchEngine';
import { TournamentController } from './tournamentController';

export class MatchController {
  private static shouldUsePenalties(match: Match, result: { homeScore: number; awayScore: number }) {
    return !match.groupName
      && match.tournament.type !== 'league'
      && result.homeScore === result.awayScore;
  }

  private static generatePenaltyShootout(homeTeamName: string, awayTeamName: string) {
    let homePenaltyScore = 0;
    let awayPenaltyScore = 0;

    for (let kick = 0; kick < 5; kick++) {
      if (Math.random() < 0.76) homePenaltyScore += 1;
      if (Math.random() < 0.76) awayPenaltyScore += 1;
    }

    while (homePenaltyScore === awayPenaltyScore) {
      if (Math.random() < 0.76) homePenaltyScore += 1;
      if (Math.random() < 0.76) awayPenaltyScore += 1;
    }

    const winnerName = homePenaltyScore > awayPenaltyScore ? homeTeamName : awayTeamName;

    return {
      homePenaltyScore,
      awayPenaltyScore,
      commentary: [
        `常规时间战平，比赛进入点球大战。`,
        `点球大战结束：${homeTeamName} ${homePenaltyScore}-${awayPenaltyScore} ${awayTeamName}，${winnerName} 点球胜出。`
      ]
    };
  }

  private static calculateImpact(eventType: string): string {
    switch (eventType) {
      case 'goal':
        return '进球改变比赛走向';
      case 'red_card':
        return '红牌改变比赛人数优势';
      case 'yellow_card':
        return '黄牌可能影响球员表现';
      case 'substitution':
        return '换人调整阵容';
      case 'injury':
        return '伤病影响比赛';
      default:
        return '事件影响比赛节奏';
    }
  }
  static async getAllMatches(req: Request, res: Response) {
    try {
      const matchRepository = AppDataSource.getRepository(Match);
      const matches = await matchRepository.find({
        relations: ['homeTeam', 'awayTeam', 'tournament', 'statistics'],
        order: { round: 'ASC' }
      });

      res.json(matches);
    } catch (error) {
      console.error('Get matches error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMatchById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const matchRepository = AppDataSource.getRepository(Match);
      
      const match = await matchRepository.findOne({
        where: { id },
        relations: ['homeTeam', 'awayTeam', 'tournament', 'statistics']
      });

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      res.json(match);
    } catch (error) {
      console.error('Get match error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async simulateMatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const matchRepository = AppDataSource.getRepository(Match);
      const match = await matchRepository.findOne({
        where: { id },
        relations: ['homeTeam', 'awayTeam', 'tournament', 'tournament.user', 'tournament.teams']
      });

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      console.log('Simulating match:', match.id);
      console.log('Tournament type:', match.tournament?.type);
      console.log('Tournament status:', match.tournament?.status);

      if (match.tournament.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (match.status === 'completed') {
        return res.status(400).json({ error: 'Match already completed' });
      }

      if (!match.homeTeam || !match.awayTeam) {
        return res.status(400).json({ error: 'This scheduled slot has not been assigned teams yet' });
      }

      const simulationResult = await MatchEngine.simulateMatch(match);
      const penaltyResult = MatchController.shouldUsePenalties(match, simulationResult)
        ? MatchController.generatePenaltyShootout(match.homeTeam.name, match.awayTeam.name)
        : null;

      // Update match with results
      match.homeScore = simulationResult.homeScore;
      match.awayScore = simulationResult.awayScore;
      match.homePenaltyScore = penaltyResult?.homePenaltyScore;
      match.awayPenaltyScore = penaltyResult?.awayPenaltyScore;
      match.status = 'completed';
      match.resultMode = 'auto';
      match.commentary = [...simulationResult.commentary, ...(penaltyResult?.commentary || [])].join('\n');
      match.events = simulationResult.events;

      const statistics = new MatchStatistics();
      statistics.match = match;
      statistics.homeStats = simulationResult.statistics.home;
      statistics.awayStats = simulationResult.statistics.away;
      statistics.detailedEvents = simulationResult.events.map(event => ({
        minute: event.minute,
        type: event.type,
        player: event.player,
        team: event.team,
        description: event.description,
        impact: MatchController.calculateImpact(event.type)
      }));

      await AppDataSource.getRepository(MatchStatistics).save(statistics);
      const updatedMatch = await matchRepository.save(match);

      // Update team statistics
      await MatchController.updateTeamStatistics(match.homeTeam, match.awayTeam, simulationResult);

      // Reload tournament after saving the match
      const tournamentRepository = AppDataSource.getRepository(Tournament);
      const freshTournament = await tournamentRepository.findOne({
        where: { id: match.tournament.id }
      });

      if (!freshTournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Generate next round matches for knockout tournaments
      if (freshTournament.type === 'knockout' && freshTournament.status === 'active') {
        try {
          const nextRoundMatches = await TournamentController.generateKnockoutNextRound(
            freshTournament.id,
            match.round
          );

          if (nextRoundMatches.length > 0) {
            console.log(`Generated ${nextRoundMatches.length} matches for round ${match.round + 1}`);
          } else {
            console.log('No matches generated for next round');
          }
        } catch (error) {
          console.error('Error generating next round matches:', error);
          // Don't fail the match simulation if next round generation fails
        }
      } else {
        console.log('Skipping next round generation:', {
          type: freshTournament.type,
          status: freshTournament.status
        });
      }

      if (freshTournament.realTournamentTemplate) {
        try {
          await TournamentController.resolveRealTournamentSlots(freshTournament.id);
        } catch (error) {
          console.error('Error resolving real tournament slots:', error);
        }
      } else if (freshTournament.type === 'group_knockout' && freshTournament.status !== 'completed') {
        try {
          if (match.groupName) {
            await TournamentController.generateGroupKnockoutStage(freshTournament.id);
          } else {
            await TournamentController.generateKnockoutNextRound(freshTournament.id, match.round);
          }
        } catch (error) {
          console.error('Error advancing group knockout tournament:', error);
        }
      }

      res.json({
        match: updatedMatch,
        statistics,
        simulation: simulationResult
      });
    } catch (error) {
      console.error('Simulate match error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async completeManualMatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const { homeScore, awayScore, manualDetails } = req.body;

      const matchRepository = AppDataSource.getRepository(Match);
      const match = await matchRepository.findOne({
        where: { id },
        relations: ['homeTeam', 'awayTeam', 'tournament', 'tournament.user', 'tournament.teams']
      });

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      if (match.tournament.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (match.status === 'completed') {
        return res.status(400).json({ error: 'Match already completed' });
      }

      if (!match.homeTeam || !match.awayTeam) {
        return res.status(400).json({ error: 'This scheduled slot has not been assigned teams yet' });
      }

      const normalizedHomeScore = Number(homeScore);
      const normalizedAwayScore = Number(awayScore);
      if (!Number.isInteger(normalizedHomeScore) || !Number.isInteger(normalizedAwayScore) || normalizedHomeScore < 0 || normalizedAwayScore < 0) {
        return res.status(400).json({ error: 'Invalid manual score' });
      }

      const penaltyResult = MatchController.shouldUsePenalties(match, {
        homeScore: normalizedHomeScore,
        awayScore: normalizedAwayScore
      })
        ? MatchController.generatePenaltyShootout(match.homeTeam.name, match.awayTeam.name)
        : null;

      match.homeScore = normalizedHomeScore;
      match.awayScore = normalizedAwayScore;
      match.homePenaltyScore = penaltyResult?.homePenaltyScore;
      match.awayPenaltyScore = penaltyResult?.awayPenaltyScore;
      match.status = 'completed';
      match.resultMode = 'manual';
      match.manualDetails = manualDetails;
      match.events = [];
      match.commentary = [
        `本场比赛使用手工掷骰计算。`,
        `${match.homeTeam.name} ${normalizedHomeScore}-${normalizedAwayScore} ${match.awayTeam.name}`,
        ...(penaltyResult?.commentary || [])
      ].join('\n');

      const statistics = new MatchStatistics();
      statistics.match = match;
      statistics.homeStats = MatchController.createManualStats(normalizedHomeScore);
      statistics.awayStats = MatchController.createManualStats(normalizedAwayScore);
      statistics.detailedEvents = [];

      await AppDataSource.getRepository(MatchStatistics).save(statistics);
      const updatedMatch = await matchRepository.save(match);
      await MatchController.updateTeamStatistics(match.homeTeam, match.awayTeam, {
        homeScore: normalizedHomeScore,
        awayScore: normalizedAwayScore
      });
      await MatchController.advanceTournamentAfterMatch(match);

      res.json({ match: updatedMatch, statistics });
    } catch (error) {
      console.error('Complete manual match error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private static createManualStats(score: number) {
    return {
      possession: Math.floor(Math.random() * 21) + 40,
      shots: Math.max(5, score * 4 + Math.floor(Math.random() * 6)),
      shotsOnTarget: Math.max(2, score * 2 + Math.floor(Math.random() * 3)),
      corners: Math.floor(Math.random() * 7) + 2,
      fouls: Math.floor(Math.random() * 12) + 6,
      yellowCards: Math.floor(Math.random() * 3),
      redCards: Math.random() > 0.92 ? 1 : 0,
      offsides: Math.floor(Math.random() * 4),
      passes: Math.floor(Math.random() * 260) + 240,
      passAccuracy: Math.floor(Math.random() * 16) + 75,
      tackles: Math.floor(Math.random() * 14) + 8,
      interceptions: Math.floor(Math.random() * 9) + 4
    };
  }

  private static async advanceTournamentAfterMatch(match: Match) {
    const tournamentRepository = AppDataSource.getRepository(Tournament);
    const freshTournament = await tournamentRepository.findOne({
      where: { id: match.tournament.id }
    });

    if (!freshTournament) {
      return;
    }

    if (freshTournament.type === 'knockout' && freshTournament.status === 'active') {
      await TournamentController.generateKnockoutNextRound(freshTournament.id, match.round);
      return;
    }

    if (freshTournament.realTournamentTemplate) {
      await TournamentController.resolveRealTournamentSlots(freshTournament.id);
      return;
    }

    if (freshTournament.type === 'group_knockout' && freshTournament.status !== 'completed') {
      if (match.groupName) {
        await TournamentController.generateGroupKnockoutStage(freshTournament.id);
      } else {
        await TournamentController.generateKnockoutNextRound(freshTournament.id, match.round);
      }
    }
  }

  static async getMatchStatistics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const statisticsRepository = AppDataSource.getRepository(MatchStatistics);

      const statistics = await statisticsRepository.findOne({
        where: { match: { id } },
        relations: ['match', 'match.homeTeam', 'match.awayTeam']
      });

      if (!statistics) {
        return res.status(404).json({ error: 'Statistics not found' });
      }

      res.json(statistics);
    } catch (error) {
      console.error('Get match statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteMatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const matchRepository = AppDataSource.getRepository(Match);
      const matchStatsRepository = AppDataSource.getRepository(MatchStatistics);

      // Find match with tournament relation
      const match = await matchRepository.findOne({
        where: { id },
        relations: ['tournament', 'tournament.user', 'statistics']
      });

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Check if user owns the tournament
      if (match.tournament.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete statistics if exists
      if (match.statistics) {
        await matchStatsRepository.remove(match.statistics);
      }

      // Delete the match
      await matchRepository.remove(match);

      res.json({ message: 'Match deleted successfully' });
    } catch (error) {
      console.error('Delete match error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private static async updateTeamStatistics(
    homeTeam: any,
    awayTeam: any,
    result: any
  ) {
    const teamRepository = AppDataSource.getRepository(Team);

    if (result.homeScore > result.awayScore) {
      homeTeam.wins += 1;
      homeTeam.points += 3;
      awayTeam.losses += 1;
    } else if (result.homeScore < result.awayScore) {
      awayTeam.wins += 1;
      awayTeam.points += 3;
      homeTeam.losses += 1;
    } else {
      homeTeam.draws += 1;
      awayTeam.draws += 1;
      homeTeam.points += 1;
      awayTeam.points += 1;
    }

    homeTeam.goalsFor += result.homeScore;
    homeTeam.goalsAgainst += result.awayScore;
    awayTeam.goalsFor += result.awayScore;
    awayTeam.goalsAgainst += result.homeScore;

    await teamRepository.save([homeTeam, awayTeam]);
  }
}
