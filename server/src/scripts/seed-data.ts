import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Tournament } from '../models/Tournament';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { MatchStatistics } from '../models/MatchStatistics';
import { HistoricalRecord } from '../models/HistoricalRecord';
import * as bcrypt from 'bcryptjs';

const seedData = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Create test user
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email: 'test@example.com' } });
    
    let testUser: User;
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('test123', 12);
      testUser = userRepository.create({
        username: 'TestUser',
        email: 'test@example.com',
        password: hashedPassword
      });
      testUser = await userRepository.save(testUser);
      console.log('Test user created');
    } else {
      testUser = existingUser;
      console.log('Test user already exists');
    }

    // Create sample tournaments
    const tournamentRepository = AppDataSource.getRepository(Tournament);
    const teamRepository = AppDataSource.getRepository(Team);
    const matchRepository = AppDataSource.getRepository(Match);
    const historicalRepository = AppDataSource.getRepository(HistoricalRecord);

    // Check if tournaments already exist
    const existingTournaments = await tournamentRepository.find({ where: { user: { id: testUser.id } } });
    if (existingTournaments.length === 0) {
      // Create sample tournament
      const tournament = tournamentRepository.create({
        name: '2024春季冠军杯',
        description: '年度最重要的足球赛事之一',
        type: 'knockout',
        teamCount: 8,
        status: 'completed',
        winner: '皇家马德里',
        user: testUser
      });
      const savedTournament = await tournamentRepository.save(tournament);
      console.log('Sample tournament created');

      // Create teams
      const teams = [
        { name: '皇家马德里', shortName: 'RMA', stats: { attack: 95, defense: 92, midfield: 94, overall: 94 } },
        { name: '巴塞罗那', shortName: 'BAR', stats: { attack: 93, defense: 90, midfield: 95, overall: 93 } },
        { name: '拜仁慕尼黑', shortName: 'BAY', stats: { attack: 94, defense: 93, midfield: 92, overall: 93 } },
        { name: '曼联', shortName: 'MUN', stats: { attack: 88, defense: 85, midfield: 87, overall: 87 } },
        { name: '利物浦', shortName: 'LIV', stats: { attack: 89, defense: 86, midfield: 88, overall: 88 } },
        { name: '切尔西', shortName: 'CHE', stats: { attack: 87, defense: 89, midfield: 86, overall: 87 } },
        { name: '曼城', shortName: 'MCI', stats: { attack: 91, defense: 89, midfield: 92, overall: 91 } },
        { name: '尤文图斯', shortName: 'JUV', stats: { attack: 85, defense: 88, midfield: 85, overall: 86 } }
      ];

      const savedTeams = [];
      for (const teamData of teams) {
        const team = teamRepository.create({
          ...teamData,
          points: Math.floor(Math.random() * 15),
          wins: Math.floor(Math.random() * 5),
          draws: Math.floor(Math.random() * 3),
          losses: Math.floor(Math.random() * 2),
          goalsFor: Math.floor(Math.random() * 20) + 10,
          goalsAgainst: Math.floor(Math.random() * 15) + 5,
          tournament: savedTournament
        });
        savedTeams.push(await teamRepository.save(team));
      }
      console.log('Sample teams created');

      // Create sample matches
      for (let i = 0; i < 4; i++) {
        const match = matchRepository.create({
          round: 1,
          status: 'completed',
          homeTeam: savedTeams[i * 2],
          awayTeam: savedTeams[i * 2 + 1],
          homeScore: Math.floor(Math.random() * 4),
          awayScore: Math.floor(Math.random() * 4),
          commentary: `第${i+1}场比赛精彩回顾...\n双方球员表现出色...\n最终${savedTeams[i*2].name}取得胜利！`,
          events: [
            {
              minute: 15,
              type: 'goal',
              team: savedTeams[i*2].name,
              player: '张三',
              description: `${savedTeams[i*2].name} 率先破门！`
            },
            {
              minute: 67,
              type: 'goal',
              team: savedTeams[i*2+1].name,
              player: '李四',
              description: `${savedTeams[i*2+1].name} 扳平比分！`
            }
          ],
          tournament: savedTournament
        });
        await matchRepository.save(match);
      }

      // Create historical record
      const historicalRecord = historicalRepository.create({
        tournamentName: savedTournament.name,
        year: 2024,
        winner: '皇家马德里',
        runnerUp: '巴塞罗那',
        topTeams: ['皇家马德里', '巴塞罗那', '拜仁慕尼黑', '曼联'],
        achievementType: 'tournament_winner',
        description: '2024春季冠军杯精彩纷呈，皇家马德里最终夺冠！',
        statistics: {
          totalMatches: 7,
          completedMatches: 7,
          totalGoals: 18,
          averageGoals: 2.57,
          participation: 8
        },
        user: testUser
      });
      await historicalRepository.save(historicalRecord);
      console.log('Sample historical record created');
    }

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  seedData();
}

export default seedData;