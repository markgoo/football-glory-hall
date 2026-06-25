# 淘汰赛调试指南

## 问题排查步骤

如果第一轮比赛结束后没有生成第二轮，请按照以下步骤检查：

### 1. 查看服务器日志

重启服务后，模拟比赛时应该会看到如下日志：

```
[TOURNAMENT] Simulating match: <match-id>
Tournament type: knockout
Tournament status: active
[TOURNAMENT] Found X completed matches for round 1
[TOURNAMENT] Match 1: TeamA 3 - 1 TeamB
[TOURNAMENT] Winner: TeamA
[TOURNAMENT] Total winners: 8
[TOURNAMENT] Generating round 2 with 8 winners
[TOURNAMENT] Creating match: TeamA vs TeamC
[TOURNAMENT] Saved 4 matches for round 2
[TOURNAMENT] Updated tournament currentRound to 2
```

### 2. 常见问题和解决方案

#### 问题1：日志中没有 "[TOURNAMENT]" 相关信息

**原因**：match.tournament.type 或 match.tournament.status 为 undefined

**解决**：

检查 matchController.ts 中的 simulateMatch 方法，确保 relations 包含完整的 tournament 信息：

```typescript
const match = await matchRepository.findOne({
  where: { id },
  relations: ['homeTeam', 'awayTeam', 'tournament', 'tournament.user', 'tournament.teams']
});
```

#### 问题2："Found 0 completed matches for round 1"

**原因**：比赛状态没有正确设置为 'completed'

**解决**：

检查 matchController.ts 中的 simulateMatch 方法，确保比赛状态已更新：

```typescript
match.status = 'completed';
await matchRepository.save(match);
```

#### 问题3："Total winners: 0"

**原因**：所有比赛都是平局，或者比分没有正确设置

**解决**：

检查比赛模拟后是否正确设置了比分：

```typescript
match.homeScore = simulationResult.homeScore;
match.awayScore = simulationResult.awayScore;
```

### 3. 手动检查数据库

如果以上方法都无法解决，可以手动检查数据库：

```bash
cd server
npx tsx src/scripts/check-matches.ts
```

创建检查脚本：

```typescript
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Match } from '../models/Match';

const checkMatches = async () => {
  await AppDataSource.initialize();

  const matchRepository = AppDataSource.getRepository(Match);

  // 检查第一轮比赛
  const round1Matches = await matchRepository.find({
    where: { round: 1 },
    relations: ['homeTeam', 'awayTeam', 'tournament']
  });

  console.log('=== Round 1 Matches ===');
  round1Matches.forEach(match => {
    console.log(`Match ${match.id}: ${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name} (Status: ${match.status})`);
  });

  // 检查是否存在第二轮比赛
  const round2Matches = await matchRepository.find({
    where: { round: 2 },
    relations: ['homeTeam', 'awayTeam', 'tournament']
  });

  console.log('\n=== Round 2 Matches ===');
  if (round2Matches.length === 0) {
    console.log('No round 2 matches found!');
  } else {
    round2Matches.forEach(match => {
      console.log(`Match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
    });
  }

  process.exit(0);
};

checkMatches();
```

### 4. 重新模拟所有第一轮比赛

如果仍然有问题，可以尝试重新模拟所有第一轮比赛：

```typescript
import { AppDataSource } from '../config/database';
import { matchAPI } from '../client/src/services/api';

const replayRound1 = async () => {
  await AppDataSource.initialize();

  const matchRepository = AppDataSource.getRepository(Match);

  // 获取所有第一轮比赛
  const round1Matches = await matchRepository.find({
    where: { round: 1 },
    relations: ['homeTeam', 'awayTeam', 'tournament']
  });

  console.log(`Found ${round1Matches.length} round 1 matches`);

  // 重新模拟每场比赛
  for (const match of round1Matches) {
    console.log(`Simulating match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);

    // 调用模拟API（确保后端服务正在运行）
    try {
      await matchAPI.simulate(match.id);
      console.log('✅ Success');
    } catch (error) {
      console.error('❌ Failed:', error.message);
    }

    // 等待1秒避免API限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('All matches simulated!');
  process.exit(0);
};

replayRound1();
```

### 5. API 端点检查

确保 API 端点正常工作：

```bash
# 获取杯赛详情
curl http://localhost:5005/api/tournaments/<tournament-id>

# 获取比赛列表
curl http://localhost:5005/api/matches
```

### 6. 联系支持

如果以上所有方法都无法解决问题，请提供以下信息：

1. 创建杯赛时的请求参数（球队数量、类型等）
2. 第一轮比赛完成后的数据库截图或导出
3. 服务器日志中的完整错误信息
4. 浏览器控制台的任何错误信息

---

**当前状态**：正在等待重启服务并测试新的日志输出
