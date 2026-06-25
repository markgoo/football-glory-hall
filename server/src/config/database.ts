import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';
import { MatchStatistics } from '../models/MatchStatistics';
import { HistoricalRecord } from '../models/HistoricalRecord';
import * as path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite'),
  synchronize: isDevelopment,
  logging: isDevelopment,
  entities: [User, Team, Tournament, Match, MatchStatistics, HistoricalRecord],
  migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
  subscribers: [path.join(__dirname, '../subscribers/**/*{.ts,.js}')],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};