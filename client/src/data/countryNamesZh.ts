export const countryNameZhMap: Record<string, string> = {
  Argentina: '阿根廷', France: '法国', Spain: '西班牙', England: '英格兰', Brazil: '巴西',
  Portugal: '葡萄牙', Netherlands: '荷兰', Germany: '德国', Italy: '意大利', Belgium: '比利时',
  Croatia: '克罗地亚', Uruguay: '乌拉圭', Colombia: '哥伦比亚', Mexico: '墨西哥', USA: '美国',
  Switzerland: '瑞士', Denmark: '丹麦', Austria: '奥地利', Turkey: '土耳其', Japan: '日本',
  'South Korea': '韩国', Morocco: '摩洛哥', Senegal: '塞内加尔', Serbia: '塞尔维亚',
  Ukraine: '乌克兰', Poland: '波兰', Sweden: '瑞典', Norway: '挪威', Nigeria: '尼日利亚',
  'Ivory Coast': '科特迪瓦', Ecuador: '厄瓜多尔', Algeria: '阿尔及利亚', Scotland: '苏格兰',
  'Czech Republic': '捷克', Czechia: '捷克', Ghana: '加纳', Australia: '澳大利亚',
  Tunisia: '突尼斯', 'Saudi Arabia': '沙特阿拉伯', Qatar: '卡塔尔', 'South Africa': '南非',
  Paraguay: '巴拉圭', Egypt: '埃及', Iran: '伊朗', Panama: '巴拿马', Haiti: '海地',
  'Cape Verde': '佛得角', Iraq: '伊拉克', Jordan: '约旦', Uzbekistan: '乌兹别克斯坦',
  'Democratic Republic of the Congo': '刚果民主共和国', 'Congo DR': '刚果民主共和国',
  'New Zealand': '新西兰', 'Bosnia and Herzegovina': '波黑', Curacao: '库拉索',
  Canada: '加拿大', China: '中国'
};

export const getCountryNameZh = (country: string) => countryNameZhMap[country] || country;
