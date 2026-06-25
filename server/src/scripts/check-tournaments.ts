import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Tournament } from '../models/Tournament';
import { User } from '../models/User';

const checkTournaments = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const userRepository = AppDataSource.getRepository(User);
    const tournamentRepository = AppDataSource.getRepository(Tournament);

    // Get all users
    const users = await userRepository.find();
    console.log(`👥 Total users: ${users.length}\n`);

    for (const user of users) {
      console.log(`User: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`ID: ${user.id}`);
      console.log('---');

      const tournaments = await tournamentRepository.find({
        where: { user: { id: user.id } },
        relations: ['teams', 'matches']
      });

      console.log(`Tournaments: ${tournaments.length}`);
      tournaments.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.name}`);
        console.log(`     ID: ${t.id}`);
        console.log(`     Status: ${t.status}`);
        console.log(`     Teams: ${t.teams?.length || 0}`);
        console.log(`     Matches: ${t.matches?.length || 0}`);
      });
      console.log('');
    }

    // Show orphaned tournaments (if any)
    const allTournaments = await tournamentRepository.find({
      relations: ['user', 'teams', 'matches']
    });

    console.log('📊 Summary:');
    console.log(`Total tournaments in database: ${allTournaments.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  checkTournaments();
}
