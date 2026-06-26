import { useEffect, useState } from 'react';
import type React from 'react';
import { Team } from '../types';
import { unCountryCodeMap } from '../data/unCountries';
import { useI18n } from '../contexts/I18nContext';
import type { Language } from '../contexts/I18nContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const countryCodeMap: Record<string, string> = {
  ...unCountryCodeMap,
  Argentina: 'ar',
  Australia: 'au',
  Austria: 'at',
  Belgium: 'be',
  Bolivia: 'bo',
  'Bosnia and Herzegovina': 'ba',
  Brazil: 'br',
  Bulgaria: 'bg',
  Cameroon: 'cm',
  Canada: 'ca',
  'Cape Verde': 'cv',
  Chile: 'cl',
  China: 'cn',
  Colombia: 'co',
  'Costa Rica': 'cr',
  Croatia: 'hr',
  Cuba: 'cu',
  Cyprus: 'cy',
  'Czech Republic': 'cz',
  Denmark: 'dk',
  Ecuador: 'ec',
  Egypt: 'eg',
  England: 'gb-eng',
  Finland: 'fi',
  France: 'fr',
  Germany: 'de',
  Ghana: 'gh',
  Greece: 'gr',
  Honduras: 'hn',
  Hungary: 'hu',
  Iceland: 'is',
  India: 'in',
  Indonesia: 'id',
  Iran: 'ir',
  Iraq: 'iq',
  Ireland: 'ie',
  Israel: 'il',
  Italy: 'it',
  Jamaica: 'jm',
  Japan: 'jp',
  Jordan: 'jo',
  Mexico: 'mx',
  Morocco: 'ma',
  Netherlands: 'nl',
  'New Zealand': 'nz',
  Nigeria: 'ng',
  'Northern Ireland': 'gb-nir',
  Norway: 'no',
  Panama: 'pa',
  Paraguay: 'py',
  Peru: 'pe',
  Poland: 'pl',
  Portugal: 'pt',
  Qatar: 'qa',
  'Saudi Arabia': 'sa',
  Senegal: 'sn',
  Serbia: 'rs',
  Scotland: 'gb-sct',
  Singapore: 'sg',
  Slovakia: 'sk',
  Slovenia: 'si',
  'South Africa': 'za',
  'South Korea': 'kr',
  Spain: 'es',
  Sweden: 'se',
  Switzerland: 'ch',
  Thailand: 'th',
  Tunisia: 'tn',
  Turkey: 'tr',
  Ukraine: 'ua',
  Uruguay: 'uy',
  USA: 'us',
  'United Arab Emirates': 'ae',
  Venezuela: 've',
  Vietnam: 'vn',
  Wales: 'gb-wls'
};

const normalizeCountry = (country?: string) => String(country || '').trim();

export const getCountryFlagUrl = (country?: string) => {
  const normalized = normalizeCountry(country);
  const code = countryCodeMap[normalized];
  return code ? `https://flagcdn.com/w40/${code}.png` : undefined;
};

const getProxiedImageUrl = (url?: string) => url ? `${API_BASE_URL}/assets/image?url=${encodeURIComponent(url)}` : undefined;

const RemoteImage: React.FC<{ src?: string; alt: string; title?: string; className: string; fallbackClassName: string; fallbackSrc?: string }> = ({ src, alt, title, className, fallbackClassName, fallbackSrc }) => {
  const [failed, setFailed] = useState(false);
  const [useDirectSource, setUseDirectSource] = useState(false);
  const effectiveSrc = !src || failed ? fallbackSrc : src;
  const proxiedSrc = getProxiedImageUrl(effectiveSrc);

  useEffect(() => {
    setFailed(false);
    setUseDirectSource(false);
  }, [src, fallbackSrc]);

  if (!effectiveSrc) return <span className={fallbackClassName} title={title || alt} />;

  return (
    <img
      src={useDirectSource ? effectiveSrc : proxiedSrc}
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
  if (!team?.logo) return null;
  return <RemoteImage src={team.logo} alt={`${team?.name || 'Team'} crest`} title={team?.name || 'No crest'} className={`${className} inline-block object-contain rounded-full bg-white border border-gray-200`} fallbackClassName={`${className} inline-flex rounded-full bg-gray-100 border border-gray-300`} />;
};

const containsCjk = (value?: string) => /[\u3400-\u9fff]/.test(value || '');

export const getTeamDisplayName = (
  team?: Pick<Team, 'name' | 'country' | 'logo'>,
  language: Language = 'zh',
  fallback?: string
) => {
  const defaultFallback = language === 'en' ? 'TBD' : '待定';
  if (!team?.name) return fallback || defaultFallback;
  if (language === 'en' && team.country && containsCjk(team.name)) return team.country;
  return team.name;
};

export const TeamNameWithFlag: React.FC<{ team?: Pick<Team, 'name' | 'country' | 'logo'>; className?: string; flagClassName?: string; logoClassName?: string; fallback?: string }> = ({ team, className = '', flagClassName, logoClassName, fallback }) => {
  const { language } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <TeamFlag team={team} className={flagClassName} />
      <TeamLogo team={team} className={logoClassName} />
      <span className="truncate">{getTeamDisplayName(team, language, fallback)}</span>
    </span>
  );
};
