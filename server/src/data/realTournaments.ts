export type RealTournamentTemplateId = 'fifa_world_cup_2026';

export type RealTournamentTeam = {
  name: string;
  code: string;
  country: string;
  groupName: string;
  strength: number;
};

export type RealTournamentMatch = {
  groupName: string;
  round: number;
  home: string;
  away: string;
  date: string;
  venue: string;
};

export type RealTournamentBracketMatch = {
  bracketStage: string;
  bracketSlot: string;
  round: number;
  homeSlot: string;
  awaySlot: string;
  date: string;
  venue: string;
};

export type RealTournamentTemplate = {
  id: RealTournamentTemplateId;
  name: string;
  description: string;
  teamCount: number;
  groupSize: number;
  teams: RealTournamentTeam[];
  matches: RealTournamentMatch[];
  bracket: RealTournamentBracketMatch[];
};

const teamStrength: Record<string, number> = {
  Argentina: 98, France: 97, Spain: 96, England: 95, Brazil: 95, Portugal: 94,
  Netherlands: 93, Germany: 93, Italy: 92, Belgium: 90, Croatia: 89, Uruguay: 88,
  Colombia: 87, Mexico: 86, USA: 85, Switzerland: 85, Denmark: 84, Austria: 83,
  Turkey: 83, Japan: 83, 'South Korea': 82, Morocco: 82, Senegal: 81, Serbia: 81,
  Ukraine: 81, Poland: 80, Sweden: 80, Norway: 80, Nigeria: 80, 'Ivory Coast': 79,
  Ecuador: 79, Algeria: 79, Scotland: 79, 'Czech Republic': 79, Ghana: 78, Australia: 77,
  Tunisia: 76, 'Saudi Arabia': 76, Qatar: 76, 'South Africa': 76, Paraguay: 76,
  Egypt: 78, Iran: 78, Panama: 73, Haiti: 68, 'Cape Verde': 72, Iraq: 72,
  Jordan: 71, Uzbekistan: 73, 'Democratic Republic of the Congo': 75, 'New Zealand': 70,
  'Bosnia and Herzegovina': 74, Curacao: 68
};

const team = (groupName: string, name: string, code: string, country = name): RealTournamentTeam => ({
  groupName,
  name,
  code,
  country,
  strength: teamStrength[country] || teamStrength[name] || 70
});

export const fifaWorldCup2026Template: RealTournamentTemplate = {
  id: 'fifa_world_cup_2026',
  name: '2026 美加墨世界杯',
  description: '按 2026 FIFA World Cup 官方分组与小组赛日程创建。',
  teamCount: 48,
  groupSize: 4,
  teams: [
    team('A组', 'Mexico', 'MEX'), team('A组', 'South Africa', 'RSA'), team('A组', 'South Korea', 'KOR'), team('A组', 'Czechia', 'CZE', 'Czech Republic'),
    team('B组', 'Canada', 'CAN'), team('B组', 'Bosnia and Herzegovina', 'BIH'), team('B组', 'Qatar', 'QAT'), team('B组', 'Switzerland', 'SUI'),
    team('C组', 'Brazil', 'BRA'), team('C组', 'Morocco', 'MAR'), team('C组', 'Haiti', 'HAI'), team('C组', 'Scotland', 'SCO'),
    team('D组', 'USA', 'USA'), team('D组', 'Paraguay', 'PAR'), team('D组', 'Australia', 'AUS'), team('D组', 'Turkey', 'TUR'),
    team('E组', 'Germany', 'GER'), team('E组', 'Curacao', 'CUW'), team('E组', 'Ivory Coast', 'CIV'), team('E组', 'Ecuador', 'ECU'),
    team('F组', 'Netherlands', 'NED'), team('F组', 'Japan', 'JPN'), team('F组', 'Sweden', 'SWE'), team('F组', 'Tunisia', 'TUN'),
    team('G组', 'Belgium', 'BEL'), team('G组', 'Egypt', 'EGY'), team('G组', 'Iran', 'IRN'), team('G组', 'New Zealand', 'NZL'),
    team('H组', 'Spain', 'ESP'), team('H组', 'Cape Verde', 'CPV'), team('H组', 'Saudi Arabia', 'KSA'), team('H组', 'Uruguay', 'URU'),
    team('I组', 'France', 'FRA'), team('I组', 'Senegal', 'SEN'), team('I组', 'Iraq', 'IRQ'), team('I组', 'Norway', 'NOR'),
    team('J组', 'Argentina', 'ARG'), team('J组', 'Algeria', 'ALG'), team('J组', 'Austria', 'AUT'), team('J组', 'Jordan', 'JOR'),
    team('K组', 'Portugal', 'POR'), team('K组', 'Congo DR', 'COD', 'Democratic Republic of the Congo'), team('K组', 'Uzbekistan', 'UZB'), team('K组', 'Colombia', 'COL'),
    team('L组', 'England', 'ENG'), team('L组', 'Croatia', 'CRO'), team('L组', 'Ghana', 'GHA'), team('L组', 'Panama', 'PAN')
  ],
  matches: [
    { groupName: 'A组', round: 1, home: 'Mexico', away: 'South Africa', date: '2026-06-11T20:00:00Z', venue: 'Mexico City Stadium' },
    { groupName: 'A组', round: 1, home: 'South Korea', away: 'Czechia', date: '2026-06-11T23:00:00Z', venue: 'Estadio Guadalajara' },
    { groupName: 'B组', round: 1, home: 'Canada', away: 'Bosnia and Herzegovina', date: '2026-06-12T20:00:00Z', venue: 'Toronto Stadium' },
    { groupName: 'D组', round: 1, home: 'USA', away: 'Paraguay', date: '2026-06-12T23:00:00Z', venue: 'Los Angeles Stadium' },
    { groupName: 'C组', round: 1, home: 'Haiti', away: 'Scotland', date: '2026-06-13T18:00:00Z', venue: 'Boston Stadium' },
    { groupName: 'D组', round: 1, home: 'Australia', away: 'Turkey', date: '2026-06-13T20:00:00Z', venue: 'BC Place Vancouver' },
    { groupName: 'C组', round: 1, home: 'Brazil', away: 'Morocco', date: '2026-06-13T23:00:00Z', venue: 'New York New Jersey Stadium' },
    { groupName: 'B组', round: 1, home: 'Qatar', away: 'Switzerland', date: '2026-06-13T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
    { groupName: 'E组', round: 1, home: 'Ivory Coast', away: 'Ecuador', date: '2026-06-14T18:00:00Z', venue: 'Philadelphia Stadium' },
    { groupName: 'E组', round: 1, home: 'Germany', away: 'Curacao', date: '2026-06-14T20:00:00Z', venue: 'Houston Stadium' },
    { groupName: 'F组', round: 1, home: 'Netherlands', away: 'Japan', date: '2026-06-14T22:00:00Z', venue: 'Dallas Stadium' },
    { groupName: 'F组', round: 1, home: 'Sweden', away: 'Tunisia', date: '2026-06-14T23:00:00Z', venue: 'Estadio Monterrey' },
    { groupName: 'H组', round: 1, home: 'Saudi Arabia', away: 'Uruguay', date: '2026-06-15T18:00:00Z', venue: 'Miami Stadium' },
    { groupName: 'H组', round: 1, home: 'Spain', away: 'Cape Verde', date: '2026-06-15T20:00:00Z', venue: 'Atlanta Stadium' },
    { groupName: 'G组', round: 1, home: 'Iran', away: 'New Zealand', date: '2026-06-15T22:00:00Z', venue: 'Los Angeles Stadium' },
    { groupName: 'G组', round: 1, home: 'Belgium', away: 'Egypt', date: '2026-06-15T23:00:00Z', venue: 'Seattle Stadium' },
    { groupName: 'I组', round: 1, home: 'France', away: 'Senegal', date: '2026-06-16T18:00:00Z', venue: 'New York New Jersey Stadium' },
    { groupName: 'I组', round: 1, home: 'Iraq', away: 'Norway', date: '2026-06-16T20:00:00Z', venue: 'Boston Stadium' },
    { groupName: 'J组', round: 1, home: 'Argentina', away: 'Algeria', date: '2026-06-16T22:00:00Z', venue: 'Kansas City Stadium' },
    { groupName: 'J组', round: 1, home: 'Austria', away: 'Jordan', date: '2026-06-16T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
    { groupName: 'L组', round: 1, home: 'Ghana', away: 'Panama', date: '2026-06-17T18:00:00Z', venue: 'Toronto Stadium' },
    { groupName: 'L组', round: 1, home: 'England', away: 'Croatia', date: '2026-06-17T20:00:00Z', venue: 'Dallas Stadium' },
    { groupName: 'K组', round: 1, home: 'Portugal', away: 'Congo DR', date: '2026-06-17T22:00:00Z', venue: 'Houston Stadium' },
    { groupName: 'K组', round: 1, home: 'Uzbekistan', away: 'Colombia', date: '2026-06-17T23:00:00Z', venue: 'Mexico City Stadium' },
    { groupName: 'A组', round: 2, home: 'Czechia', away: 'South Africa', date: '2026-06-18T18:00:00Z', venue: 'Atlanta Stadium' },
    { groupName: 'B组', round: 2, home: 'Switzerland', away: 'Bosnia and Herzegovina', date: '2026-06-18T20:00:00Z', venue: 'Los Angeles Stadium' },
    { groupName: 'B组', round: 2, home: 'Canada', away: 'Qatar', date: '2026-06-18T22:00:00Z', venue: 'BC Place Vancouver' },
    { groupName: 'A组', round: 2, home: 'Mexico', away: 'South Korea', date: '2026-06-18T23:00:00Z', venue: 'Estadio Guadalajara' },
    { groupName: 'C组', round: 2, home: 'Brazil', away: 'Haiti', date: '2026-06-19T18:00:00Z', venue: 'Philadelphia Stadium' },
    { groupName: 'C组', round: 2, home: 'Scotland', away: 'Morocco', date: '2026-06-19T20:00:00Z', venue: 'Boston Stadium' },
    { groupName: 'D组', round: 2, home: 'Turkey', away: 'Paraguay', date: '2026-06-19T22:00:00Z', venue: 'San Francisco Bay Area Stadium' },
    { groupName: 'D组', round: 2, home: 'USA', away: 'Australia', date: '2026-06-19T23:00:00Z', venue: 'Seattle Stadium' },
    { groupName: 'E组', round: 2, home: 'Germany', away: 'Ivory Coast', date: '2026-06-20T18:00:00Z', venue: 'Toronto Stadium' },
    { groupName: 'E组', round: 2, home: 'Ecuador', away: 'Curacao', date: '2026-06-20T20:00:00Z', venue: 'Kansas City Stadium' },
    { groupName: 'F组', round: 2, home: 'Netherlands', away: 'Sweden', date: '2026-06-20T22:00:00Z', venue: 'Houston Stadium' },
    { groupName: 'F组', round: 2, home: 'Tunisia', away: 'Japan', date: '2026-06-20T23:00:00Z', venue: 'Estadio Monterrey' },
    { groupName: 'H组', round: 2, home: 'Uruguay', away: 'Cape Verde', date: '2026-06-21T18:00:00Z', venue: 'Miami Stadium' },
    { groupName: 'H组', round: 2, home: 'Spain', away: 'Saudi Arabia', date: '2026-06-21T20:00:00Z', venue: 'Atlanta Stadium' },
    { groupName: 'G组', round: 2, home: 'Belgium', away: 'Iran', date: '2026-06-21T22:00:00Z', venue: 'Los Angeles Stadium' },
    { groupName: 'G组', round: 2, home: 'New Zealand', away: 'Egypt', date: '2026-06-21T23:00:00Z', venue: 'BC Place Vancouver' },
    { groupName: 'I组', round: 2, home: 'Norway', away: 'Senegal', date: '2026-06-22T18:00:00Z', venue: 'New York New Jersey Stadium' },
    { groupName: 'I组', round: 2, home: 'France', away: 'Iraq', date: '2026-06-22T20:00:00Z', venue: 'Philadelphia Stadium' },
    { groupName: 'J组', round: 2, home: 'Argentina', away: 'Austria', date: '2026-06-22T22:00:00Z', venue: 'Dallas Stadium' },
    { groupName: 'J组', round: 2, home: 'Jordan', away: 'Algeria', date: '2026-06-22T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
    { groupName: 'L组', round: 2, home: 'England', away: 'Ghana', date: '2026-06-23T18:00:00Z', venue: 'Boston Stadium' },
    { groupName: 'L组', round: 2, home: 'Panama', away: 'Croatia', date: '2026-06-23T20:00:00Z', venue: 'Toronto Stadium' },
    { groupName: 'K组', round: 2, home: 'Portugal', away: 'Uzbekistan', date: '2026-06-23T22:00:00Z', venue: 'Houston Stadium' },
    { groupName: 'K组', round: 2, home: 'Colombia', away: 'Congo DR', date: '2026-06-23T23:00:00Z', venue: 'Estadio Guadalajara' },
    { groupName: 'C组', round: 3, home: 'Scotland', away: 'Brazil', date: '2026-06-24T18:00:00Z', venue: 'Miami Stadium' },
    { groupName: 'C组', round: 3, home: 'Morocco', away: 'Haiti', date: '2026-06-24T18:00:00Z', venue: 'Atlanta Stadium' },
    { groupName: 'B组', round: 3, home: 'Switzerland', away: 'Canada', date: '2026-06-24T21:00:00Z', venue: 'BC Place Vancouver' },
    { groupName: 'B组', round: 3, home: 'Bosnia and Herzegovina', away: 'Qatar', date: '2026-06-24T21:00:00Z', venue: 'Seattle Stadium' },
    { groupName: 'A组', round: 3, home: 'Czechia', away: 'Mexico', date: '2026-06-24T23:00:00Z', venue: 'Mexico City Stadium' },
    { groupName: 'A组', round: 3, home: 'South Africa', away: 'South Korea', date: '2026-06-24T23:00:00Z', venue: 'Estadio Monterrey' },
    { groupName: 'E组', round: 3, home: 'Curacao', away: 'Ivory Coast', date: '2026-06-25T18:00:00Z', venue: 'Philadelphia Stadium' },
    { groupName: 'E组', round: 3, home: 'Ecuador', away: 'Germany', date: '2026-06-25T18:00:00Z', venue: 'New York New Jersey Stadium' },
    { groupName: 'F组', round: 3, home: 'Japan', away: 'Sweden', date: '2026-06-25T21:00:00Z', venue: 'Dallas Stadium' },
    { groupName: 'F组', round: 3, home: 'Tunisia', away: 'Netherlands', date: '2026-06-25T21:00:00Z', venue: 'Kansas City Stadium' },
    { groupName: 'D组', round: 3, home: 'Turkey', away: 'USA', date: '2026-06-25T23:00:00Z', venue: 'Los Angeles Stadium' },
    { groupName: 'D组', round: 3, home: 'Paraguay', away: 'Australia', date: '2026-06-25T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
    { groupName: 'I组', round: 3, home: 'Norway', away: 'France', date: '2026-06-26T18:00:00Z', venue: 'Boston Stadium' },
    { groupName: 'I组', round: 3, home: 'Senegal', away: 'Iraq', date: '2026-06-26T18:00:00Z', venue: 'Toronto Stadium' },
    { groupName: 'G组', round: 3, home: 'Egypt', away: 'Iran', date: '2026-06-26T21:00:00Z', venue: 'Seattle Stadium' },
    { groupName: 'G组', round: 3, home: 'New Zealand', away: 'Belgium', date: '2026-06-26T21:00:00Z', venue: 'BC Place Vancouver' },
    { groupName: 'H组', round: 3, home: 'Cape Verde', away: 'Saudi Arabia', date: '2026-06-26T23:00:00Z', venue: 'Houston Stadium' },
    { groupName: 'H组', round: 3, home: 'Uruguay', away: 'Spain', date: '2026-06-26T23:00:00Z', venue: 'Estadio Guadalajara' },
    { groupName: 'L组', round: 3, home: 'Panama', away: 'England', date: '2026-06-27T18:00:00Z', venue: 'New York New Jersey Stadium' },
    { groupName: 'L组', round: 3, home: 'Croatia', away: 'Ghana', date: '2026-06-27T18:00:00Z', venue: 'Philadelphia Stadium' },
    { groupName: 'J组', round: 3, home: 'Algeria', away: 'Austria', date: '2026-06-27T21:00:00Z', venue: 'Kansas City Stadium' },
    { groupName: 'J组', round: 3, home: 'Jordan', away: 'Argentina', date: '2026-06-27T21:00:00Z', venue: 'Dallas Stadium' },
    { groupName: 'K组', round: 3, home: 'Colombia', away: 'Portugal', date: '2026-06-27T23:00:00Z', venue: 'Miami Stadium' },
    { groupName: 'K组', round: 3, home: 'Congo DR', away: 'Uzbekistan', date: '2026-06-27T23:00:00Z', venue: 'Atlanta Stadium' }
  ],
  bracket: [
    { bracketStage: '32强', bracketSlot: 'R32-1', round: 4, homeSlot: '1A', awaySlot: '3C/E/F/H/I', date: '2026-06-28T20:00:00Z', venue: 'Los Angeles Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-2', round: 4, homeSlot: '2A', awaySlot: '2B', date: '2026-06-28T23:00:00Z', venue: 'Mexico City Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-3', round: 4, homeSlot: '1K', awaySlot: '3A/B/D/E/F', date: '2026-06-29T20:00:00Z', venue: 'Houston Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-4', round: 4, homeSlot: '1C', awaySlot: '2F', date: '2026-06-29T23:00:00Z', venue: 'New York New Jersey Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-5', round: 4, homeSlot: '1E', awaySlot: '3A/B/C/D/F', date: '2026-06-30T20:00:00Z', venue: 'Dallas Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-6', round: 4, homeSlot: '1I', awaySlot: '3C/D/F/G/H', date: '2026-06-30T23:00:00Z', venue: 'Boston Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-7', round: 4, homeSlot: '1G', awaySlot: '3A/E/H/I/J', date: '2026-07-01T20:00:00Z', venue: 'Seattle Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-8', round: 4, homeSlot: '1D', awaySlot: '3B/E/F/I/J', date: '2026-07-01T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-9', round: 4, homeSlot: '1B', awaySlot: '3E/F/G/I/J', date: '2026-07-02T20:00:00Z', venue: 'Toronto Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-10', round: 4, homeSlot: '2E', awaySlot: '2I', date: '2026-07-02T23:00:00Z', venue: 'Atlanta Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-11', round: 4, homeSlot: '1F', awaySlot: '2C', date: '2026-07-03T20:00:00Z', venue: 'Kansas City Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-12', round: 4, homeSlot: '1H', awaySlot: '2J', date: '2026-07-03T23:00:00Z', venue: 'Miami Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-13', round: 4, homeSlot: '1J', awaySlot: '2H', date: '2026-07-03T23:00:00Z', venue: 'Vancouver Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-14', round: 4, homeSlot: '1L', awaySlot: '2K', date: '2026-07-02T23:00:00Z', venue: 'Philadelphia Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-15', round: 4, homeSlot: '1B/1D/1G/1K/1L', awaySlot: '3A/C/H/I/J', date: '2026-07-01T23:00:00Z', venue: 'Monterrey Stadium' },
    { bracketStage: '32强', bracketSlot: 'R32-16', round: 4, homeSlot: '2D', awaySlot: '2G', date: '2026-06-30T23:00:00Z', venue: 'Guadalajara Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-1', round: 5, homeSlot: 'W R32-1', awaySlot: 'W R32-2', date: '2026-07-04T20:00:00Z', venue: 'Philadelphia Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-2', round: 5, homeSlot: 'W R32-3', awaySlot: 'W R32-4', date: '2026-07-04T23:00:00Z', venue: 'Houston Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-3', round: 5, homeSlot: 'W R32-5', awaySlot: 'W R32-6', date: '2026-07-05T20:00:00Z', venue: 'New York New Jersey Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-4', round: 5, homeSlot: 'W R32-7', awaySlot: 'W R32-8', date: '2026-07-05T23:00:00Z', venue: 'Mexico City Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-5', round: 5, homeSlot: 'W R32-9', awaySlot: 'W R32-10', date: '2026-07-06T20:00:00Z', venue: 'Dallas Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-6', round: 5, homeSlot: 'W R32-11', awaySlot: 'W R32-12', date: '2026-07-06T23:00:00Z', venue: 'Seattle Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-7', round: 5, homeSlot: 'W R32-13', awaySlot: 'W R32-14', date: '2026-07-07T20:00:00Z', venue: 'Atlanta Stadium' },
    { bracketStage: '16强', bracketSlot: 'R16-8', round: 5, homeSlot: 'W R32-15', awaySlot: 'W R32-16', date: '2026-07-07T23:00:00Z', venue: 'Vancouver Stadium' },
    { bracketStage: '四分之一决赛', bracketSlot: 'QF-1', round: 6, homeSlot: 'W R16-1', awaySlot: 'W R16-2', date: '2026-07-09T23:00:00Z', venue: 'Boston Stadium' },
    { bracketStage: '四分之一决赛', bracketSlot: 'QF-2', round: 6, homeSlot: 'W R16-3', awaySlot: 'W R16-4', date: '2026-07-10T23:00:00Z', venue: 'Los Angeles Stadium' },
    { bracketStage: '四分之一决赛', bracketSlot: 'QF-3', round: 6, homeSlot: 'W R16-5', awaySlot: 'W R16-6', date: '2026-07-11T20:00:00Z', venue: 'Miami Stadium' },
    { bracketStage: '四分之一决赛', bracketSlot: 'QF-4', round: 6, homeSlot: 'W R16-7', awaySlot: 'W R16-8', date: '2026-07-11T23:00:00Z', venue: 'Kansas City Stadium' },
    { bracketStage: '半决赛', bracketSlot: 'SF-1', round: 7, homeSlot: 'W QF-1', awaySlot: 'W QF-2', date: '2026-07-14T23:00:00Z', venue: 'Dallas Stadium' },
    { bracketStage: '半决赛', bracketSlot: 'SF-2', round: 7, homeSlot: 'W QF-3', awaySlot: 'W QF-4', date: '2026-07-15T23:00:00Z', venue: 'Atlanta Stadium' },
    { bracketStage: '三四名决赛', bracketSlot: 'TP-1', round: 8, homeSlot: 'L SF-1', awaySlot: 'L SF-2', date: '2026-07-18T23:00:00Z', venue: 'Miami Stadium' },
    { bracketStage: '决赛', bracketSlot: 'F-1', round: 9, homeSlot: 'W SF-1', awaySlot: 'W SF-2', date: '2026-07-19T23:00:00Z', venue: 'New York New Jersey Stadium' }
  ]
};

export const realTournamentTemplates: Record<RealTournamentTemplateId, RealTournamentTemplate> = {
  fifa_world_cup_2026: fifaWorldCup2026Template
};
