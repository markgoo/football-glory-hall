import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

const testLogin = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);

    // Get last registered user
    const users = await userRepository.find({
      order: { createdAt: 'DESC' },
      take: 1
    });

    if (users.length === 0) {
      console.log('No users found');
      return;
    }

    const user = users[0];
    console.log('Last registered user:');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Password hash exists:', !!user.password);
    console.log('Hash length:', user.password.length);

    // Test password if you know it (example: testing with 'password123')
    if (user.password) {
      console.log('\nTesting common passwords:');
      const testPasswords = ['password', '123456', '12345678', 'admin', user.username, 'password123'];

      for (const testPass of testPasswords) {
        const isMatch = await bcrypt.compare(testPass, user.password);
        if (isMatch) {
          console.log(`✅ Password match found: "${testPass}"`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  testLogin();
}
