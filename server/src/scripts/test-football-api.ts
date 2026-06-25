import 'reflect-metadata';
import FootballAPIService from '../services/footballAPIService';

const testFootballAPI = async () => {
  try {
    console.log('🔄 测试 Football API 连接...\n');

    // 测试获取联赛
    console.log('📊 获取联赛列表...');
    const leagues = await FootballAPIService.getLeagues();
    console.log(`✅ 成功获取 ${leagues.length} 个联赛\n`);

    if (leagues.length > 0) {
      console.log('示例联赛:');
      leagues.slice(0, 3).forEach((league: any) => {
        console.log(`  - ${league.league.name} (${league.country.name})`);
      });
      console.log('');
    }

    // 测试获取球队
    console.log('⚽ 获取英超球队 (联赛ID: 39)...');
    const teams = await FootballAPIService.getTeamsByLeague(39);
    console.log(`✅ 成功获取 ${teams.length} 支球队\n`);

    if (teams.length > 0) {
      console.log('示例球队:');
      teams.slice(0, 5).forEach((team: any) => {
        console.log(`  - ${team.team.name}`);
      });
      console.log('');
    }

    // 测试获取球队阵容
    if (teams.length > 0) {
      const firstTeam = teams[0];
      console.log(`📋 获取 ${firstTeam.team.name} 的阵容...`);
      const squad = await FootballAPIService.getTeamSquad(firstTeam.team.id);

      if (squad && squad.players) {
        console.log(`✅ 成功获取 ${squad.players.length} 名球员\n`);

        console.log('示例球员:');
        squad.players.slice(0, 5).forEach((player: any) => {
          console.log(`  - ${player.name} (${player.position})`);
        });
        console.log('');
      } else {
        console.log('⚠️ 未能获取球员阵容（可能是API配额不足）\n');
      }
    }

    // 测试获取热门球队
    console.log('🏆 测试获取16支热门球队...');
    const popularTeams = await FootballAPIService.getPopularTeams(16);
    console.log(`✅ 成功获取 ${popularTeams.length} 支球队\n`);

    if (popularTeams.length > 0) {
      console.log('获取的球队:');
      popularTeams.forEach((team: any, index: number) => {
        console.log(`  ${index + 1}. ${team.team.name} (${team.team.country})`);
      });
      console.log('');
    }

    console.log('✅ 所有测试完成！API工作正常。');
    console.log('\n💡 提示:');
    console.log('   - 免费版每小时有100次请求限制');
    console.log('   - 如果测试失败，检查 .env 中的 FOOTBALL_API_KEY');
    console.log('   - 查看 FOOTBALL_API_SETUP.md 获取详细配置说明');

    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.log('\n💡 可能的解决方案:');
    console.log('   1. 检查 .env 文件中的 FOOTBALL_API_KEY');
    console.log('   2. 确认API密钥有效且未过期');
    console.log('   3. 检查网络连接和代理设置');
    console.log('   4. 查看配额是否已用完（免费版每小时100次）');
    process.exit(1);
  }
};

if (require.main === module) {
  testFootballAPI();
}
