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

const zhCountryNameToEn: Record<string, string> = {
  阿根廷: 'Argentina',
  法国: 'France',
  西班牙: 'Spain',
  英格兰: 'England',
  巴西: 'Brazil',
  葡萄牙: 'Portugal',
  荷兰: 'Netherlands',
  德国: 'Germany',
  意大利: 'Italy',
  比利时: 'Belgium',
  克罗地亚: 'Croatia',
  乌拉圭: 'Uruguay',
  哥伦比亚: 'Colombia',
  墨西哥: 'Mexico',
  美国: 'USA',
  瑞士: 'Switzerland',
  丹麦: 'Denmark',
  奥地利: 'Austria',
  土耳其: 'Turkey',
  日本: 'Japan',
  韩国: 'South Korea',
  摩洛哥: 'Morocco',
  塞内加尔: 'Senegal',
  塞尔维亚: 'Serbia',
  乌克兰: 'Ukraine',
  波兰: 'Poland',
  瑞典: 'Sweden',
  挪威: 'Norway',
  尼日利亚: 'Nigeria',
  科特迪瓦: 'Ivory Coast',
  厄瓜多尔: 'Ecuador',
  阿尔及利亚: 'Algeria',
  苏格兰: 'Scotland',
  捷克: 'Czech Republic',
  加纳: 'Ghana',
  澳大利亚: 'Australia',
  突尼斯: 'Tunisia',
  沙特阿拉伯: 'Saudi Arabia',
  沙特: 'Saudi Arabia',
  卡塔尔: 'Qatar',
  南非: 'South Africa',
  巴拉圭: 'Paraguay',
  埃及: 'Egypt',
  伊朗: 'Iran',
  巴拿马: 'Panama',
  海地: 'Haiti',
  佛得角: 'Cape Verde',
  伊拉克: 'Iraq',
  约旦: 'Jordan',
  乌兹别克斯坦: 'Uzbekistan',
  刚果民主共和国: 'Democratic Republic of the Congo',
  刚果金: 'Democratic Republic of the Congo',
  新西兰: 'New Zealand',
  波黑: 'Bosnia and Herzegovina',
  库拉索: 'Curacao',
  加拿大: 'Canada',
  中国: 'China'
};

const getEnglishCountryName = (value?: string) => {
  const normalized = String(value || '').trim();
  return zhCountryNameToEn[normalized] || normalized;
};

export const getTeamDisplayName = (
  team?: Pick<Team, 'name' | 'nameEn' | 'nameZh' | 'country' | 'logo'>,
  language: Language = 'zh',
  fallback?: string
) => {
  const defaultFallback = language === 'en' ? 'TBD' : '待定';
  if (!team?.name) return fallback || defaultFallback;
  if (language === 'en') {
    if (team.nameEn && !containsCjk(team.nameEn)) return team.nameEn;
    if (team.country) {
      const countryName = getEnglishCountryName(team.country);
      if (countryName && !containsCjk(countryName)) return countryName;
    }
    const name = getEnglishCountryName(team.name);
    if (name && !containsCjk(name)) return name;
  }
  if (language === 'zh' && team.nameZh) return team.nameZh;
  return team.name;
};

export const TeamNameWithFlag: React.FC<{ team?: Pick<Team, 'name' | 'nameEn' | 'nameZh' | 'country' | 'logo'>; className?: string; flagClassName?: string; logoClassName?: string; fallback?: string }> = ({ team, className = '', flagClassName, logoClassName, fallback }) => {
  const { language } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <TeamFlag team={team} className={flagClassName} />
      <TeamLogo team={team} className={logoClassName} />
      <span className="truncate">{getTeamDisplayName(team, language, fallback)}</span>
    </span>
  );
};
