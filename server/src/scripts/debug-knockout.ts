import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';

const debugKnockout = async () => {
  console.log('=== Knockout Tournament Debug ===\n');

  await AppDataSource.initialize();

  const tournamentRepository = AppDataSource.getRepository(Tournament);
  const matchRepository = AppDataSource.getRepository(Match);

  // Get all tournaments
  const tournaments = await tournamentRepository.find({
    relations: ['teams', 'matches', 'matches.homeTeam', 'matches.awayTeam'],
    order: { createdAt: 'DESC' }
  });

  console.log(`\nFound ${tournaments.length} tournaments:\n`);

  for (const tournament of tournaments) {
    console.log(`\n📊 Tournament: ${tournament.name}`);
    console.log(`   ID: ${tournament.id}`);
    console.log(`   Type: ${tournament.type}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Current Round: ${tournament.currentRound}`);
    console.log(`   Teams: ${tournament.teams?.length || 0}`);
    console.log(`   Total Matches: ${tournament.matches?.length || 0}`);

    if (tournament.matches && tournament.matches.length > 0) {
      // Group matches by round
      const matchesByRound = {};
      tournament.matches.forEach(match => {
        if (!matchesByRound[match.round]) {
          matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
      });

      console.log('\n   Matches by round:');
      Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(round => {
        const matches = matchesByRound[round];
        console.log(`\n   第 ${round} 轮 (${matches.length} 场比赛):`);

        matches.forEach((match, index) => {
          const homeScore = match.homeScore ?? '-';
          const awayScore = match.awayScore ?? '-';
          console.log(`     ${index + 1}. ${match.homeTeam.name} ${homeScore}:${awayScore} ${match.awayTeam.name} [${match.status}]`);
        });
      });

      // Check for next round generation issues
      const maxRound = Math.max(...Object.keys(matchesByRound).map(r => parseInt(r)));
      console.log(`\n   Max round: ${maxRound}, Current round: ${tournament.currentRound}`);

      if (tournament.type === 'knockout' && maxRound === 1 && tournament.currentRound === 1) {
        console.log('\n   ⚠️  问题发现：淘汰赛只有第一轮，没有生成后续轮次！');

        // Check if round 1 matches are completed
        const round1Matches = matchesByRound[1] || [];
        const completedMatches = round1Matches.filter(m => m.status === 'completed');
        console.log(`   第一轮完成情况: ${completedMatches.length}/${round1Matches.length}`);

        if (completedMatches.length === round1Matches.length) {
          console.log('   ✅ 第一轮已全部完成，但未触发第二轮生成');
        } else {
          console.log('   ❌ 第一轮尚未全部完成');
        }
      }
    }

    console.log('\n' + '-'.repeat(60));
  }

  process.exit(0);
};

debugKnockout().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
