import { useState } from 'react';
import type React from 'react';
import { Team } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

const getProxiedImageUrl = (url?: string) => url ? `${API_BASE_URL}/assets/image?url=${encodeURIComponent(url)}` : undefined;

const RemoteImage: React.FC<{ src?: string; alt: string; title?: string; className: string; fallbackClassName: string }> = ({ src, alt, title, className, fallbackClassName }) => {
  const [failed, setFailed] = useState(false);
  const [useDirectSource, setUseDirectSource] = useState(false);
  const proxiedSrc = getProxiedImageUrl(src);

  if (!src || failed) return <span className={fallbackClassName} title={title || alt} />;

  return (
    <img
      src={useDirectSource ? src : proxiedSrc}
      alt={alt}
      title={title}
      className={className}
      loading="lazy"
      onError={() => {
        if (!useDirectSource) setUseDirectSource(true);
        else setFailed(true);
      }}
    />
  );
};

export const TeamFlag: React.FC<{ team?: Pick<Team, 'country' | 'name'>; className?: string }> = ({ team, className = 'w-5 h-4' }) => {
  const flagUrl = getCountryFlagUrl(team?.country);
  return <RemoteImage src={flagUrl} alt={`${team?.country || team?.name || 'Team'} flag`} title={team?.country} className={`${className} inline-block rounded-sm object-cover border border-gray-200`} fallbackClassName={`${className} inline-flex rounded-sm bg-gray-200 border border-gray-300`} />;
};

export const TeamLogo: React.FC<{ team?: Pick<Team, 'logo' | 'name'>; className?: string }> = ({ team, className = 'w-5 h-5' }) => {
  return <RemoteImage src={team?.logo || undefined} alt={`${team?.name || 'Team'} crest`} title={team?.name || 'No crest'} className={`${className} inline-block object-contain rounded-full bg-white border border-gray-200`} fallbackClassName={`${className} inline-flex rounded-full bg-gray-100 border border-gray-300`} />;
};

export const TeamNameWithFlag: React.FC<{ team?: Pick<Team, 'name' | 'country' | 'logo'>; className?: string; flagClassName?: string; logoClassName?: string; fallback?: string }> = ({ team, className = '', flagClassName, logoClassName, fallback = '待定' }) => (
  <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
    <TeamFlag team={team} className={flagClassName} />
    <TeamLogo team={team} className={logoClassName} />
    <span className="truncate">{team?.name || fallback}</span>
  </span>
);
