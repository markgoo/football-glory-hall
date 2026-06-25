# Football Glory Hall - 足球荣耀殿堂

一个现代化的网页足球经理游戏，让你创建杯赛、管理球队、模拟比赛，并将所有历史记录保存在荣耀殿堂中。

## 🏆 功能特色

- **用户系统**: 完整的注册/登录功能，支持JWT认证
- **杯赛管理**: 创建、管理、删除各类杯赛（淘汰赛、联赛、小组赛）
- **真实球队数据**: 集成Football API，获取真实球队和球员信息
- **球队系统**: 自动生成球队，包含详细属性（攻击、防守、中场、整体实力）
- **比赛引擎**: AI驱动的比赛模拟系统，生成详细比赛数据和文字解说
- **数据统计**: 全面的比赛统计（控球率、射门、角球、犯规等）
- **荣耀殿堂**: 永久保存所有杯赛历史记录，支持搜索和查看
- **批量操作**: 支持批量开始比赛，提升操作效率

## 🚀 技术栈

### 前端
- React 18 + TypeScript
- Tailwind CSS 样式框架
- React Router 路由管理
- Axios HTTP客户端
- Vite 构建工具

### 后端
- Node.js + Express
- TypeScript
- TypeORM 数据库ORM
- SQLite 数据库 (开发) / PostgreSQL (生产)
- JWT 认证
- bcryptjs 密码加密

## 📦 安装和运行

### 前置要求
- Node.js 16+
- npm 或 yarn

### 方法一：使用启动脚本（推荐 Windows 用户）

双击运行 `start.bat`，脚本会自动检查并安装所有依赖，然后启动应用。

```bash
start.bat
```

脚本功能：
- 自动检测 Node.js 环境
- 自动安装所有依赖（根目录、后端、前端）
- 一键启动前后端服务

### 方法二：手动安装和运行

1. 克隆项目
```bash
git clone https://github.com/your-username/football-glory-hall.git
cd football-glory-hall
```

2. 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

3. 配置环境变量
```bash
# 后端环境变量
cd server
cp .env.example .env
# 编辑 .env 文件，设置JWT_SECRET等
```

4. 初始化数据库
```bash
cd server
npm run db:init
```

5. 启动开发服务器
```bash
# 从根目录启动前后端
cd ..
npm run dev
```

应用将运行在：
- 前端: http://localhost:3000
- 后端: http://localhost:5000

## 🏆 高级功能：真实足球数据API

### 配置Football API（可选）

项目支持接入真实的足球数据API，让球队信息更加真实。

#### 快速配置：
```bash
cd server
cp .env.example .env
# 编辑 .env 文件，添加你的API密钥
```

#### 注册免费API密钥：
1. 访问 [API-Football](https://www.api-football.com/)
2. 注册免费账号（每月10000次请求）
3. 获取API密钥
4. 填入 `.env` 文件的 `FOOTBALL_API_KEY` 配置项

详细配置说明请查看 [FOOTBALL_API_SETUP.md](./FOOTBALL_API_SETUP.md)

### API功能特性：
- ✅ 自动获取五大联赛真实球队
- ✅ 真实球队徽标、国家、成立年份
- ✅ 基于阵容的智能实力计算
- ✅ API故障自动回退机制

## 🎮 使用指南

### 1. 创建账户
访问 http://localhost:3000 注册新账户或登录

### 2. 创建杯赛
1. 登录后进入"杯赛管理"
2. 点击"创建新杯赛"
3. 设置杯赛名称、描述、类型和球队数量
4. 系统会自动生成相应的球队

### 3. 开始比赛
1. 在杯赛详情中选择一场比赛
2. 点击"开始模拟比赛"
3. 查看详细的比赛结果和数据统计

### 4. 查看历史
所有完成的杯赛都会自动记录在"荣耀殿堂"中

## 🏗️ 项目结构

```
football-glory-hall/
├── client/                 # 前端React应用
│   ├── src/
│   │   ├── components/     # 可复用组件
│   │   ├── pages/          # 页面组件
│   │   ├── contexts/       # React上下文
│   │   ├── services/       # API服务
│   │   ├── types/          # TypeScript类型定义
│   │   └── utils/          # 工具函数
├── server/                 # 后端Express应用
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据库模型
│   │   ├── routes/         # API路由
│   │   ├── services/       # 业务逻辑
│   │   ├── middleware/     # 中间件
│   │   └── config/         # 配置文件
├── shared/                 # 共享类型和工具
└── data/                   # 数据库文件
```

## 📊 API端点

### 认证
- POST `/api/auth/register` - 用户注册
- POST `/api/auth/login` - 用户登录
- GET `/api/auth/profile` - 获取用户信息

### 杯赛
- GET `/api/tournaments` - 获取所有杯赛
- POST `/api/tournaments` - 创建新杯赛
- GET `/api/tournaments/:id` - 获取特定杯赛
- PUT `/api/tournaments/:id` - 更新杯赛
- DELETE `/api/tournaments/:id` - 删除杯赛

### 比赛
- GET `/api/matches` - 获取所有比赛
- GET `/api/matches/:id` - 获取特定比赛
- POST `/api/matches/:id/simulate` - 模拟比赛
- GET `/api/matches/:id/statistics` - 获取比赛统计

### 历史记录
- GET `/api/historical` - 获取所有历史记录
- GET `/api/historical/user` - 获取用户历史记录
- POST `/api/historical` - 从杯赛创建历史记录

## 🔧 开发

### 开发模式
```bash
# 启动所有服务
npm run dev

# 单独启动前端
cd client && npm run dev

# 单独启动后端
cd server && npm run dev
```

### 构建生产版本
```bash
# 构建所有
npm run build

# 构建前端
cd client && npm run build

# 构建后端
cd server && npm run build
```

### 数据库迁移
```bash
cd server
npm run db:init    # 初始化数据库
npm run db:seed    # 添加测试数据
```

## 🚀 部署

### 使用Vercel部署前端
1. 连接GitHub仓库到Vercel
2. 设置构建命令：`npm run client:build`
3. 设置输出目录：`client/dist`

### 使用Render部署后端
1. 连接GitHub仓库到Render
2. 设置构建命令：`npm install && npm run server:build`
3. 设置启动命令：`npm start`
4. 配置环境变量

## 📝 待办功能

### 已实现 ✅
- ✅ Football API 集成，获取真实球队数据
- ✅ 批量开始比赛功能
- ✅ 杯赛详情页面直接开始比赛
- ✅ 启动脚本和自动化依赖安装

### 计划中 🚀
- [ ] 实时比赛直播文字
- [ ] 球员转会系统
- [ ] 更复杂的战术设置
- [ ] 用户头像和自定义
- [ ] 比赛回放系统
- [ ] 社交分享功能
- [ ] 移动端适配优化
- [ ] 多语言支持
- [ ] 高级统计分析
- [ ] 成就系统
- [ ] 3D比赛可视化
- [ ] 实时比分推送
- [ ] 多人在线对战
- [ ] 自定义联赛规则
- [ ] 伤病和转会市场
- [ ] 青训系统
- [ ] 财务管理

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- 灵感来源于《冠军足球经理》系列游戏
- 感谢所有开源社区的支持

---

**享受你的足球经理之旅！** ⚽🎮