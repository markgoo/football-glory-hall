import 'reflect-metadata';
import FootballAPIService from '../services/footballAPIService';
import { config } from 'dotenv';

config();

const testSquadAPI = async () => {
  console.log('Testing /players/squads endpoint...\n');

  // Test with a known team ID (Manchester United = 33)
  const teamId = 33;

  try {
    console.log(`Fetching squad for team ${teamId}...`);
    const squad = await FootballAPIService.getTeamSquad(teamId);

    if (squad) {
      console.log('✅ Successfully fetched squad:');
      console.log(`Team: ${squad.team.name}`);
      console.log(`Players: ${squad.players.length}`);

      if (squad.players.length > 0) {
        console.log('\nFirst 5 players:');
        squad.players.slice(0, 5).forEach((player: any) => {
          console.log(`- ${player.name} (${player.position}) - Age: ${player.age}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch squad - returned null');
    }
  } catch (error: any) {
    console.log('❌ Error details:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
    console.log('Full error:', JSON.stringify(error.response?.data, null, 2));
  }

  process.exit(0);
};

testSquadAPI();
