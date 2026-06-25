import axios from 'axios';

interface Player {
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
  players: Player[];
}

class FootballAPIService {
  private client: any;
  private clientInitialized = false;

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
    try {
      const response = await this.initializeClient().get('/teams', {
        params: {
          league: leagueId,
          season: season
        }
      });
      return response.data.response;
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
    try {
      const response = await this.initializeClient().get('/players/squads', {
        params: {
          team: teamId
        }
      });

      if (response.data.response && response.data.response.length > 0) {
        return response.data.response[0] as TeamSquadResponse;
      }
      return null;
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Failed to fetch team squad:', error.message);
      }
      return null;
    }
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
  calculateTeamStrength(players: Player[]) {
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

      return this.dedupeTeams(uniqueTeams)
        .sort((a: any, b: any) => (b.team.strength || 0) - (a.team.strength || 0))
        .slice(0, teamCount);
    } catch (error) {
      console.error('Failed to fetch popular teams:', error);
      return this.getRandomTeams(teamCount, countries);
    }
  }

  // 获取随机球队（当API配额不足时的回退方案）
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
