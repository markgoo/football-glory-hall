# Football API 使用说明 (更新)

## ✅ 最新状态：球员阵容可正常获取

根据最新测试，**API-Football 免费版完全支持球员阵容数据**！之前报告的问题是代码配置错误，现已修复。

### 已修复的问题

1. **球队名称后缀已移除**
   - 前24支球队现在显示为"皇家马德里"而不是"皇家马德里 1"
   - 只有当球队数量超过24支时才会添加后缀（如"皇家马德里 2"）

2. **球员数据现在基于真实阵容**
   - 修复了axios配置错误，现在可以正常获取/players/squads端点
   - 创建杯赛时会获取每个球队的真实球员阵容
   - 球队实力根据球员分布自动计算

### 如何使用

创建新杯赛时，系统会自动：
1. 从5大联赛（英超、西甲、意甲、德甲、法甲）获取真实球队
2. 为每个球队获取完整的球员阵容（包括球员姓名、位置、年龄、号码、照片）
3. 基于球员位置分布（门将、后卫、中场、前锋）计算球队实力
4. 如果API配额用完，自动回退到随机生成

### API配额说明

当创建杯赛时，会消耗以下API请求：
- `getPopularTeams(teamCount)` - 1次请求获取所有联赛
- `getTeamSquad(teamId)` - teamCount次请求（每个球队阵容）

**免费版配额**：100 requests/hour
**建议**：创建8-16支球队的杯赛（9-17次请求），可以在配额内创建多场比赛

### 测试验证

你可以通过以下命令测试API是否正常：

```bash
# 测试球队阵容端点
cd server
curl -X GET "https://v3.football.api-sports.io/players/squads?team=33" \
  -H "x-apisports-key: YOUR_API_KEY" \
  -H "x-rapidapi-host: v3.football.api-sports.io"
```

预期响应：HTTP 200 OK，包含完整的球员阵容数据

### 故障排除

如果仍然看到虚拟球员，请检查：

1. **API密钥设置**
   ```bash
   # 检查server/.env 文件
   FOOTBALL_API_KEY=your-api-key-here
   FOOTBALL_API_URL=https://v3.football.api-sports.io
   ```

2. **查看日志输出**
   创建杯赛时应看到类似日志：
   ```
   Creating teams for tournament...
   Fetching 16 teams from Football API...
   Team created: 皇家马德里 (squad: 25 players)
   Team created: 巴塞罗那 (squad: 23 players)
   ...
   ```

3. **API配额检查**
   查看响应头中的 `x-ratelimit-requests-remaining`
   如果为0，需要等待下一小时或升级计划

### 球队实力计算

球队实力算法基于球员位置分布：

```typescript
// 示例：皇家马德里（25名球员）
- 门将: 3人 → 防守+5
- 后卫: 8人 → 防守+15
- 中场: 9人 → 中场+20
- 前锋: 5人 → 攻击+18
- 综合: (防守+中场+攻击)/3 + 随机因子
```

这个算法确保拥有均衡阵容的球队（如顶级俱乐部）会有更高的整体评分。
