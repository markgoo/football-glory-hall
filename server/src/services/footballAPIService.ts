import axios from 'axios';
import { unCountryNames } from '../data/unCountries';
import { getCountryNameZh } from '../data/countryNamesZh';

export interface FootballApiPlayer {
  id: number;
  name: string;
  age: number;
  number: number;
  position: string;
  photo: string;
}

interface TeamAPIResponse {
  id: number;
  name: string;
  code: string;
  country: string;
  founded: number;
  logo: string;
}

interface TeamSquadResponse {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  players: FootballApiPlayer[];
}

class FootballAPIService {
  private client: any;
  private clientInitialized = false;
  private teamSearchCache = new Map<string, any[]>();
  private squadCache = new Map<number, TeamSquadResponse | null>();
  private rateLimitedUntil = 0;

  private async getPersistentCache(key: string) {
    try {
      const { AppDataSource } = await import('../config/database');
      const { FootballApiCache } = await import('../models/FootballApiCache');
      if (!AppDataSource.isInitialized) return undefined;
      const cached = await AppDataSource.getRepository(FootballApiCache).findOne({ where: { key } });
      return cached?.value;
    } catch {
      return undefined;
    }
  }

  private async setPersistentCache(key: string, value: any) {
    try {
      const { AppDataSource } = await import('../config/database');
      const { FootballApiCache } = await import('../models/FootballApiCache');
      if (!AppDataSource.isInitialized) return;
      const repository = AppDataSource.getRepository(FootballApiCache);
      let cached = await repository.findOne({ where: { key } });
      if (!cached) cached = repository.create({ key, value });
      cached.value = value;
      await repository.save(cached);
    } catch (error: any) {
      console.warn('Failed to persist football API cache:', error.message);
    }
  }

  private initializeClient() {
    if (!this.clientInitialized) {
      const apiKey = process.env.FOOTBALL_API_KEY;
      const baseURL = process.env.FOOTBALL_API_URL || 'https://v3.football.api-sports.io';

      if (!apiKey) {
        console.warn('⚠️ FOOTBALL_API_KEY is not set! API calls will fail with 403.');
        console.warn('Please check server/.env file');
      } else {
        console.log('✅ Football API client initialized with API key');
      }

      this.client = axios.create({
        baseURL,
        headers: {
          'x-apisports-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });
      this.clientInitialized = true;
    }
    return this.client;
  }

  // 获取支持的联赛列表
  async getLeagues() {
    try {
      const response = await this.initializeClient().get('/leagues', {
        params: {
          current: true
        }
      });
      return response.data.response;
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
      return [];
    }
  }

  // 获取特定联赛的球队
  async getTeamsByLeague(leagueId: number, season: number = 2023) {
    const persistentKey = `league-teams:${leagueId}:${season}`;
    const persistent = await this.getPersistentCache(persistentKey);
    if (persistent !== undefined) return persistent || [];

    try {
      const response = await this.initializeClient().get('/teams', {
        params: {
          league: leagueId,
          season: season
        }
      });
      const teams = response.data.response || [];
      await this.setPersistentCache(persistentKey, teams);
      return teams;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log(`API access forbidden (403) for league ${leagueId} - skipping`);
      } else {
        console.error('Failed to fetch teams:', error.message);
      }
      return [];
    }
  }

  // 获取球队阵容（注：当前版本不使用此方法，保留备用）
  async getTeamSquad(teamId: number) {
    if (this.squadCache.has(teamId)) return this.squadCache.get(teamId) || null;
    const persistentKey = `squad:${teamId}`;
    const persistent = await this.getPersistentCache(persistentKey);
    if (persistent !== undefined) {
      this.squadCache.set(teamId, persistent);
      return persistent || null;
    }
    if (Date.now() < this.rateLimitedUntil) return null;
    try {
      const response = await this.initializeClient().get('/players/squads', {
        params: {
          team: teamId
        }
      });

      if (response.data.response && response.data.response.length > 0) {
        const squad = response.data.response[0] as TeamSquadResponse;
        this.squadCache.set(teamId, squad);
        await this.setPersistentCache(persistentKey, squad);
        return squad;
      }
      return null;
    } catch (error: any) {
      if (error.response?.status === 429) {
        this.rateLimitedUntil = Date.now() + 60_000;
        console.warn('Football API rate limit reached while fetching squad; skipping external squad lookups for 60 seconds');
      }
      if (error.response?.status !== 404) {
        console.error('Failed to fetch team squad:', error.message);
      }
      return null;
    }
  }

  async getFixturesByLeagueSeason(leagueId: number, season: number) {
    const persistentKey = `fixtures:${leagueId}:${season}`;
    const persistent = await this.getPersistentCache(persistentKey);
    if (persistent !== undefined) return persistent || [];

    try {
      const response = await this.initializeClient().get('/fixtures', {
        params: { league: leagueId, season }
      });
      const fixtures = response.data.response || [];
      await this.setPersistentCache(persistentKey, fixtures);
      return fixtures;
    } catch (error: any) {
      console.error('Failed to fetch fixtures:', error.message);
      return [];
    }
  }

  async searchLeagues(query: string) {
    const persistentKey = `league-search:${String(query || '').trim().toLowerCase()}`;
    const persistent = await this.getPersistentCache(persistentKey);
    if (persistent !== undefined) return persistent || [];

    try {
      const response = await this.initializeClient().get('/leagues', {
        params: { search: query }
      });
      const leagues = response.data.response || [];
      await this.setPersistentCache(persistentKey, leagues);
      return leagues;
    } catch (error: any) {
      console.error('Failed to search leagues:', error.message);
      return [];
    }
  }

  async getWorldCupFixtures(season: number) {
    const direct = await this.getFixturesByLeagueSeason(1, season);
    if (direct.length > 0) {
      return { fixtures: direct, leagueId: 1, leagueName: 'World Cup' };
    }

    const leagues = await this.searchLeagues('World Cup');
    const candidates = leagues
      .filter((item: any) => {
        const name = String(item.league?.name || '').toLowerCase();
        const type = String(item.league?.type || '').toLowerCase();
        return name.includes('world cup') && type !== 'league';
      })
      .map((item: any) => ({
        id: Number(item.league?.id),
        name: String(item.league?.name || 'World Cup')
      }))
      .filter((item: any) => Number.isFinite(item.id));

    for (const candidate of candidates) {
      const fixtures = await this.getFixturesByLeagueSeason(candidate.id, season);
      if (fixtures.length > 0) {
        return { fixtures, leagueId: candidate.id, leagueName: candidate.name };
      }
    }

    return { fixtures: [], leagueId: 1, leagueName: 'World Cup', searchedLeagueIds: candidates.map((item: any) => item.id) };
  }

  async getWorldCup26OpenGames() {
    const persistentKey = 'worldcup26-ir:games';
    const persistent = await this.getPersistentCache(persistentKey);
    if (persistent !== undefined) return persistent || [];

    try {
      const response = await axios.get('https://worldcup26.ir/get/games', { timeout: 15000 });
      const data = response.data;
      const games = Array.isArray(data?.games) ? data.games : Array.isArray(data) ? data : [];
      await this.setPersistentCache(persistentKey, games);
      return games;
    } catch (error: any) {
      console.error('Failed to fetch worldcup26.ir games:', error.message);
      return [];
    }
  }

  async searchTeams(query: string) {
    const search = String(query || '').trim();
    if (!search) return [];
    const cacheKey = search.toLowerCase();
    if (this.teamSearchCache.has(cacheKey)) return this.teamSearchCache.get(cacheKey) || [];
    const persistentKey = `team-search:${cacheKey}`;
    const persistent = await this.getPersistentCache(persistentKey);
    if (persistent !== undefined) {
      this.teamSearchCache.set(cacheKey, persistent || []);
      return persistent || [];
    }
    if (Date.now() < this.rateLimitedUntil) return [];

    try {
      const response = await this.initializeClient().get('/teams', {
        params: { search }
      });
      const teams = response.data.response || [];
      this.teamSearchCache.set(cacheKey, teams);
      await this.setPersistentCache(persistentKey, teams);
      return teams;
    } catch (error: any) {
      if (error.response?.status === 429) {
        this.rateLimitedUntil = Date.now() + 60_000;
        console.warn('Football API rate limit reached while searching teams; skipping external team lookups for 60 seconds');
        return [];
      }
      console.error('Failed to search teams:', error.message);
      return [];
    }
  }

  private normalizeComparableName(value: string) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private getTeamSearchAliases(name?: string, country?: string) {
    const normalizedValues = [name, country].map(value => this.normalizeComparableName(String(value || '')));
    const aliases: Record<string, string[]> = {
      czechrepublic: ['Czechia', 'Czech Republic', 'Czech'],
      czechia: ['Czechia', 'Czech Republic', 'Czech'],
      ivorycoast: ['Ivory Coast', "Cote d'Ivoire", 'Côte d’Ivoire'],
      drcongo: ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo'],
      democraticrepublicofthecongo: ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo'],
      usa: ['USA', 'United States', 'United States of America'],
      southkorea: ['South Korea', 'Korea Republic'],
      bosniaandherzegovina: ['Bosnia and Herzegovina', 'Bosnia Herzegovina']
    };

    return Array.from(new Set(normalizedValues.flatMap(value => aliases[value] || [])));
  }

  async resolveTeamApiId(params: { name: string; country?: string; preferredId?: number; national?: boolean }) {
    const looksLikeLocalFallbackId = params.preferredId && ((params.preferredId >= 1000 && params.preferredId < 2000) || params.preferredId >= 9000);
    if (params.preferredId && params.preferredId > 0 && !looksLikeLocalFallbackId) {
      return params.preferredId;
    }

    const country = String(params.country || params.name || '').trim();
    const searchTerms = Array.from(new Set([country, params.name, ...this.getTeamSearchAliases(params.name, country)].filter(Boolean)));
    const normalizedCountry = this.normalizeComparableName(country);
    const normalizedName = this.normalizeComparableName(params.name);

    for (const term of searchTerms) {
      const teams = await this.searchTeams(term);
      const candidates = teams
        .map((item: any) => item.team)
        .filter(Boolean)
        .filter((team: any) => {
          if (params.national && team.national !== true) return false;
          const teamCountry = this.normalizeComparableName(team.country || '');
          const teamName = this.normalizeComparableName(team.name || '');
          return teamCountry === normalizedCountry || teamName === normalizedName || teamName.includes(normalizedCountry);
        });

      if (candidates.length > 0) {
        return Number(candidates[0].id);
      }
    }

    console.warn(`Could not resolve API team id for ${params.name}${params.country ? ` (${params.country})` : ''}`);
    return undefined;
  }

  async getResolvedTeamSquad(params: { name: string; country?: string; preferredId?: number; national?: boolean }) {
    const apiId = await this.resolveTeamApiId(params);
    if (!apiId) return { apiId: undefined, squad: null };
    const squad = await this.getTeamSquad(apiId);
    return { apiId, squad };
  }

  // 转换API数据为内部格式
  transformApiTeamToInternal(apiTeam: any) {
    return {
      id: apiTeam.team.id,
      name: apiTeam.team.name,
      shortName: apiTeam.team.code || apiTeam.team.name.substring(0, 3).toUpperCase(),
      logo: apiTeam.team.logo,
      country: apiTeam.team.country,
      founded: apiTeam.team.founded,
      players: apiTeam.players?.map((player: any) => ({
        id: player.id,
        name: player.name,
        age: player.age,
        number: player.number,
        position: player.position,
        photo: player.photo
      })) || []
    };
  }

  // 计算球队整体实力（注：当前版本不使用此方法，保留备用）
  calculateTeamStrength(players: FootballApiPlayer[]) {
    const baseStats = {
      attack: 0,
      defense: 0,
      midfield: 0
    };

    if (!players || players.length === 0) {
      return {
        ...baseStats,
        overall: 70 + Math.floor(Math.random() * 30)
      };
    }

    const positionCounts = {
      'Goalkeeper': 0,
      'Defender': 0,
      'Midfielder': 0,
      'Attacker': 0
    };

    players.forEach(player => {
      if (player.position && player.position.includes('Goalkeeper')) {
        positionCounts['Goalkeeper']++;
      } else if (player.position && player.position.includes('Defender')) {
        positionCounts['Defender']++;
      } else if (player.position && player.position.includes('Midfielder')) {
        positionCounts['Midfielder']++;
      } else if (player.position && player.position.includes('Attacker')) {
        positionCounts['Attacker']++;
      }
    });

    const totalPlayers = players.length;
    baseStats.defense = Math.floor((positionCounts['Goalkeeper'] + positionCounts['Defender']) / totalPlayers * 100) + Math.floor(Math.random() * 20);
    baseStats.midfield = Math.floor((positionCounts['Midfielder']) / totalPlayers * 100) + Math.floor(Math.random() * 20);
    baseStats.attack = Math.floor((positionCounts['Attacker']) / totalPlayers * 100) + Math.floor(Math.random() * 20);

    baseStats.defense = Math.min(99, Math.max(60, baseStats.defense));
    baseStats.midfield = Math.min(99, Math.max(60, baseStats.midfield));
    baseStats.attack = Math.min(99, Math.max(60, baseStats.attack));

    const overall = Math.floor((baseStats.attack + baseStats.defense + baseStats.midfield) / 3) + Math.floor(Math.random() * 10);

    return {
      ...baseStats,
      overall: Math.min(99, Math.max(70, overall))
    };
  }

  // 获取热门联赛的球队（默认使用一些热门联赛ID）
  private getLeaguePlan(teamCount: number) {
    const topLeagueQuota = teamCount <= 8 ? 2 : teamCount <= 16 ? 3 : teamCount <= 32 ? 4 : teamCount <= 64 ? 6 : 8;
    const strongLeagueQuota = teamCount <= 16 ? 1 : teamCount <= 32 ? 2 : teamCount <= 64 ? 3 : 5;
    const globalLeagueQuota = teamCount <= 32 ? 1 : teamCount <= 64 ? 2 : 3;

    return [
      { id: 39, country: 'England', quota: topLeagueQuota, tier: 95 },
      { id: 140, country: 'Spain', quota: topLeagueQuota, tier: 95 },
      { id: 135, country: 'Italy', quota: topLeagueQuota, tier: 93 },
      { id: 78, country: 'Germany', quota: Math.max(1, topLeagueQuota - 1), tier: 92 },
      { id: 61, country: 'France', quota: strongLeagueQuota, tier: 90 },
      { id: 88, country: 'Netherlands', quota: strongLeagueQuota, tier: 86 },
      { id: 94, country: 'Portugal', quota: strongLeagueQuota, tier: 85 },
      { id: 203, country: 'Turkey', quota: globalLeagueQuota, tier: 82 },
      { id: 71, country: 'Brazil', quota: globalLeagueQuota + 1, tier: 84 },
      { id: 128, country: 'Argentina', quota: globalLeagueQuota, tier: 83 },
      { id: 253, country: 'USA', quota: globalLeagueQuota, tier: 78 },
      { id: 307, country: 'Saudi Arabia', quota: globalLeagueQuota, tier: 80 },
      { id: 262, country: 'Mexico', quota: globalLeagueQuota, tier: 79 },
      { id: 179, country: 'Scotland', quota: globalLeagueQuota, tier: 79 },
      { id: 144, country: 'Belgium', quota: globalLeagueQuota, tier: 78 },
      { id: 218, country: 'Austria', quota: globalLeagueQuota, tier: 77 },
      { id: 207, country: 'Switzerland', quota: globalLeagueQuota, tier: 77 },
      { id: 197, country: 'Greece', quota: globalLeagueQuota, tier: 77 },
      { id: 119, country: 'Denmark', quota: globalLeagueQuota, tier: 76 },
      { id: 113, country: 'Sweden', quota: globalLeagueQuota, tier: 75 },
      { id: 103, country: 'Norway', quota: globalLeagueQuota, tier: 75 },
      { id: 210, country: 'Croatia', quota: globalLeagueQuota, tier: 75 },
      { id: 345, country: 'Czech Republic', quota: globalLeagueQuota, tier: 75 },
      { id: 333, country: 'Ukraine', quota: globalLeagueQuota, tier: 78 },
      { id: 169, country: 'China', quota: globalLeagueQuota, tier: 72 },
      { id: 292, country: 'South Korea', quota: globalLeagueQuota, tier: 74 },
      { id: 188, country: 'Australia', quota: globalLeagueQuota, tier: 72 },
      { id: 305, country: 'Qatar', quota: globalLeagueQuota, tier: 74 },
      { id: 301, country: 'United Arab Emirates', quota: globalLeagueQuota, tier: 73 },
      { id: 239, country: 'Colombia', quota: globalLeagueQuota, tier: 75 },
      { id: 268, country: 'Uruguay', quota: globalLeagueQuota, tier: 75 },
      { id: 265, country: 'Chile', quota: globalLeagueQuota, tier: 74 },
      { id: 98, country: 'Japan', quota: globalLeagueQuota, tier: 76 }
    ].filter(league => league.quota > 0);
  }

  private getKnownStrength(teamName: string, fallbackTier: number) {
    const strengths: Record<string, number> = {
      'Real Madrid': 98,
      'Manchester City': 98,
      'Bayern München': 97,
      'Bayern Munich': 97,
      'Inter': 96,
      'Liverpool': 96,
      'Arsenal': 95,
      'Barcelona': 95,
      'Paris Saint Germain': 95,
      'Atletico Madrid': 94,
      'Juventus': 93,
      'AC Milan': 92,
      'Borussia Dortmund': 92,
      'Bayer Leverkusen': 92,
      'Napoli': 91,
      'Chelsea': 90,
      'Tottenham': 90,
      'Benfica': 89,
      'FC Porto': 88,
      'Sporting CP': 88,
      'Ajax': 87,
      'PSV Eindhoven': 87,
      'Feyenoord': 86,
      'Galatasaray': 85,
      'Fenerbahce': 84,
      'Flamengo': 84,
      'Palmeiras': 84,
      'River Plate': 83,
      'Boca Juniors': 83,
      'Al-Hilal Saudi FC': 82,
      'Al-Nassr': 82,
      'Club America': 80,
      'Los Angeles FC': 79,
      'Inter Miami': 79,
      'Urawa Red Diamonds': 77
    };

    return strengths[teamName] || fallbackTier;
  }

  private calculateLeagueTeamStrength(teamName: string, leagueTier: number, leagueIndex: number) {
    const knownStrength = this.getKnownStrength(teamName, 0);
    if (knownStrength > 0) return knownStrength;

    const base = leagueTier >= 95 ? 88
      : leagueTier >= 92 ? 84
      : leagueTier >= 90 ? 82
      : leagueTier >= 85 ? 79
      : leagueTier >= 80 ? 76
      : 72;
    const positionPenalty = Math.floor(leagueIndex / 2) * 2 + (leagueIndex % 2);
    const variance = Math.floor(Math.random() * 3) - 1;
    return Math.max(68, Math.min(base + 2, base - positionPenalty + variance));
  }

  private normalizeTeamName(teamName: string) {
    const normalized = String(teamName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const aliases: Record<string, string> = {
      bayernmunchen: 'bayernmunich',
      fcbayernmunchen: 'bayernmunich',
      fcbayernmunich: 'bayernmunich',
      intermilan: 'inter',
      internazionale: 'inter',
      parisstgermain: 'parissaintgermain',
      psg: 'parissaintgermain',
      atletico: 'atleticomadrid',
      athletico: 'atleticomadrid',
      tottenhamhotspur: 'tottenham',
      spurs: 'tottenham',
      sportinglisbon: 'sportingcp',
      sportingu: 'sportingcp',
      fcporto: 'porto',
      slbenfica: 'benfica'
    };
    return aliases[normalized] || normalized;
  }

  private getTeamDedupeKey(team: any) {
    const teamName = this.normalizeTeamName(team?.name);
    const country = String(team?.country || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return teamName ? `${teamName}:${country}` : String(team?.id || '').toLowerCase();
  }

  private dedupeTeams(teams: any[]) {
    const seen = new Set<string>();
    const rankedTeams = [...teams].sort((a, b) => {
      const aHasLogo = a.team?.logo ? 1 : 0;
      const bHasLogo = b.team?.logo ? 1 : 0;
      return bHasLogo - aHasLogo || (b.team?.strength || 0) - (a.team?.strength || 0);
    });
    return rankedTeams.filter(item => {
      const key = this.getTeamDedupeKey(item.team);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private normalizeCountries(countries?: string[]) {
    return new Set((countries || []).map(country => country.trim().toLowerCase()).filter(Boolean));
  }

  private countryMatches(country: string | undefined, selectedCountries: Set<string>) {
    return selectedCountries.size === 0 || selectedCountries.has(String(country || '').toLowerCase());
  }

  async getPopularTeams(teamCount: number, countries?: string[]) {
    const normalizedCountries = (countries || []).map(country => String(country).trim()).filter(Boolean).sort();
    const persistentKey = `popular-teams:${teamCount}:${normalizedCountries.join('|') || 'global'}`;
    const persistent = await this.getPersistentCache(persistentKey);
    if (persistent !== undefined) return persistent || [];

    const allTeams: any[] = [];
    const selectedCountries = this.normalizeCountries(countries);

    try {
      const leaguePlan = this.getLeaguePlan(teamCount)
        .filter(league => this.countryMatches(league.country, selectedCountries));

      for (const league of leaguePlan) {
        const leagueTeams = await this.getTeamsByLeague(league.id);
        const rankedTeams = leagueTeams
          .filter((item: any) => this.countryMatches(item.team?.country || league.country, selectedCountries))
          .map((item: any, index: number) => ({
            ...item,
            team: {
              ...item.team,
              strength: this.calculateLeagueTeamStrength(item.team.name, league.tier, index)
            }
          }))
          .sort((a: any, b: any) => (b.team.strength || 0) - (a.team.strength || 0));

        allTeams.push(...rankedTeams.slice(0, league.quota));
      }

      const uniqueTeams = this.dedupeTeams(allTeams)
        .sort((a: any, b: any) => (b.team.strength || 0) - (a.team.strength || 0));

      if (uniqueTeams.length < teamCount) {
        const randomTeams = await this.getRandomTeams(teamCount - uniqueTeams.length, countries);
        uniqueTeams.push(...randomTeams);
      }

      const result = this.dedupeTeams(uniqueTeams)
        .sort((a: any, b: any) => (b.team.strength || 0) - (a.team.strength || 0))
        .slice(0, teamCount);
      await this.setPersistentCache(persistentKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch popular teams:', error);
      return this.getRandomTeams(teamCount, countries);
    }
  }

  clearRuntimeCache() {
    this.teamSearchCache.clear();
    this.squadCache.clear();
    this.rateLimitedUntil = 0;
  }

  // 获取随机球队（当API配额不足时的回退方案）
  getNationalTeams(teamCount: number, countries?: string[]) {
    const strengthMap: Record<string, number> = {
      Argentina: 98, France: 97, Spain: 96, England: 95, 'United Kingdom': 95, Brazil: 95, Portugal: 94,
      Netherlands: 93, Germany: 93, Italy: 92, Belgium: 90, Croatia: 89, Uruguay: 88,
      Colombia: 87, Mexico: 86, USA: 85, Switzerland: 85, Denmark: 84, Austria: 83,
      Turkey: 83, Japan: 83, 'South Korea': 82, Morocco: 82, Senegal: 81, Serbia: 81,
      Ukraine: 81, Poland: 80, Sweden: 80, Norway: 80, Nigeria: 80, 'Ivory Coast': 79,
      Ecuador: 79, Algeria: 79, Scotland: 79, 'Czech Republic': 79, Wales: 78,
      Greece: 78, Iran: 78, Egypt: 78, Ghana: 78, Canada: 78, Australia: 77,
      Romania: 77, Hungary: 77, Cameroon: 77, Russia: 76, Chile: 78, Peru: 76,
      Tunisia: 76, 'Saudi Arabia': 76, Qatar: 76, China: 72
    };
    const selectedCountries = this.normalizeCountries(countries);
    const filteredNames = unCountryNames.filter(country => this.countryMatches(country, selectedCountries));
    const selectedNames = filteredNames.length > 0 ? filteredNames : unCountryNames;

    return selectedNames
      .map((country, index) => ({
        team: {
          id: 9000 + index,
          name: getCountryNameZh(country),
          code: country.substring(0, 3).toUpperCase(),
          country,
          founded: 1900,
          strength: strengthMap[country] || Math.max(55, 74 - Math.floor(index / 8)),
          logo: null
        },
        players: []
      }))
      .sort((a, b) => (b.team.strength || 0) - (a.team.strength || 0))
      .slice(0, teamCount);
  }

  private getLegacyNationalTeams(teamCount: number, countries?: string[]) {
    const nationalTeams = [
      ['Argentina', 'ARG', 'Argentina', 1901, 98], ['France', 'FRA', 'France', 1919, 97],
      ['Spain', 'ESP', 'Spain', 1913, 96], ['England', 'ENG', 'England', 1863, 95],
      ['Brazil', 'BRA', 'Brazil', 1914, 95], ['Portugal', 'POR', 'Portugal', 1914, 94],
      ['Netherlands', 'NED', 'Netherlands', 1889, 93], ['Germany', 'GER', 'Germany', 1900, 93],
      ['Italy', 'ITA', 'Italy', 1898, 92], ['Belgium', 'BEL', 'Belgium', 1895, 90],
      ['Croatia', 'CRO', 'Croatia', 1912, 89], ['Uruguay', 'URU', 'Uruguay', 1900, 88],
      ['Colombia', 'COL', 'Colombia', 1924, 87], ['Mexico', 'MEX', 'Mexico', 1927, 86],
      ['USA', 'USA', 'USA', 1913, 85], ['Switzerland', 'SUI', 'Switzerland', 1895, 85],
      ['Denmark', 'DEN', 'Denmark', 1889, 84], ['Austria', 'AUT', 'Austria', 1904, 83],
      ['Turkey', 'TUR', 'Turkey', 1923, 83], ['Japan', 'JPN', 'Japan', 1921, 83],
      ['South Korea', 'KOR', 'South Korea', 1933, 82], ['Morocco', 'MAR', 'Morocco', 1955, 82],
      ['Senegal', 'SEN', 'Senegal', 1960, 81], ['Serbia', 'SRB', 'Serbia', 1919, 81],
      ['Ukraine', 'UKR', 'Ukraine', 1991, 81], ['Poland', 'POL', 'Poland', 1919, 80],
      ['Sweden', 'SWE', 'Sweden', 1904, 80], ['Norway', 'NOR', 'Norway', 1902, 80],
      ['Scotland', 'SCO', 'Scotland', 1873, 79], ['Czech Republic', 'CZE', 'Czech Republic', 1901, 79],
      ['Wales', 'WAL', 'Wales', 1876, 78], ['Greece', 'GRE', 'Greece', 1926, 78],
      ['Australia', 'AUS', 'Australia', 1922, 77], ['Qatar', 'QAT', 'Qatar', 1960, 76],
      ['Saudi Arabia', 'KSA', 'Saudi Arabia', 1956, 76], ['China', 'CHN', 'China', 1924, 72],
      ['United Arab Emirates', 'UAE', 'United Arab Emirates', 1971, 72], ['Chile', 'CHI', 'Chile', 1895, 78],
      ['Ecuador', 'ECU', 'Ecuador', 1925, 79], ['Peru', 'PER', 'Peru', 1922, 76],
      ['Paraguay', 'PAR', 'Paraguay', 1906, 76], ['Venezuela', 'VEN', 'Venezuela', 1926, 75],
      ['Canada', 'CAN', 'Canada', 1912, 78], ['Costa Rica', 'CRC', 'Costa Rica', 1921, 74],
      ['Panama', 'PAN', 'Panama', 1937, 73], ['Jamaica', 'JAM', 'Jamaica', 1910, 73],
      ['Egypt', 'EGY', 'Egypt', 1921, 78], ['Algeria', 'ALG', 'Algeria', 1962, 79],
      ['Nigeria', 'NGA', 'Nigeria', 1945, 80], ['Ghana', 'GHA', 'Ghana', 1957, 78],
      ['Cameroon', 'CMR', 'Cameroon', 1959, 77], ['Ivory Coast', 'CIV', 'Ivory Coast', 1960, 79],
      ['Tunisia', 'TUN', 'Tunisia', 1957, 76], ['Mali', 'MLI', 'Mali', 1960, 76],
      ['South Africa', 'RSA', 'South Africa', 1991, 74], ['DR Congo', 'COD', 'DR Congo', 1919, 75],
      ['Romania', 'ROU', 'Romania', 1909, 77], ['Hungary', 'HUN', 'Hungary', 1901, 77],
      ['Slovakia', 'SVK', 'Slovakia', 1938, 75], ['Slovenia', 'SVN', 'Slovenia', 1920, 75],
      ['Albania', 'ALB', 'Albania', 1930, 74], ['Georgia', 'GEO', 'Georgia', 1990, 75],
      ['Finland', 'FIN', 'Finland', 1907, 73], ['Iceland', 'ISL', 'Iceland', 1947, 73],
      ['Ireland', 'IRL', 'Ireland', 1921, 74], ['Northern Ireland', 'NIR', 'Northern Ireland', 1880, 72],
      ['Bosnia and Herzegovina', 'BIH', 'Bosnia and Herzegovina', 1992, 74], ['Montenegro', 'MNE', 'Montenegro', 1931, 72],
      ['North Macedonia', 'MKD', 'North Macedonia', 1949, 72], ['Bulgaria', 'BUL', 'Bulgaria', 1923, 72],
      ['Israel', 'ISR', 'Israel', 1928, 72], ['Iran', 'IRN', 'Iran', 1920, 78],
      ['Iraq', 'IRQ', 'Iraq', 1948, 72], ['Uzbekistan', 'UZB', 'Uzbekistan', 1946, 73],
      ['Jordan', 'JOR', 'Jordan', 1949, 71], ['Bahrain', 'BHR', 'Bahrain', 1957, 70],
      ['Oman', 'OMA', 'Oman', 1978, 70], ['Thailand', 'THA', 'Thailand', 1916, 69],
      ['Vietnam', 'VIE', 'Vietnam', 1962, 69], ['Indonesia', 'IDN', 'Indonesia', 1930, 68],
      ['Malaysia', 'MAS', 'Malaysia', 1933, 68], ['New Zealand', 'NZL', 'New Zealand', 1891, 70],
      ['Honduras', 'HON', 'Honduras', 1935, 70], ['El Salvador', 'SLV', 'El Salvador', 1935, 68],
      ['Guatemala', 'GUA', 'Guatemala', 1919, 68], ['Bolivia', 'BOL', 'Bolivia', 1925, 69],
      ['Haiti', 'HAI', 'Haiti', 1904, 68], ['Trinidad and Tobago', 'TRI', 'Trinidad and Tobago', 1908, 68],
      ['Armenia', 'ARM', 'Armenia', 1992, 69], ['Azerbaijan', 'AZE', 'Azerbaijan', 1992, 68],
      ['Kazakhstan', 'KAZ', 'Kazakhstan', 1992, 68], ['Cyprus', 'CYP', 'Cyprus', 1934, 68],
      ['Estonia', 'EST', 'Estonia', 1921, 67], ['Latvia', 'LVA', 'Latvia', 1921, 67],
      ['Lithuania', 'LTU', 'Lithuania', 1922, 67], ['Luxembourg', 'LUX', 'Luxembourg', 1908, 67],
      ['Kosovo', 'KOS', 'Kosovo', 1946, 69], ['Moldova', 'MDA', 'Moldova', 1990, 66],
      ['Belarus', 'BLR', 'Belarus', 1989, 68], ['Russia', 'RUS', 'Russia', 1912, 76],
      ['Syria', 'SYR', 'Syria', 1936, 68], ['Lebanon', 'LBN', 'Lebanon', 1933, 67],
      ['Kuwait', 'KUW', 'Kuwait', 1952, 67], ['Palestine', 'PLE', 'Palestine', 1928, 67],
      ['Angola', 'ANG', 'Angola', 1979, 70], ['Zambia', 'ZAM', 'Zambia', 1929, 70],
      ['Zimbabwe', 'ZIM', 'Zimbabwe', 1965, 68], ['Kenya', 'KEN', 'Kenya', 1960, 67],
      ['Uganda', 'UGA', 'Uganda', 1924, 67], ['Tanzania', 'TAN', 'Tanzania', 1930, 66],
      ['Guinea', 'GUI', 'Guinea', 1960, 71], ['Burkina Faso', 'BFA', 'Burkina Faso', 1960, 72],
      ['Gabon', 'GAB', 'Gabon', 1962, 70], ['Cape Verde', 'CPV', 'Cape Verde', 1982, 72],
      ['Mozambique', 'MOZ', 'Mozambique', 1976, 67], ['Madagascar', 'MAD', 'Madagascar', 1961, 67],
      ['Benin', 'BEN', 'Benin', 1962, 67], ['Togo', 'TOG', 'Togo', 1960, 67],
      ['Nicaragua', 'NCA', 'Nicaragua', 1931, 66], ['Dominican Republic', 'DOM', 'Dominican Republic', 1953, 66],
      ['Cuba', 'CUB', 'Cuba', 1924, 66], ['Philippines', 'PHI', 'Philippines', 1907, 66],
      ['Singapore', 'SIN', 'Singapore', 1892, 66], ['India', 'IND', 'India', 1937, 66],
      ['Hong Kong', 'HKG', 'Hong Kong', 1914, 65], ['Chinese Taipei', 'TPE', 'Chinese Taipei', 1924, 65],
      ['Mongolia', 'MNG', 'Mongolia', 1959, 64], ['Myanmar', 'MYA', 'Myanmar', 1947, 64],
      ['Cambodia', 'CAM', 'Cambodia', 1933, 63], ['Laos', 'LAO', 'Laos', 1951, 63],
      ['Pakistan', 'PAK', 'Pakistan', 1947, 63], ['Bangladesh', 'BAN', 'Bangladesh', 1972, 63],
      ['Nepal', 'NEP', 'Nepal', 1951, 62], ['Sri Lanka', 'SRI', 'Sri Lanka', 1939, 62]
    ];
    const selectedCountries = this.normalizeCountries(countries);
    const filteredTeams = nationalTeams.filter(([name, , country]) => this.countryMatches(String(country || name), selectedCountries));
    const selectedTeams = filteredTeams.length > 0 ? filteredTeams : nationalTeams;

    return selectedTeams.slice(0, teamCount).map(([name, code, country, founded, strength], index) => ({
      team: { id: 9000 + index, name, code, country, founded, strength, logo: null },
      players: []
    }));
  }

  async getRandomTeams(count: number, countries?: string[]) {
    const fallbackTeams = [
      ['Real Madrid', 'RMD', 'Spain', 1902, 98], ['Manchester City', 'MCI', 'England', 1880, 98],
      ['Bayern Munich', 'BAY', 'Germany', 1900, 97], ['Inter Milan', 'INT', 'Italy', 1908, 96],
      ['Liverpool', 'LIV', 'England', 1892, 96], ['Barcelona', 'BAR', 'Spain', 1899, 95],
      ['Arsenal', 'ARS', 'England', 1886, 95], ['Paris Saint-Germain', 'PSG', 'France', 1970, 95],
      ['Atletico Madrid', 'ATM', 'Spain', 1903, 94], ['Juventus', 'JUV', 'Italy', 1897, 93],
      ['Borussia Dortmund', 'BVB', 'Germany', 1909, 92], ['AC Milan', 'MIL', 'Italy', 1899, 92],
      ['Bayer Leverkusen', 'LEV', 'Germany', 1904, 92], ['Napoli', 'NAP', 'Italy', 1926, 91],
      ['Chelsea', 'CHE', 'England', 1905, 90], ['Tottenham Hotspur', 'TOT', 'England', 1882, 90],
      ['Benfica', 'BEN', 'Portugal', 1904, 89], ['Porto', 'POR', 'Portugal', 1893, 88],
      ['Sporting CP', 'SCP', 'Portugal', 1906, 88], ['Ajax', 'AJA', 'Netherlands', 1900, 87],
      ['PSV Eindhoven', 'PSV', 'Netherlands', 1913, 87], ['Feyenoord', 'FEY', 'Netherlands', 1908, 86],
      ['Galatasaray', 'GAL', 'Turkey', 1905, 85], ['Fenerbahce', 'FEN', 'Turkey', 1907, 84],
      ['Flamengo', 'FLA', 'Brazil', 1895, 84], ['Palmeiras', 'PAL', 'Brazil', 1914, 84],
      ['River Plate', 'RIV', 'Argentina', 1901, 83], ['Boca Juniors', 'BOC', 'Argentina', 1905, 83],
      ['Al-Hilal', 'HIL', 'Saudi Arabia', 1957, 82], ['Al-Nassr', 'NAS', 'Saudi Arabia', 1955, 82],
      ['Club America', 'AME', 'Mexico', 1916, 80], ['Los Angeles FC', 'LAF', 'USA', 2014, 79],
      ['Inter Miami', 'MIA', 'USA', 2018, 79], ['Urawa Red Diamonds', 'URA', 'Japan', 1950, 77],
      ['Celtic', 'CEL', 'Scotland', 1887, 82], ['Rangers', 'RAN', 'Scotland', 1872, 81],
      ['RB Leipzig', 'RBL', 'Germany', 2009, 89], ['Roma', 'ROM', 'Italy', 1927, 88],
      ['Lazio', 'LAZ', 'Italy', 1900, 86], ['Sevilla', 'SEV', 'Spain', 1890, 85],
      ['Athletic Club', 'ATH', 'Spain', 1898, 85], ['Real Sociedad', 'RSO', 'Spain', 1909, 84],
      ['Marseille', 'MAR', 'France', 1899, 86], ['Lyon', 'LYO', 'France', 1950, 84],
      ['Monaco', 'MON', 'France', 1924, 84], ['Lille', 'LIL', 'France', 1944, 83],
      ['Sao Paulo', 'SAO', 'Brazil', 1930, 82], ['Corinthians', 'COR', 'Brazil', 1910, 82],
      ['Fluminense', 'FLU', 'Brazil', 1902, 82], ['Botafogo', 'BOT', 'Brazil', 1904, 81],
      ['Racing Club', 'RAC', 'Argentina', 1903, 80], ['Independiente', 'IND', 'Argentina', 1905, 80],
      ['Cruz Azul', 'CAZ', 'Mexico', 1927, 78], ['Tigres UANL', 'TIG', 'Mexico', 1960, 78],
      ['Monterrey', 'MTY', 'Mexico', 1945, 78], ['Seattle Sounders', 'SEA', 'USA', 2007, 77],
      ['LA Galaxy', 'LAG', 'USA', 1994, 77], ['Yokohama F. Marinos', 'YFM', 'Japan', 1972, 76],
      ['Kawasaki Frontale', 'KAW', 'Japan', 1955, 76], ['Vissel Kobe', 'VIS', 'Japan', 1966, 76],
      ['Club Brugge', 'BRU', 'Belgium', 1891, 79], ['Anderlecht', 'AND', 'Belgium', 1908, 78],
      ['Red Bull Salzburg', 'RBS', 'Austria', 1933, 80], ['Rapid Wien', 'RAP', 'Austria', 1899, 76],
      ['Young Boys', 'YB', 'Switzerland', 1898, 78], ['Basel', 'BAS', 'Switzerland', 1893, 77],
      ['Olympiacos', 'OLY', 'Greece', 1925, 78], ['Panathinaikos', 'PAN', 'Greece', 1908, 76],
      ['FC Copenhagen', 'FCK', 'Denmark', 1992, 77], ['Midtjylland', 'MID', 'Denmark', 1999, 75],
      ['Malmo FF', 'MAL', 'Sweden', 1910, 76], ['AIK', 'AIK', 'Sweden', 1891, 74],
      ['Rosenborg', 'ROS', 'Norway', 1917, 75], ['Bodo/Glimt', 'BOD', 'Norway', 1916, 76],
      ['Dinamo Zagreb', 'DZA', 'Croatia', 1911, 77], ['Hajduk Split', 'HAJ', 'Croatia', 1911, 74],
      ['Sparta Prague', 'SPA', 'Czech Republic', 1893, 76], ['Slavia Prague', 'SLP', 'Czech Republic', 1892, 76],
      ['Shakhtar Donetsk', 'SHA', 'Ukraine', 1936, 80], ['Dynamo Kyiv', 'DKY', 'Ukraine', 1927, 78],
      ['Shanghai Port', 'SHP', 'China', 2005, 73], ['Shandong Taishan', 'SDT', 'China', 1993, 72],
      ['Ulsan HD', 'ULS', 'South Korea', 1983, 75], ['Jeonbuk Hyundai Motors', 'JEO', 'South Korea', 1994, 74],
      ['Melbourne City', 'MCY', 'Australia', 2009, 72], ['Sydney FC', 'SYD', 'Australia', 2004, 72],
      ['Al-Duhail', 'DUH', 'Qatar', 2009, 75], ['Al-Sadd', 'SAD', 'Qatar', 1969, 75],
      ['Al-Ain', 'AIN', 'United Arab Emirates', 1968, 74], ['Shabab Al-Ahli', 'SHA', 'United Arab Emirates', 1958, 73],
      ['Atletico Nacional', 'NAC', 'Colombia', 1947, 75], ['Millonarios', 'MIL', 'Colombia', 1946, 74],
      ['Penarol', 'PEN', 'Uruguay', 1891, 75], ['Nacional', 'NAU', 'Uruguay', 1899, 75],
      ['Colo-Colo', 'COL', 'Chile', 1925, 74], ['Universidad Catolica', 'CAT', 'Chile', 1937, 73]
    ];

    const selectedCountries = this.normalizeCountries(countries);
    const filteredTeams = fallbackTeams.filter(([, , country]) => this.countryMatches(String(country), selectedCountries));
    const selectedFallbackTeams = filteredTeams.length > 0 ? filteredTeams : fallbackTeams;
    return selectedFallbackTeams.slice(0, count).map(([name, code, country, founded, strength], index) => ({
      team: { id: 1000 + index, name, code, country, founded, strength },
      players: []
    }));
  }
}

export default new FootballAPIService();
