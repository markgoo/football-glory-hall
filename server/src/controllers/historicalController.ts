import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { HistoricalRecord } from '../models/HistoricalRecord';
import { Tournament } from '../models/Tournament';

export class HistoricalController {
  static async getAllRecords(req: Request, res: Response) {
    try {
      const historicalRepository = AppDataSource.getRepository(HistoricalRecord);
      const records = await historicalRepository.find({
        relations: ['user'],
        order: { year: 'DESC', createdAt: 'DESC' }
      });

      res.json(records);
    } catch (error) {
      console.error('Get historical records error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRecordById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const historicalRepository = AppDataSource.getRepository(HistoricalRecord);
      
      const record = await historicalRepository.findOne({
        where: { id },
        relations: ['user']
      });

      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json(record);
    } catch (error) {
      console.error('Get historical record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUserRecords(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const historicalRepository = AppDataSource.getRepository(HistoricalRecord);
      
      const records = await historicalRepository.find({
        where: { user: { id: userId } },
        order: { year: 'DESC', createdAt: 'DESC' }
      });

      res.json(records);
    } catch (error) {
      console.error('Get user records error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createRecordFromTournament(req: Request, res: Response) {
    try {
      const { tournamentId } = req.body;
      const userId = (req as any).user.id;

      const tournamentRepository = AppDataSource.getRepository(Tournament);
      const tournament = await tournamentRepository.findOne({
        where: { id: tournamentId, user: { id: userId } },
        relations: ['teams', 'matches']
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'completed') {
        return res.status(400).json({ error: 'Tournament must be completed' });
      }

      const historicalRepository = AppDataSource.getRepository(HistoricalRecord);

      // Check if record already exists
      const existingRecord = await historicalRepository.findOne({
        where: { tournamentName: tournament.name, year: new Date().getFullYear() }
      });

      if (existingRecord) {
        return res.status(400).json({ error: 'Historical record already exists' });
      }

      const tournamentMatches = tournament.matches || [];
      const tournamentTeams = tournament.teams || [];

      // Get tournament statistics
      const totalMatches = tournamentMatches.length;
      const completedMatches = tournamentMatches.filter(m => m.status === 'completed').length;
      const totalGoals = tournamentMatches.reduce((sum, match) => 
        sum + (match.homeScore || 0) + (match.awayScore || 0), 0
      );

      // Determine top teams based on points
      const topTeams = tournamentTeams
        .sort((a, b) => b.points - a.points)
        .slice(0, 3)
        .map(team => team.name);

      const winner = tournament.winner || topTeams[0];
      const runnerUp = topTeams[1] || '待定';

      const record = historicalRepository.create({
        tournamentName: tournament.name,
        year: new Date().getFullYear(),
        winner,
        runnerUp,
        topTeams,
        achievementType: 'tournament_winner',
        description: `${tournament.name} 冠军由 ${winner} 获得，共进行了 ${totalMatches} 场比赛，打入 ${totalGoals} 个进球。`,
        statistics: {
          totalMatches,
          completedMatches,
          totalGoals,
          averageGoals: totalGoals / completedMatches || 0,
          participation: tournamentTeams.length
        },
        user: { id: userId }
      });

      const savedRecord = await historicalRepository.save(record);
      res.status(201).json(savedRecord);
    } catch (error) {
      console.error('Create historical record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGloryHallStats(req: Request, res: Response) {
    try {
      const historicalRepository = AppDataSource.getRepository(HistoricalRecord);
      
      const [totalRecords, topWinners, yearlyStats] = await Promise.all([
        historicalRepository.count(),
        historicalRepository
          .createQueryBuilder('record')
          .select('record.winner, COUNT(*) as wins')
          .groupBy('record.winner')
          .orderBy('wins', 'DESC')
          .limit(10)
          .getRawMany(),
        historicalRepository
          .createQueryBuilder('record')
          .select('record.year, COUNT(*) as tournaments')
          .groupBy('record.year')
          .orderBy('record.year', 'DESC')
          .getRawMany()
      ]);

      res.json({
        totalRecords,
        topWinners,
        yearlyStats
      });
    } catch (error) {
      console.error('Get glory hall stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async searchRecords(req: Request, res: Response) {
    try {
      const { query } = req.query;
      const historicalRepository = AppDataSource.getRepository(HistoricalRecord);
      
      const records = await historicalRepository
        .createQueryBuilder('record')
        .where('record.tournamentName LIKE :query OR record.winner LIKE :query', { 
          query: `%${query}%` 
        })
        .orderBy('record.year', 'DESC')
        .getMany();

      res.json(records);
    } catch (error) {
      console.error('Search records error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
