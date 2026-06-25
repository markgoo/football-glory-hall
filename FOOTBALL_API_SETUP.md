# Football API 设置指南

## 概述

项目现在支持从真实的足球数据API获取球队和球员信息！

## 支持的API

### API-Football (推荐)
- **免费版**: 100 requests/hour
- **支持**: 900+ 联赛, 实时球队数据, 球队阵容信息
- **网站**: https://www.api-football.com/

## 快速开始

### 1. 注册API密钥

1. 访问 https://www.api-football.com/
2. 点击 "Get API Key"
3. 选择 "Free" 或付费计划
4. 注册账号并验证邮箱
5. 登录后进入 Dashboard 获取你的 API Key

### 2. 配置环境变量

编辑 `server/.env` 文件:

```bash
# 服务端环境变量
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
DB_PATH=./data/database.sqlite
CLIENT_URL=http://localhost:9300

# Football API 配置
FOOTBALL_API_KEY=your-api-key-here  # 在这里填入你的API密钥
FOOTBALL_API_URL=https://v3.football.api-sports.io
```

### 3. 重启服务

配置完成后，重启后端服务:

```bash
cd server
npm install  # 安装新增的axios依赖
npm run dev
```

### 4. 创建杯赛测试

现在创建新杯赛时:
- 系统会尝试从API获取真实的球队数据
- 包含球队徽标、国家信息、成立年份
- 基于阵容计算球队实力

## 功能特性

### ✅ 已实现
- 自动获取热门联赛球队（英超、西甲、意甲、德甲、法甲）
- 球队数据包含: 名称、徽标、国家、成立年份
- 智能计算球队实力（基于球员位置分布）
- 回退机制（API不可用时使用随机数据）

### 📋 API配额说明
- **免费版**: 每小时100次请求
- 每次创建杯赛会消耗球队数量 + 球队数量 次请求
- 建议: 杯赛球队数控制在8-16支以节省配额

## 故障排除

### API请求失败
如果看到控制台输出"Failed to fetch teams"或"Failed to fetch team squad":

1. **检查API密钥**
   - 确认 `FOOTBALL_API_KEY` 已正确设置
   - 访问 Dashboard 检查密钥状态

2. **检查配额**
   - 免费版每小时100次请求
   - 等待一小时或升级计划

3. **回退机制**
   - 即使API失败，系统会自动回退到随机生成球队
   - 杯赛仍可正常创建和使用

4. **网络问题**
   - 确认能访问 `v3.football.api-sports.io`
   - 检查防火墙或代理设置

### 数据库同步问题
如果修改了Team模型（如添加logo字段）:

```bash
cd server
# 删除旧数据库（会丢失数据）
rm data/database.sqlite
# 重新初始化数据库
npm run db:init
```

## 高级配置

### 自定义联赛ID
在 `footballAPIService.ts` 中修改:

```typescript
// Popular leagues: Premier League(39), La Liga(140), Serie A(135), Bundesliga(78), Ligue 1(61)
const popularLeagues = [39, 140, 135, 78, 61]; // 修改这里的联赛ID
```

获取更多联赛ID: https://www.api-football.com/documentation-v3#tag/Leagues

### 调整球队实力算法
在 `footballAPIService.ts` 中修改 `calculateTeamStrength` 方法:

```typescript
calculateTeamStrength(players: Player[]) {
  // 自定义基于球员评分的算法
  // 例如: 使用球员的市场价值、评分等权重计算
}
```

## 升级到付费计划

如果免费配额不够用，可以:
1. 访问 Dashboard
2. 选择适合的付费计划
3. 获取新的 API Key
4. 更新 `.env` 文件

付费计划提供:
- 10,000+ requests/day
- 更快的响应速度
- 优先技术支持

## 技术支持

- API文档: https://www.api-football.com/documentation-v3
- GitHub Issues: [项目GitHub仓库]/issues
- 邮件支持: [你的支持邮箱]
