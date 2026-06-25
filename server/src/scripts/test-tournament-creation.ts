import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Tournament } from '../models/Tournament';
import { Team } from '../models/Team';
import FootballAPIService from '../services/footballAPIService';

const testTournamentCreation = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const tournamentRepository = AppDataSource.getRepository(Tournament);
    const teamRepository = AppDataSource.getRepository(Team);

    // Create a test tournament
    const tournament = tournamentRepository.create({
      name: 'Test Tournament',
      description: 'Testing real player data',
      type: 'knockout',
      teamCount: 8,
      status: 'draft',
      currentRound: 0
    });

    const savedTournament = await tournamentRepository.save(tournament);
    console.log('✅ Tournament created:', savedTournament.id);

    // Get 8 real teams
    console.log('\n📥 Fetching teams from API...');
    const apiTeams = await FootballAPIService.getPopularTeams(8);
    console.log(`✅ Fetched ${apiTeams.length} teams\n`);

    // Create teams and fetch their squads
    const teams: Team[] = [];
    for (let i = 0; i < apiTeams.length; i++) {
      const apiTeam = apiTeams[i];
      console.log(`\n${i + 1}. Processing ${apiTeam.team.name}...`);

      // Fetch squad
      const squad = await FootballAPIService.getTeamSquad(apiTeam.team.id);
      console.log(`   Squad players: ${squad?.players.length || 0}`);

      if (squad && squad.players.length > 0) {
        // Show first few players
        console.log('   Sample players:', squad.players.slice(0, 3).map(p => p.name).join(', '));
      }

      // Calculate team strength
      const teamStats = FootballAPIService.calculateTeamStrength(squad?.players || []);
      console.log(`   Team stats - Attack: ${teamStats.attack}, Defense: ${teamStats.defense}, Midfield: ${teamStats.midfield}, Overall: ${teamStats.overall}`);

      const team = teamRepository.create({
        name: apiTeam.team.name,
        shortName: apiTeam.team.code || apiTeam.team.name.substring(0, 3).toUpperCase(),
        logo: apiTeam.team.logo,
        country: apiTeam.team.country,
        founded: apiTeam.team.founded,
        stats: teamStats,
        tournament: savedTournament
      });

      teams.push(team);
    }

    const savedTeams = await teamRepository.save(teams);
    console.log(`\n✅ Created ${savedTeams.length} teams with real players!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testTournamentCreation();
