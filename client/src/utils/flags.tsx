import type React from 'react';
import { Team } from '../types';

const countryCodeMap: Record<string, string> = {
  Argentina: 'ar',
  Australia: 'au',
  Austria: 'at',
  Belgium: 'be',
  Brazil: 'br',
  Chile: 'cl',
  China: 'cn',
  Colombia: 'co',
  Croatia: 'hr',
  'Czech Republic': 'cz',
  Denmark: 'dk',
  England: 'gb-eng',
  France: 'fr',
  Germany: 'de',
  Greece: 'gr',
  Italy: 'it',
  Japan: 'jp',
  Mexico: 'mx',
  Netherlands: 'nl',
  Norway: 'no',
  Portugal: 'pt',
  Qatar: 'qa',
  'Saudi Arabia': 'sa',
  Scotland: 'gb-sct',
  'South Korea': 'kr',
  Spain: 'es',
  Sweden: 'se',
  Switzerland: 'ch',
  Turkey: 'tr',
  Ukraine: 'ua',
  Uruguay: 'uy',
  USA: 'us',
  'United Arab Emirates': 'ae',
  Wales: 'gb-wls'
};

const normalizeCountry = (country?: string) => String(country || '').trim();

export const getCountryFlagUrl = (country?: string) => {
  const normalized = normalizeCountry(country);
  const code = countryCodeMap[normalized];
  return code ? `https://flagcdn.com/w40/${code}.png` : undefined;
};

export const TeamFlag: React.FC<{ team?: Pick<Team, 'country' | 'name'>; className?: string }> = ({ team, className = 'w-5 h-4' }) => {
  const flagUrl = getCountryFlagUrl(team?.country);
  if (!flagUrl) return <span className={`${className} inline-flex rounded-sm bg-gray-200 border border-gray-300`} title={team?.country || 'Unknown'} />;
  return <img src={flagUrl} alt={`${team?.country || team?.name || 'Team'} flag`} title={team?.country} className={`${className} inline-block rounded-sm object-cover border border-gray-200`} loading="lazy" />;
};

export const TeamLogo: React.FC<{ team?: Pick<Team, 'logo' | 'name'>; className?: string }> = ({ team, className = 'w-5 h-5' }) => {
  if (!team?.logo) return <span className={`${className} inline-flex rounded-full bg-gray-100 border border-gray-300`} title="No crest" />;
  return <img src={team.logo} alt={`${team.name || 'Team'} crest`} title={team.name} className={`${className} inline-block object-contain rounded-full bg-white border border-gray-200`} loading="lazy" />;
};

export const TeamNameWithFlag: React.FC<{ team?: Pick<Team, 'name' | 'country' | 'logo'>; className?: string; flagClassName?: string; logoClassName?: string; fallback?: string }> = ({ team, className = '', flagClassName, logoClassName, fallback = '待定' }) => (
  <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
    <TeamFlag team={team} className={flagClassName} />
    <TeamLogo team={team} className={logoClassName} />
    <span className="truncate">{team?.name || fallback}</span>
  </span>
);
