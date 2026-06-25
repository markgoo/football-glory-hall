import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

const testLoginAPI = async () => {
  try {
    console.log('Testing login functionality...\n');

    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const userRepository = AppDataSource.getRepository(User);

    // Get markgoo user
    const user = await userRepository.findOne({
      where: { username: 'markgoo' }
    });

    if (!user) {
      console.log('❌ User markgoo not found');

      // Create test user
      const hashedPassword = await bcrypt.hash('test123456', 12);
      const newUser = userRepository.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword
      });

      const savedUser = await userRepository.save(newUser);
      console.log('✅ Created test user:');
      console.log('  Username:', savedUser.username);
      console.log('  Email:', savedUser.email);
      console.log('  Password: test123456');
      console.log('  testing...');

      // Verify password
      const isValid = await bcrypt.compare('test123456', savedUser.password);
      console.log('  Password validation:', isValid);

    } else {
      console.log('✅ Found user markgoo:');
      console.log('  Email:', user.email);
      console.log('  Password hash length:', user.password.length);

      // Test the password
      const isValid = await bcrypt.compare('123456', user.password);
      console.log('  Password "123456" validation:', isValid);

      // Try other common passwords
      if (!isValid) {
        const testPasswords = ['password', 'admin', 'password123', user.username];
        for (const pwd of testPasswords) {
          const isMatch = await bcrypt.compare(pwd, user.password);
          if (isMatch) {
            console.log(`  ✅ Found correct password: "${pwd}"`);
            break;
          }
        }
      }
    }

    // Count all users
    const count = await userRepository.count();
    console.log(`  Total users in DB: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  testLoginAPI();
}
