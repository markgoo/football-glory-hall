import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';
import { MatchStatistics } from '../models/MatchStatistics';
import { HistoricalRecord } from '../models/HistoricalRecord';
import { LLMSetting } from '../models/LLMSetting';
import { LLMPromptTemplate } from '../models/LLMPromptTemplate';
import { AIMatchSession } from '../models/AIMatchSession';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite'),
  synchronize: isDevelopment,
  logging: isDevelopment,
  entities: [User, Team, Tournament, Match, MatchStatistics, HistoricalRecord, LLMSetting, LLMPromptTemplate, AIMatchSession],
  migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
  subscribers: [path.join(__dirname, '../subscribers/**/*{.ts,.js}')],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');
    await ensureDefaultAdmin();
    await ensureDefaultLLMPrompts();
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

const ensureDefaultLLMPrompts = async () => {
  const promptRepository = AppDataSource.getRepository(LLMPromptTemplate);
  const defaults: Array<Pick<LLMPromptTemplate, 'key' | 'title' | 'content' | 'isActive'>> = [
    {
      key: 'match_intro',
      title: 'AI 对决开场',
      isActive: true,
      content: '你是足球文字直播解说员。请用中文为这场比赛写一段简短开场，风格像广播解说，基于双方阵型、战术和实力。'
    },
    {
      key: 'match_step',
      title: 'AI 对决推进',
      isActive: true,
      content: '你是足球比赛模拟引擎。请严格返回 JSON，不要 Markdown。根据当前比分、时间、阵型、战术和历史事件，生成下一个时间片的足球比赛文字直播、关键事件和技术统计增量。'
    },
    {
      key: 'match_summary',
      title: 'AI 对决总结',
      isActive: true,
      content: '你是足球赛后评论员。请根据整场事件、比分和技术统计，用中文写一段简短赛后总结。'
    }
  ];

  for (const item of defaults) {
    const existing = await promptRepository.findOne({ where: { key: item.key } });
    if (!existing) {
      await promptRepository.save(promptRepository.create(item));
    }
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
