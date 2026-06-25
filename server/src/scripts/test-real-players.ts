// Simple version for quick testing
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Tournament } from '../models/Tournament';
import { Team } from '../models/Team';
import FootballAPIService from '../services/footballAPIService';

const testRealPlayers = async () => {
  console.log('=== Testing Real Player Data ===\n');

  await AppDataSource.initialize();

  // Test API directly
  console.log('1. Testing squad API...');
  const squad = await FootballAPIService.getTeamSquad(33); // Manchester United
  console.log(`✅ Fetched ${squad?.players.length || 0} players`);

  if (squad && squad.players.length > 0) {
    console.log('\nSample players:');
    squad.players.slice(0, 5).forEach(p => {
      console.log(`   - ${p.name} (${p.position})`);
    });
  }

  // Test team creation
  console.log('\n2. Testing team creation...');
  const tournament = new Tournament();
  tournament.name = 'Test';
  tournament.description = 'Test';
  tournament.type = 'knockout';
  tournament.teamCount = 8;

  const apiTeams = await FootballAPIService.getPopularTeams(3);
  console.log(`✅ Got ${apiTeams.length} teams from API\n`);

  if (apiTeams.length > 0) {
    const firstTeam = apiTeams[0];
    console.log(`Team: ${firstTeam.team.name}`);

    const squad = await FootballAPIService.getTeamSquad(firstTeam.team.id);
    console.log(`Players: ${squad?.players.length || 0}`);

    const teamStats = FootballAPIService.calculateTeamStrength(squad?.players || []);
    console.log(`Stats - Attack: ${teamStats.attack}, Defense: ${teamStats.defense}, Overall: ${teamStats.overall}`);
  }

  console.log('\n=== All tests passed! ===');
  process.exit(0);
};

testRealPlayers().catch(console.error);
