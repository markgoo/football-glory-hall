import 'reflect-metadata';
import { AppDataSource } from '../config/database';

const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database initialized successfully');
    
    // Run migrations if any
    await AppDataSource.runMigrations();
    console.log('Migrations completed');
    
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  initializeDatabase();
}