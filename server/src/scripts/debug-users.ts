import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

const debugUsers = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully\n');

    const userRepository = AppDataSource.getRepository(User);

    // Check if users table exists
    try {
      const count = await userRepository.count();
      console.log(`📊 Total users in database: ${count}\n`);

      if (count > 0) {
        const users = await userRepository.find();
        console.log('👥 All users:');
        users.forEach((user, index) => {
          console.log(`  ${index + 1}. ID: ${user.id}`);
          console.log(`     Username: ${user.username}`);
          console.log(`     Email: ${user.email}`);
          console.log(`     Is Active: ${user.isActive}`);
          console.log(`     Created: ${user.createdAt}`);
          console.log('');
        });
      }

    } catch (error) {
      console.log('❌ Error accessing users table:', error.message);
      console.log('⚠️  The users table may not exist or there\'s a schema issue\n');
    }

    // Show database file location
    console.log('💾 Database file:', process.env.DB_PATH || './data/database.sqlite');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  debugUsers();
}
