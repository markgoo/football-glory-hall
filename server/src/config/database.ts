import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';
import { MatchStatistics } from '../models/MatchStatistics';
import { HistoricalRecord } from '../models/HistoricalRecord';
import * as path from 'path';
import bcrypt from 'bcryptjs';

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
    await ensureDefaultAdmin();
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

const ensureDefaultAdmin = async () => {
  const userRepository = AppDataSource.getRepository(User);
  const existingAdmin = await userRepository.findOne({ where: { username: 'admin' } });

  if (existingAdmin) return;

  const admin = userRepository.create({
    username: 'admin',
    email: 'admin@example.com',
    password: await bcrypt.hash('123456', 12),
    role: 'admin',
    isActive: true,
    isDeleted: false
  });

  await userRepository.save(admin);
  console.log('Default admin created: admin / 123456');
};
