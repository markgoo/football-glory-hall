@echo off
cd C:\MyFootballGloryHall\football-glory-hall\server
echo Checking tournament data...
echo.

npx tsx -e "
import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Tournament } from './src/models/Tournament';

async function check() {
  await AppDataSource.initialize();

  const tournamentRepo = AppDataSource.getRepository(Tournament);
  const tournaments = await tournamentRepo.find({
    relations: ['matches', 'matches.homeTeam', 'matches.awayTeam'],
    order: { createdAt: 'DESC' },
    take: 1
  });

  const t = tournaments[0];
  console.log('Tournament:', t.name);
  console.log('Type:', t.type);
  console.log('Status:', t.status);
  console.log('Current Round:', t.currentRound);
  console.log('Total Matches:', t.matches.length);

  const matchesByRound = {};
  t.matches.forEach(m => {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  });

  Object.keys(matchesByRound).sort().forEach(round => {
    const matches = matchesByRound[round];
    console.log(\`\nRound \${round} (\${matches.length} matches):\`);
    matches.forEach(m => {
      console.log(\`  \${m.homeTeam.name} \${m.homeScore ?? '-'}:\${m.awayScore ?? '-'} \${m.awayTeam.name} [\${m.status}]\`);
    });
  });

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
"

pause
