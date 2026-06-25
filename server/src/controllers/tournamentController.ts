import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Tournament } from '../models/Tournament';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { MatchStatistics } from '../models/MatchStatistics';
import { HistoricalRecord } from '../models/HistoricalRecord';
import { In, IsNull } from 'typeorm';
import FootballAPIService from '../services/footballAPIService';

const normalizeTeamIdentityName = (teamName: string) => {
  const normalized = String(teamName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = {
    bayernmunchen: 'bayernmunich',
    fcbayernmunchen: 'bayernmunich',
    fcbayernmunich: 'bayernmunich',
    intermilan: 'inter',
    internazionale: 'inter',
    parisstgermain: 'parissaintgermain',
    psg: 'parissaintgermain',
    atletico: 'atleticomadrid',
    athletico: 'atleticomadrid',
    tottenhamhotspur: 'tottenham',
    spurs: 'tottenham',
    sportinglisbon: 'sportingcp',
    sportingu: 'sportingcp',
    fcporto: 'porto',
    slbenfica: 'benfica'
  };
  return aliases[normalized] || normalized;
};

const getTeamIdentityKey = (team: any) => {
  const teamName = normalizeTeamIdentityName(team?.name);
  const country = String(team?.country || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return teamName ? `${teamName}:${country}` : String(team?.id || '').toLowerCase();
};

export class TournamentController {
  private static getMatchStageOrder(match: Match) {
    if (match.groupName) return TournamentController.getGroupOrder(match.groupName);
    if (match.stage === 'third_place') return 9998;
    return 9999;
  }

  private static assignMatchSchedule(matches: Match[], startTime?: Date) {
    if (!startTime || Number.isNaN(startTime.getTime())) return;

    const roundIndexes = Array.from(new Set(matches.map(match => match.round))).sort((a, b) => a - b);
    const roundOffset = new Map(roundIndexes.map((round, index) => [round, index]));

    roundIndexes.forEach(round => {
      const roundMatches = matches
        .filter(match => match.round === round)
        .sort((a, b) =>
          TournamentController.getMatchStageOrder(a) - TournamentController.getMatchStageOrder(b) ||
          (a.homeTeam?.name || '').localeCompare(b.homeTeam?.name || '') ||
          (a.awayTeam?.name || '').localeCompare(b.awayTeam?.name || '')
        );
      roundMatches.forEach((match, index) => {
        const scheduledAt = new Date(startTime);
        scheduledAt.setDate(scheduledAt.getDate() + (roundOffset.get(round) || 0));
        scheduledAt.setHours(scheduledAt.getHours() + index * 2);
        match.scheduledAt = scheduledAt;
      });
    });
  }

  private static getNextRoundStartTime(existingMatches: Match[], nextRound: number, tournamentStartTime?: Date) {
    const scheduledTimes = existingMatches
      .map(match => match.scheduledAt ? new Date(match.scheduledAt).getTime() : undefined)
      .filter((time): time is number => typeof time === 'number' && !Number.isNaN(time));

    if (scheduledTimes.length > 0) {
      const nextStart = new Date(Math.max(...scheduledTimes));
      nextStart.setDate(nextStart.getDate() + 1);
      nextStart.setMinutes(0, 0, 0);
      return nextStart;
    }

    if (tournamentStartTime) {
      const nextStart = new Date(tournamentStartTime);
      nextStart.setDate(nextStart.getDate() + Math.max(0, nextRound - 1));
      return nextStart;
    }

    return undefined;
  }

  static async getTeamPool(req: Request, res: Response) {
    try {
      const { teamCount, teamCountries } = req.body;
      const normalizedTeamCount = Number(teamCount);
      const normalizedTeamCountries = Array.isArray(teamCountries)
        ? teamCountries.map((country: unknown) => String(country).trim()).filter(Boolean)
        : undefined;

      if (![8, 16, 32, 64, 128].includes(normalizedTeamCount)) {
        return res.status(400).json({ error: 'Team count must be 8, 16, 32, 64, or 128' });
      }

      const poolSize = Math.min(160, Math.max(normalizedTeamCount * 3, normalizedTeamCount + 16));
      const apiTeams = await FootballAPIService.getPopularTeams(poolSize, normalizedTeamCountries);

      const prioritizedTeams = [...apiTeams].sort((a: any, b: any) => {
        const aHasLogo = a.team?.logo ? 1 : 0;
        const bHasLogo = b.team?.logo ? 1 : 0;
        return bHasLogo - aHasLogo || (b.team?.strength || 0) - (a.team?.strength || 0);
      });
      const uniqueTeams = prioritizedTeams.filter((item: any, index: number, teams: any[]) => {
        const key = getTeamIdentityKey(item.team);
        return teams.findIndex((candidate: any) => getTeamIdentityKey(candidate.team) === key) === index;
      });

      res.json(uniqueTeams.map((item: any, index: number) => ({
        id: String(item.team.id || `${item.team.name}-${index}`),
        name: item.team.name,
        shortName: item.team.code || item.team.name.substring(0, 3).toUpperCase(),
        country: item.team.country,
        founded: item.team.founded,
        logo: item.team.logo || null,
        strength: item.team.strength || 82
      })));
    } catch (error) {
      console.error('Get team pool error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAllTournaments(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const tournamentRepository = AppDataSource.getRepository(Tournament);

      console.log(`[GET] Fetching tournaments for user: ${userId}`);

      const tournaments = await tournamentRepository.find({
        where: { user: { id: userId } },
        relations: ['teams', 'matches', 'matches.homeTeam', 'matches.awayTeam'],
        order: { createdAt: 'DESC' }
      });

      console.log(`[GET] Found ${tournaments.length} tournaments for user ${userId}`);

      res.json(tournaments);
    } catch (error) {
      console.error('Get tournaments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getTournamentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tournamentRepository = AppDataSource.getRepository(Tournament);
      
      let tournament = await tournamentRepository.findOne({
        where: { id },
        relations: ['teams', 'matches', 'matches.homeTeam', 'matches.awayTeam', 'matches.statistics']
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.type === 'group_knockout' && tournament.status !== 'completed') {
        const generatedMatches = await TournamentController.generateGroupKnockoutStage(tournament.id);
        if (generatedMatches.length > 0) {
          tournament = await tournamentRepository.findOne({
            where: { id },
            relations: ['teams', 'matches', 'matches.homeTeam', 'matches.awayTeam', 'matches.statistics']
          });

          if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
          }
        }
      }

      // Transform the data to avoid circular references
      const transformedTournament = {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        status: tournament.status,
        type: tournament.type,
        teamCount: tournament.teamCount,
        groupSize: tournament.groupSize,
        teamCountries: tournament.teamCountries,
        startTime: tournament.startTime,
        currentRound: tournament.currentRound,
        winner: tournament.winner,
        createdAt: tournament.createdAt,
        teams: tournament.teams?.map(team => ({
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          logo: team.logo,
          country: team.country,
          founded: team.founded,
          groupName: team.groupName,
          stats: team.stats,
          points: team.points,
          wins: team.wins,
          draws: team.draws,
          losses: team.losses,
          goalsFor: team.goalsFor,
          goalsAgainst: team.goalsAgainst
        })) || [],
        matches: tournament.matches
          ?.sort((a: any, b: any) => a.round - b.round)
          .map(match => ({
            id: match.id,
            round: match.round,
            groupName: match.groupName,
            stage: match.stage,
            scheduledAt: match.scheduledAt,
            status: match.status,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homePenaltyScore: match.homePenaltyScore,
            awayPenaltyScore: match.awayPenaltyScore,
            commentary: match.commentary,
            resultMode: match.resultMode,
            manualDetails: match.manualDetails,
            events: match.events,
            homeTeam: match.homeTeam ? {
              id: match.homeTeam.id,
              name: match.homeTeam.name,
              shortName: match.homeTeam.shortName,
              logo: match.homeTeam.logo,
              country: match.homeTeam.country,
              groupName: match.homeTeam.groupName,
              stats: match.homeTeam.stats
            } : null,
            awayTeam: match.awayTeam ? {
              id: match.awayTeam.id,
              name: match.awayTeam.name,
              shortName: match.awayTeam.shortName,
              logo: match.awayTeam.logo,
              country: match.awayTeam.country,
              groupName: match.awayTeam.groupName,
              stats: match.awayTeam.stats
            } : null,
            statistics: match.statistics
          })) || []
      };

      res.json(transformedTournament);
    } catch (error) {
      console.error('Get tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createTournament(req: Request, res: Response) {
    try {
      const { name, description, type, teamCount, groupSize, teamCountries, selectedTeams, startTime } = req.body;
      const userId = (req as any).user.id;
      const normalizedTeamCount = Number(teamCount);
      const normalizedGroupSize = type === 'group_knockout' ? Number(groupSize) : undefined;
      const normalizedStartTime = startTime ? new Date(startTime) : undefined;
      const normalizedTeamCountries = Array.isArray(teamCountries)
        ? teamCountries.map((country: unknown) => String(country).trim()).filter(Boolean)
        : undefined;

      if (!name || !description || !type || !teamCount || !startTime) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (!normalizedStartTime || Number.isNaN(normalizedStartTime.getTime())) {
        return res.status(400).json({ error: 'Invalid tournament start time' });
      }

      if (!['league', 'knockout', 'group_knockout'].includes(type)) {
        return res.status(400).json({ error: 'Invalid tournament type' });
      }

      if (![8, 16, 32, 64, 128].includes(normalizedTeamCount)) {
        return res.status(400).json({ error: 'Team count must be 8, 16, 32, 64, or 128' });
      }

      if ((type === 'knockout' || type === 'group_knockout') && !TournamentController.isPowerOfTwo(normalizedTeamCount)) {
        return res.status(400).json({ error: 'Knockout tournaments require a power-of-two team count' });
      }

      if (type === 'group_knockout') {
        if (!normalizedGroupSize || normalizedGroupSize < 2) {
          return res.status(400).json({ error: 'Group size must be at least 2' });
        }

        if (!TournamentController.isPowerOfTwo(normalizedGroupSize)) {
          return res.status(400).json({ error: 'Group size must be a power of two' });
        }

        if (normalizedTeamCount % normalizedGroupSize !== 0) {
          return res.status(400).json({ error: 'Team count must be divisible by group size' });
        }
      }

      const tournamentRepository = AppDataSource.getRepository(Tournament);
      const teamRepository = AppDataSource.getRepository(Team);

      const tournament = tournamentRepository.create({
        name,
        description,
        type,
        teamCount: normalizedTeamCount,
        groupSize: normalizedGroupSize,
        teamCountries: normalizedTeamCountries && normalizedTeamCountries.length > 0 ? normalizedTeamCountries : undefined,
        startTime: normalizedStartTime,
        user: { id: userId }
      });

      const savedTournament = await tournamentRepository.save(tournament);

      const hasSelectedTeams = Array.isArray(selectedTeams) && selectedTeams.length > 0;
      if (hasSelectedTeams && selectedTeams.length !== normalizedTeamCount) {
        return res.status(400).json({ error: `Please select exactly ${normalizedTeamCount} teams` });
      }

      if (hasSelectedTeams) {
        const selectedTeamKeys = selectedTeams.map((team: any) => getTeamIdentityKey(team));
        if (new Set(selectedTeamKeys).size !== selectedTeamKeys.length) {
          return res.status(400).json({ error: 'Selected teams contain duplicates' });
        }
      }

      // Use selected teams from UI, or fetch real teams from Football API.
      console.log(`Preparing ${teamCount} teams...`);
      const apiTeams = hasSelectedTeams
        ? selectedTeams.map((team: any, index: number) => ({
            team: {
              id: team.id || `selected-${index}`,
              name: team.name,
              code: team.shortName || team.code || String(team.name || '').substring(0, 3).toUpperCase(),
              country: team.country,
              founded: team.founded,
              logo: team.logo,
              strength: team.strength || 82
            },
            players: []
          }))
        : await FootballAPIService.getPopularTeams(normalizedTeamCount, normalizedTeamCountries);

      if (apiTeams.length < normalizedTeamCount) {
        return res.status(400).json({
          error: `Only ${apiTeams.length} real teams are available for this country selection. Please select fewer teams or add more countries.`
        });
      }

      const teams: Team[] = [];
      let teamsFromApi = 0;
      let teamsFallback = 0;

      for (let i = 0; i < normalizedTeamCount; i++) {
        let teamName: string;
        let shortName: string;
        let teamStats: any;
        let logo: string | null = null;
        let country: string | undefined = undefined;
        let founded: number | undefined = undefined;
        let apiTeam: any = null;

        if (apiTeams[i] && apiTeams[i].team) {
          // Use real API data
          apiTeam = apiTeams[i];
          teamName = apiTeam.team.name;
          shortName = apiTeam.team.code || apiTeam.team.name.substring(0, 3).toUpperCase();
          logo = apiTeam.team.logo || null;
          country = apiTeam.team.country || undefined;
          founded = apiTeam.team.founded || undefined;

          teamStats = TournamentController.createStatsFromStrength(apiTeam.team.strength || 82);

          teamsFromApi++;
        } else {
          const fallbackName = `Global Team ${i + 1}`;
          teamName = fallbackName;
          shortName = `GT${i + 1}`;
          teamStats = TournamentController.createStatsFromStrength(Math.max(68, 82 - Math.floor(i / 4)));
          teamsFallback++;
        }

        const team = teamRepository.create({
          name: teamName,
          shortName: shortName,
          stats: teamStats,
          logo: logo || undefined,
          tournament: savedTournament
        });
        if (country) {
          team.country = country;
        }
        if (founded) {
          team.founded = founded;
        }
        teams.push(team);
      }

      if (type === 'group_knockout' && normalizedGroupSize) {
        TournamentController.assignBalancedGroups(teams, normalizedGroupSize);
      }

      console.log(`Teams created: ${teamsFromApi} from API, ${teamsFallback} fallback`);

      const savedTeams = await teamRepository.save(teams);
      savedTournament.teams = savedTeams;

      // Generate initial matches based on tournament type
      const matches = await TournamentController.generateMatches(savedTournament, savedTeams);
      savedTournament.matches = matches;

      // Transform the data to avoid circular references
      const transformedTournament = {
        id: savedTournament.id,
        name: savedTournament.name,
        description: savedTournament.description,
        status: savedTournament.status,
        type: savedTournament.type,
        teamCount: savedTournament.teamCount,
        groupSize: savedTournament.groupSize,
        teamCountries: savedTournament.teamCountries,
        startTime: savedTournament.startTime,
        currentRound: savedTournament.currentRound,
        winner: savedTournament.winner,
        createdAt: savedTournament.createdAt,
        teams: savedTournament.teams?.map(team => ({
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          logo: team.logo,
          country: team.country,
          founded: team.founded,
          groupName: team.groupName,
          stats: team.stats
        })) || [],
        matches: savedTournament.matches?.map(match => ({
          id: match.id,
          round: match.round,
          groupName: match.groupName,
          stage: match.stage,
          scheduledAt: match.scheduledAt,
          status: match.status,
          homePenaltyScore: match.homePenaltyScore,
          awayPenaltyScore: match.awayPenaltyScore,
          resultMode: match.resultMode,
          manualDetails: match.manualDetails,
          homeTeam: match.homeTeam ? {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            shortName: match.homeTeam.shortName,
            logo: match.homeTeam.logo,
            country: match.homeTeam.country
          } : null,
          awayTeam: match.awayTeam ? {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            shortName: match.awayTeam.shortName,
            logo: match.awayTeam.logo,
            country: match.awayTeam.country
          } : null
        })) || []
      };

      res.status(201).json(transformedTournament);
    } catch (error) {
      console.error('Create tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, status } = req.body;
      const userId = (req as any).user.id;

      const tournamentRepository = AppDataSource.getRepository(Tournament);
      const tournament = await tournamentRepository.findOne({
        where: { id, user: { id: userId } }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (name) tournament.name = name;
      if (description) tournament.description = description;
      if (status) tournament.status = status;

      const updatedTournament = await tournamentRepository.save(tournament);
      res.json(updatedTournament);
    } catch (error) {
      console.error('Update tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      console.log(`[DELETE] Attempting to delete tournament ${id} for user ${userId}`);

      const tournamentRepository = AppDataSource.getRepository(Tournament);
      const teamRepository = AppDataSource.getRepository(Team);
      const matchRepository = AppDataSource.getRepository(Match);
      const matchStatsRepository = AppDataSource.getRepository(MatchStatistics);

      // Find tournament with all relations
      const tournament = await tournamentRepository.findOne({
        where: { id, user: { id: userId } },
        relations: ['teams', 'matches', 'matches.statistics']
      });

      if (!tournament) {
        console.log(`[DELETE] Tournament ${id} not found or access denied`);
        return res.status(404).json({ error: 'Tournament not found' });
      }

      console.log(`[DELETE] Found tournament: ${tournament.name}`);
      console.log(`[DELETE] Teams: ${tournament.teams?.length || 0}`);
      console.log(`[DELETE] Matches: ${tournament.matches?.length || 0}`);

      // Manual cascade delete for SQLite (SQLite doesn't handle cascade well)
      if (tournament.matches && tournament.matches.length > 0) {
        console.log('[DELETE] Deleting match statistics...');
        // Delete all match statistics first
        for (const match of tournament.matches) {
          if (match.statistics) {
            await matchStatsRepository.remove(match.statistics);
            console.log(`[DELETE] Deleted statistics for match ${match.id}`);
          }
        }
        console.log('[DELETE] Deleting matches...');
        // Delete all matches
        await matchRepository.remove(tournament.matches);
        console.log('[DELETE] Matches deleted');
      }

      // Delete all teams
      if (tournament.teams && tournament.teams.length > 0) {
        console.log('[DELETE] Deleting teams...');
        await teamRepository.remove(tournament.teams);
        console.log('[DELETE] Teams deleted');
      }

      // Finally delete the tournament
      console.log('[DELETE] Deleting tournament...');
      await tournamentRepository.remove(tournament);
      console.log('[DELETE] Tournament deleted successfully');

      res.json({ message: 'Tournament deleted successfully' });
    } catch (error) {
      console.error('[DELETE] Error deleting tournament:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async startTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const tournamentRepository = AppDataSource.getRepository(Tournament);
      const tournament = await tournamentRepository.findOne({
        where: { id, user: { id: userId } },
        relations: ['teams']
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: 'Tournament already started or completed' });
      }

      tournament.status = 'active';
      tournament.currentRound = 1;

      const updatedTournament = await tournamentRepository.save(tournament);
      res.json(updatedTournament);
    } catch (error) {
      console.error('Start tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private static async generateMatches(tournament: Tournament, teams: Team[]): Promise<Match[]> {
    const matchRepository = AppDataSource.getRepository(Match);
    const matches: Match[] = [];

    switch (tournament.type) {
      case 'knockout':
        // For knockout, only generate first round matches
        matches.push(...TournamentController.generateKnockoutFirstRound(teams, tournament));
        break;
      case 'league':
        matches.push(...TournamentController.generateLeagueMatches(teams, tournament));
        break;
      case 'group_knockout':
        matches.push(...TournamentController.generateGroupKnockoutMatches(teams, tournament));
        break;
    }

    TournamentController.assignMatchSchedule(matches, tournament.startTime);
    return matchRepository.save(matches);
  }

  private static isPowerOfTwo(value: number): boolean {
    return value > 0 && (value & (value - 1)) === 0;
  }

  private static createStatsFromStrength(strength: number) {
    const clamp = (value: number) => Math.min(99, Math.max(60, value));
    const variance = () => Math.floor(Math.random() * 7) - 3;
    const overall = clamp(Math.round(strength));

    return {
      attack: clamp(overall + variance()),
      defense: clamp(overall + variance()),
      midfield: clamp(overall + variance()),
      overall
    };
  }

  private static assignBalancedGroups(teams: Team[], groupSize: number) {
    const groupCount = Math.ceil(teams.length / groupSize);
    const groups: Team[][] = Array.from({ length: groupCount }, () => []);
    const seededTeams = [...teams].sort((a, b) => (b.stats?.overall || 0) - (a.stats?.overall || 0));
    const pots: Team[][] = [];

    for (let index = 0; index < seededTeams.length; index += groupCount) {
      pots.push(seededTeams.slice(index, index + groupCount));
    }

    const normalizeCountry = (country?: string) => String(country || '').trim().toLowerCase();

    pots.forEach((pot, potIndex) => {
      const groupOrder = Array.from({ length: groupCount }, (_, index) => index);
      if (potIndex % 2 === 1) groupOrder.reverse();

      pot.forEach((team, teamIndex) => {
        const preferredGroup = groupOrder[teamIndex % groupOrder.length];
        const country = normalizeCountry(team.country);
        const candidateGroups = groupOrder
          .filter(groupIndex => groups[groupIndex].length < groupSize)
          .sort((a, b) => {
            const aCountryCount = country ? groups[a].filter(groupTeam => normalizeCountry(groupTeam.country) === country).length : 0;
            const bCountryCount = country ? groups[b].filter(groupTeam => normalizeCountry(groupTeam.country) === country).length : 0;
            return aCountryCount - bCountryCount
              || groups[a].length - groups[b].length
              || Math.abs(a - preferredGroup) - Math.abs(b - preferredGroup)
              || a - b;
          });
        const targetGroup = candidateGroups[0] ?? preferredGroup;
        groups[targetGroup].push(team);
      });
    });

    groups.forEach((groupTeams, groupIndex) => {
      const groupName = TournamentController.getGroupName(groupIndex);
      groupTeams.forEach(team => { team.groupName = groupName; });
    });
  }

  private static createMatch(tournament: Tournament, homeTeam: Team, awayTeam: Team, round: number, groupName?: string, stage?: Match['stage']): Match {
    const match = new Match();
    match.round = round;
    match.groupName = groupName;
    match.stage = stage;
    match.homeTeam = homeTeam;
    match.awayTeam = awayTeam;
    match.status = 'scheduled';
    match.tournament = tournament;
    return match;
  }

  // Generate only the first round of knockout matches
  private static generateKnockoutFirstRound(teams: Team[], tournament: Tournament): Match[] {
    const matches: Match[] = [];
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        matches.push(TournamentController.createMatch(tournament, shuffledTeams[i], shuffledTeams[i + 1], 1));
      }
    }

    return matches;
  }

  // Generate subsequent knockout round matches based on previous round results
  private static getKnockoutResult(match: Match) {
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const homePenaltyScore = match.homePenaltyScore ?? 0;
    const awayPenaltyScore = match.awayPenaltyScore ?? 0;
    const homeWins = homeScore > awayScore || (homeScore === awayScore && homePenaltyScore > awayPenaltyScore);

    return {
      winner: homeWins ? match.homeTeam : match.awayTeam,
      loser: homeWins ? match.awayTeam : match.homeTeam
    };
  }

  static async generateKnockoutNextRound(tournamentId: string, currentRound: number): Promise<Match[]> {
    const matchRepository = AppDataSource.getRepository(Match);
    const tournamentRepository = AppDataSource.getRepository(Tournament);

    const tournament = await tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: ['teams', 'matches', 'matches.homeTeam', 'matches.awayTeam']
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const existingNextRoundMatches = await matchRepository.count({
      where: {
        tournament: { id: tournamentId },
        round: currentRound + 1
      }
    });

    if (existingNextRoundMatches > 0) {
      return [];
    }

    const currentRoundMatches = await matchRepository.find({
      where: {
        tournament: { id: tournamentId },
        round: currentRound
      },
      relations: ['homeTeam', 'awayTeam']
    });

    if (currentRoundMatches.length === 0 || currentRoundMatches.some(match => match.status !== 'completed')) {
      return [];
    }

    const advancingMatches = currentRoundMatches.filter(match => match.stage !== 'third_place');
    if (advancingMatches.length === 0) {
      return [];
    }

    const winners: Team[] = [];
    const losers: Team[] = [];
    advancingMatches
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach(match => {
      const result = TournamentController.getKnockoutResult(match);
      winners.push(result.winner);
      losers.push(result.loser);
    });

    // If we have winners and there's more than 1 winner, generate next round
    if (winners.length > 1) {
      const nextRound = currentRound + 1;
      const nextRoundMatches: Match[] = [];

      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          console.log(`[GENERATE] Creating match ${i/2 + 1}: ${winners[i].name} vs ${winners[i + 1].name}`);
          nextRoundMatches.push(TournamentController.createMatch(tournament, winners[i], winners[i + 1], nextRound));
        }
      }

      if (winners.length === 2 && losers.length === 2) {
        console.log(`[GENERATE] Creating third-place match: ${losers[0].name} vs ${losers[1].name}`);
        nextRoundMatches.push(TournamentController.createMatch(tournament, losers[0], losers[1], nextRound, undefined, 'third_place'));
      }

      TournamentController.assignMatchSchedule(
        nextRoundMatches,
        TournamentController.getNextRoundStartTime(tournament.matches || [], nextRound, tournament.startTime)
      );

      console.log(`[GENERATE] Prepared ${nextRoundMatches.length} matches, saving to database...`);
      // Save the new matches
      const savedMatches = await matchRepository.save(nextRoundMatches);

      // Update tournament current round without resaving loaded relations.
      await tournamentRepository.update(tournament.id, { currentRound: nextRound });

      return savedMatches;
    }

    // If we have a single winner, tournament is complete
    if (winners.length === 1) {
      await tournamentRepository.update(tournament.id, {
        status: 'completed',
        winner: winners[0].name
      });
    }

    return [];
  }

  static async generateGroupKnockoutStage(tournamentId: string): Promise<Match[]> {
    const matchRepository = AppDataSource.getRepository(Match);
    const tournamentRepository = AppDataSource.getRepository(Tournament);

    const tournament = await tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: ['teams', 'matches', 'matches.homeTeam', 'matches.awayTeam']
    });

    if (!tournament || tournament.type !== 'group_knockout') {
      return [];
    }

    const groupMatches = (tournament.matches || []).filter(match => !!match.groupName);
    if (groupMatches.length === 0 || groupMatches.some(match => match.status !== 'completed')) {
      return [];
    }

    const existingKnockoutMatches = await matchRepository.count({
      where: {
        tournament: { id: tournamentId },
        groupName: IsNull()
      }
    });

    if (existingKnockoutMatches > 0) {
      return [];
    }

    const standingsByGroup = TournamentController.calculateGroupStandings(tournament.teams || [], groupMatches);
    const groupNames = Object.keys(standingsByGroup).sort((a, b) => TournamentController.compareGroupNames(a, b));
    const groupWinners: Team[] = [];
    const groupRunnersUp: Team[] = [];

    for (const groupName of groupNames) {
      const standings = standingsByGroup[groupName];
      if (standings.length < 2) {
        return [];
      }

      groupWinners.push(standings[0].team);
      groupRunnersUp.push(standings[1].team);
    }

    const knockoutRound = Math.max(...groupMatches.map(match => match.round)) + 1;
    const knockoutMatches: Match[] = [];

    for (let index = 0; index < groupWinners.length; index++) {
      const homeTeam = groupWinners[index];
      const awayTeam = groupRunnersUp[(index + 1) % groupRunnersUp.length];
      knockoutMatches.push(TournamentController.createMatch(tournament, homeTeam, awayTeam, knockoutRound));
    }

    TournamentController.assignMatchSchedule(
      knockoutMatches,
      TournamentController.getNextRoundStartTime(groupMatches, knockoutRound, tournament.startTime)
    );

    const savedMatches = await matchRepository.save(knockoutMatches);
    if (tournament.status === 'draft') {
      tournament.status = 'active';
    }
    await tournamentRepository.update(tournament.id, {
      currentRound: knockoutRound,
      status: 'active'
    });

    return savedMatches;
  }

  private static calculateGroupStandings(teams: Team[], matches: Match[]) {
    const standingsByGroup: Record<string, Array<{
      team: Team;
      played: number;
      points: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }>> = {};

    for (const team of teams) {
      const groupName = team.groupName || '未分组';
      standingsByGroup[groupName] = standingsByGroup[groupName] || [];
      standingsByGroup[groupName].push({
        team,
        played: 0,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      });
    }

    const getStanding = (team: Team) => {
      const groupName = team.groupName || '未分组';
      return standingsByGroup[groupName].find(standing => standing.team.id === team.id);
    };

    for (const match of matches) {
      if (match.status !== 'completed' || !match.homeTeam || !match.awayTeam) {
        continue;
      }

      const homeStanding = getStanding(match.homeTeam);
      const awayStanding = getStanding(match.awayTeam);
      if (!homeStanding || !awayStanding) {
        continue;
      }

      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      homeStanding.played += 1;
      awayStanding.played += 1;
      homeStanding.goalsFor += homeScore;
      homeStanding.goalsAgainst += awayScore;
      awayStanding.goalsFor += awayScore;
      awayStanding.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        homeStanding.wins += 1;
        homeStanding.points += 3;
        awayStanding.losses += 1;
      } else if (awayScore > homeScore) {
        awayStanding.wins += 1;
        awayStanding.points += 3;
        homeStanding.losses += 1;
      } else {
        homeStanding.draws += 1;
        awayStanding.draws += 1;
        homeStanding.points += 1;
        awayStanding.points += 1;
      }
    }

    for (const standings of Object.values(standingsByGroup)) {
      standings.forEach(standing => {
        standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
      });

      standings.sort((a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        b.wins - a.wins ||
        a.team.name.localeCompare(b.team.name)
      );
    }

    return standingsByGroup;
  }

  private static compareGroupNames(a: string, b: string): number {
    return TournamentController.getGroupOrder(a) - TournamentController.getGroupOrder(b) || a.localeCompare(b);
  }

  private static getGroupOrder(groupName: string): number {
    const letterMatch = groupName.match(/^([A-Z])组$/);
    if (letterMatch) {
      return letterMatch[1].charCodeAt(0) - 65;
    }

    const numericMatch = groupName.match(/^第(\d+)组$/);
    if (numericMatch) {
      return Number(numericMatch[1]) - 1;
    }

    return Number.MAX_SAFE_INTEGER;
  }

  private static generateLeagueMatches(teams: Team[], tournament: Tournament): Match[] {
    const matches: Match[] = [];
    const firstLeg = TournamentController.generateSingleRoundRobinMatches(teams, tournament, 1);
    matches.push(...firstLeg.matches);

    const secondLeg = TournamentController.generateSingleRoundRobinMatches(teams, tournament, firstLeg.rounds + 1, true);
    matches.push(...secondLeg.matches);

    return matches;
  }

  private static generateGroupKnockoutMatches(teams: Team[], tournament: Tournament): Match[] {
    const matches: Match[] = [];
    const groupSize = tournament.groupSize || 4;
    const groupCount = teams.length / groupSize;

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
      const groupName = TournamentController.getGroupName(groupIndex);
      const groupTeams = teams.slice(groupIndex * groupSize, (groupIndex + 1) * groupSize);
      const groupSchedule = TournamentController.generateSingleRoundRobinMatches(groupTeams, tournament, 1, false, groupName);
      matches.push(...groupSchedule.matches);
    }

    return matches;
  }

  private static getGroupName(groupIndex: number): string {
    if (groupIndex < 26) {
      return `${String.fromCharCode(65 + groupIndex)}组`;
    }

    return `第${groupIndex + 1}组`;
  }

  private static generateSingleRoundRobinMatches(
    teams: Team[],
    tournament: Tournament,
    startingRound: number,
    reverseHomeAway = false,
    groupName?: string
  ): { matches: Match[]; rounds: number } {
    const matches: Match[] = [];

    if (teams.length < 2) {
      return { matches, rounds: 0 };
    }

    const rotation: Array<Team | null> = [...teams];
    const hasBye = rotation.length % 2 !== 0;

    if (hasBye) {
      rotation.push(null);
    }

    const teamSlots = rotation.length;
    const rounds = teamSlots - 1;
    const matchesPerRound = teamSlots / 2;

    for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
      const round = startingRound + roundIndex;

      for (let pairIndex = 0; pairIndex < matchesPerRound; pairIndex++) {
        const firstTeam = rotation[pairIndex];
        const secondTeam = rotation[teamSlots - 1 - pairIndex];

        if (!firstTeam || !secondTeam) {
          continue;
        }

        const shouldSwap = reverseHomeAway || (roundIndex + pairIndex) % 2 === 1;
        const homeTeam = shouldSwap ? secondTeam : firstTeam;
        const awayTeam = shouldSwap ? firstTeam : secondTeam;
        matches.push(TournamentController.createMatch(tournament, homeTeam, awayTeam, round, groupName));
      }

      const fixedTeam = rotation[0];
      const movingTeams = rotation.slice(1);
      movingTeams.unshift(movingTeams.pop() as Team | null);
      rotation.splice(0, rotation.length, fixedTeam, ...movingTeams);
    }

    return { matches, rounds };
  }
}
