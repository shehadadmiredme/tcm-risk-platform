/**
 * lib/riskService.js —— 药方风险分析引擎（规则版 MVP）
 *
 * 数据来源：
 *   data/yaocai_data.json           《中国药典》药材基础信息
 *   data/herb_classical_stats.json  古籍方剂剂量统计
 *   data/tcm_formula.db             古籍方剂/成分明细
 *   data/risk_records.db            每次分析判定记录
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FORMULA_DB = path.join(DATA_DIR, 'tcm_formula.db');
const RECORD_DB = path.join(DATA_DIR, 'risk_records.db');

let herbs = null;
let herbByName = null;
let classicalStats = null;
let formulaDb = null;
let recordDb = null;

const ALIASES = {
  附子: ['附子', '制附子', '炮附子', '黑顺片', '白附片', '盐附子', '熟附子'],
  川乌: ['川乌', '制川乌'],
  草乌: ['草乌', '制草乌'],
  半夏: ['半夏', '法半夏', '姜半夏', '清半夏', '生半夏', '制半夏'],
  贝母: ['贝母', '川贝母', '浙贝母', '平贝母', '伊贝母', '湖北贝母'],
  瓜蒌: ['瓜蒌', '栝楼', '瓜蒌皮', '瓜蒌仁', '全瓜蒌'],
  天花粉: ['天花粉', '栝楼根', '花粉'],
  甘草: ['甘草', '炙甘草', '生甘草', '粉甘草'],
  苦杏仁: ['苦杏仁', '杏仁', '炒苦杏仁', '燀苦杏仁'],
  麻黄: ['麻黄', '蜜麻黄', '炙麻黄'],
  石膏: ['石膏', '生石膏'],
  生姜: ['生姜', '鲜生姜'],
  大枣: ['大枣', '红枣'],
  桂枝: ['桂枝', '嫩桂枝'],
  山药: ['山药', '怀山药', '淮山药', '淮山', '薯蓣'],
  茯苓: ['茯苓', '云苓', '白茯苓', '赤茯苓'],
  牡丹皮: ['牡丹皮', '丹皮', '粉丹皮'],
  枸杞子: ['枸杞子', '枸杞', '杞子'],
  金银花: ['金银花', '银花', '双花', '二花'],
  黄芪: ['黄芪', '北芪', '绵黄芪', '生黄芪', '炙黄芪', '黄耆'],
  川芎: ['川芎', '芎藭', '芎'],
  陈皮: ['陈皮', '陈橘皮', '橘皮'],
  青皮: ['青皮', '青橘皮'],
  荆芥: ['荆芥', '荆芥穗'],
  僵蚕: ['僵蚕', '白僵蚕'],
  天南星: ['天南星', '南星'],
  升麻: ['升麻', '川升麻'],
  香附: ['香附', '香附子'],
  葛根: ['葛根', '干葛'],
  朱砂: ['朱砂', '丹砂', '辰砂'],
  石菖蒲: ['石菖蒲', '菖蒲'],
  小茴香: ['小茴香', '茴香'],
  蒺藜: ['蒺藜', '白蒺藜'],
  花椒: ['花椒', '川椒', '蜀椒'],
  桑白皮: ['桑白皮', '桑根白皮'],
  水牛角: ['水牛角', '犀角', '犀角屑'],
  山茱萸: ['山茱萸', '山萸肉', '枣皮'],
  薏苡仁: ['薏苡仁', '薏米', '苡仁', '薏仁'],
  酸枣仁: ['酸枣仁', '枣仁', '炒枣仁'],
  生地黄: ['生地黄', '生地', '干地黄', '生干地黄'],
  熟地黄: ['熟地黄', '熟地', '熟干地黄'],
  麦冬: ['麦冬', '寸冬', '麦门冬'],
  天冬: ['天冬', '天门冬'],
  栀子: ['栀子', '山栀子', '山栀', '炒栀子'],
  蝉蜕: ['蝉蜕', '蝉衣', '净蝉衣'],
  何首乌: ['何首乌', '首乌', '制何首乌'],
  淫羊藿: ['淫羊藿', '仙灵脾'],
  广藿香: ['广藿香', '藿香'],
  墨旱莲: ['墨旱莲', '旱莲草'],
  首乌藤: ['首乌藤', '夜交藤'],
  龟甲: ['龟甲', '龟板', '炙龟板'],
  牛蒡子: ['牛蒡子', '大力子', '牛子'],
  延胡索: ['延胡索', '元胡', '玄胡'],
  大黄: ['大黄', '川军', '生大黄', '制大黄', '川大黄'],
  厚朴: ['厚朴', '川朴', '制厚朴'],
  全蝎: ['全蝎', '全虫', '蝎子'],
  甘遂: ['甘遂', '醋甘遂'],
  大戟: ['大戟', '红大戟', '京大戟'],
  海藻: ['海藻'],
  芫花: ['芫花', '醋芫花'],
  藜芦: ['藜芦'],
  人参: ['人参', '生晒参', '红参', '白参', '野山参'],
  沙参: ['南沙参', '北沙参', '沙参'],
  丹参: ['丹参'],
  玄参: ['玄参', '元参', '黑玄参'],
  苦参: ['苦参'],
  细辛: ['细辛'],
  芍药: ['白芍', '赤芍', '白芍药', '赤芍药'],
  白蔹: ['白蔹'],
  白及: ['白及', '白芨'],
  芒硝: ['芒硝', '朴硝', '玄明粉', '风化硝'],
  硫黄: ['硫黄', '硫磺'],
  狼毒: ['狼毒'],
  密陀僧: ['密陀僧'],
  巴豆: ['巴豆', '巴豆霜'],
  牵牛子: ['牵牛子', '黑丑', '白丑'],
  丁香: ['丁香', '公丁香', '母丁香'],
  郁金: ['郁金'],
  三棱: ['三棱', '醋三棱'],
  官桂: ['肉桂', '官桂', '桂心'],
  石脂: ['赤石脂', '白石脂'],
  五灵脂: ['五灵脂']
};

const GROUP_TO_PH = {
  芍药: '白芍',
  官桂: '肉桂',
  乌头: '附子',
  犀角: '水牛角',
  石脂: '赤石脂',
  牙硝: '芒硝',
  贝母: '川贝母'
};

const COMPAT_GROUPS = {
  甘草: ['甘草', '炙甘草', '生甘草', '粉甘草'],
  甘遂: ['甘遂', '醋甘遂'],
  大戟: ['大戟', '红大戟', '京大戟'],
  海藻: ['海藻'],
  芫花: ['芫花', '醋芫花'],
  乌头: ['附子', '制附子', '炮附子', '川乌', '制川乌', '草乌', '制草乌', '黑顺片', '白附片'],
  半夏: ['半夏', '法半夏', '姜半夏', '清半夏', '生半夏', '制半夏'],
  瓜蒌: ['瓜蒌', '栝楼', '瓜蒌皮', '瓜蒌仁', '全瓜蒌'],
  贝母: ['贝母', '川贝母', '浙贝母', '平贝母', '伊贝母', '湖北贝母'],
  天花粉: ['天花粉', '栝楼根'],
  白蔹: ['白蔹'],
  白及: ['白及', '白芨'],
  藜芦: ['藜芦'],
  人参: ['人参', '生晒参', '红参', '白参', '野山参'],
  沙参: ['南沙参', '北沙参', '沙参'],
  丹参: ['丹参'],
  玄参: ['玄参'],
  苦参: ['苦参'],
  细辛: ['细辛'],
  芍药: ['白芍', '赤芍', '白芍药', '赤芍药'],
  硫黄: ['硫黄', '硫磺'],
  芒硝: ['芒硝', '朴硝', '玄明粉', '风化硝'],
  狼毒: ['狼毒'],
  密陀僧: ['密陀僧'],
  巴豆: ['巴豆', '巴豆霜'],
  牵牛子: ['牵牛子', '黑丑', '白丑'],
  丁香: ['丁香', '公丁香', '母丁香'],
  郁金: ['郁金'],
  三棱: ['三棱', '醋三棱'],
  官桂: ['肉桂', '官桂', '桂心'],
  石脂: ['赤石脂', '白石脂'],
  五灵脂: ['五灵脂'],
  犀角: ['犀角', '水牛角'],
  牙硝: ['牙硝', '马牙硝']
};

const COMPAT_RULES = [
  { code: 'sb_gancao_gansui', name: '甘草反甘遂', a: '甘草', b: '甘遂', severity: 'high', source: '十八反' },
  { code: 'sb_gancao_daji', name: '甘草反大戟', a: '甘草', b: '大戟', severity: 'high', source: '十八反' },
  { code: 'sb_gancao_haizao', name: '甘草反海藻', a: '甘草', b: '海藻', severity: 'high', source: '十八反' },
  { code: 'sb_gancao_yuanhua', name: '甘草反芫花', a: '甘草', b: '芫花', severity: 'high', source: '十八反' },
  { code: 'sb_wutou_banxia', name: '乌头反半夏', a: '乌头', b: '半夏', severity: 'high', source: '十八反' },
  { code: 'sb_wutou_gualou', name: '乌头反瓜蒌', a: '乌头', b: '瓜蒌', severity: 'high', source: '十八反' },
  { code: 'sb_wutou_beimu', name: '乌头反贝母', a: '乌头', b: '贝母', severity: 'high', source: '十八反' },
  { code: 'sb_wutou_bailian', name: '乌头反白蔹', a: '乌头', b: '白蔹', severity: 'high', source: '十八反' },
  { code: 'sb_wutou_baiji', name: '乌头反白及', a: '乌头', b: '白及', severity: 'high', source: '十八反' },
  { code: 'sb_wutou_tianhuafen', name: '乌头反天花粉', a: '乌头', b: '天花粉', severity: 'high', source: '十八反' },
  { code: 'sb_lilu_rencan', name: '藜芦反人参', a: '藜芦', b: '人参', severity: 'high', source: '十八反' },
  { code: 'sb_lilu_shacan', name: '藜芦反沙参', a: '藜芦', b: '沙参', severity: 'high', source: '十八反' },
  { code: 'sb_lilu_dancan', name: '藜芦反丹参', a: '藜芦', b: '丹参', severity: 'high', source: '十八反' },
  { code: 'sb_lilu_xuancan', name: '藜芦反玄参', a: '藜芦', b: '玄参', severity: 'high', source: '十八反' },
  { code: 'sb_lilu_kucan', name: '藜芦反苦参', a: '藜芦', b: '苦参', severity: 'high', source: '十八反' },
  { code: 'sb_lilu_xixin', name: '藜芦反细辛', a: '藜芦', b: '细辛', severity: 'high', source: '十八反' },
  { code: 'sb_lilu_shaoyao', name: '藜芦反芍药', a: '藜芦', b: '芍药', severity: 'high', source: '十八反' },
  { code: 'sw_liuhuang_mangxiao', name: '硫黄畏芒硝', a: '硫黄', b: '芒硝', severity: 'high', source: '十九畏' },
  { code: 'sw_langdu_mituoseng', name: '狼毒畏密陀僧', a: '狼毒', b: '密陀僧', severity: 'high', source: '十九畏' },
  { code: 'sw_badou_qianniuzi', name: '巴豆畏牵牛子', a: '巴豆', b: '牵牛子', severity: 'high', source: '十九畏' },
  { code: 'sw_dingxiang_yujin', name: '丁香畏郁金', a: '丁香', b: '郁金', severity: 'high', source: '十九畏' },
  { code: 'sw_wutou_xijiao', name: '川乌草乌畏犀角', a: '乌头', b: '犀角', severity: 'medium', source: '十九畏（现代常以水牛角代用，建议谨慎）' },
  { code: 'sw_yaxiao_sanleng', name: '牙硝畏三棱', a: '牙硝', b: '三棱', severity: 'high', source: '十九畏' },
  { code: 'sw_guangui_shizhi', name: '官桂畏石脂', a: '官桂', b: '石脂', severity: 'high', source: '十九畏' },
  { code: 'sw_rencan_wulingzhi', name: '人参畏五灵脂', a: '人参', b: '五灵脂', severity: 'high', source: '十九畏' }
];

const UNIT_TO_G = { 克: 1, g: 1, G: 1, 两: 30, 钱: 3, 分: 0.3, 斤: 500 };

function normalizeNum(s) {
  return Number(String(s).replace('．', '.').replace(/[０-９]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
  }));
}

function chineseToNumber(s) {
  if (!s) return null;
  const digits = { '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  const units = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of String(s)) {
    if (digits[ch] !== undefined) {
      num = digits[ch];
    } else if (units[ch] !== undefined) {
      if (ch === '万') {
        total = (total + section + (num || 1)) * 10000;
        section = 0;
        num = 0;
      } else {
        section += (num || 1) * units[ch];
        num = 0;
      }
    } else {
      return null;
    }
  }
  return total + section + num;
}

// 剂量段正则：阿拉伯/中文数量 + 单位 + 可选「半」。
// 数字部分不含「两」，让「两」始终作为单位，从而支持复合剂量（一两一钱、1两1钱）。
const DOSE_RE = /([0-9]+(?:\.[0-9]+)?|[一二三四五六七八九十百千万]+)\s*(克|g|G|两|钱|分|斤)(半)?/g;

/**
 * 剂量文本 → 克。支持单剂量与复合剂量：
 *   一两 → 30g；一钱 → 3g；一两半 → 45g；
 *   一两一钱 → 33g；1两1钱 → 33g；两钱五分 → 7.5g
 */
function doseTextToGrams(text) {
  if (!text) return null;
  // 「两」后紧跟重量单位时为数字 2（如 两钱、两分），先替换为「二」再解析；
  // 而「一两」中「两」是单位，不在替换范围。
  const s = String(text).replace(/[０-９]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
  }).replace(/两(?=(钱|分|斤|克|g|G))/g, '二');
  DOSE_RE.lastIndex = 0;
  let grams = 0;
  let any = false;
  let m;
  while ((m = DOSE_RE.exec(s))) {
    const numStr = m[1];
    const unit = m[2];
    const half = m[3] === '半';
    let n;
    if (/[0-9]/.test(numStr)) {
      n = Number(numStr);
    } else {
      n = chineseToNumber(numStr);
      if (n === null) return null;
    }
    if (!UNIT_TO_G[unit]) return null;
    grams += n * UNIT_TO_G[unit];
    if (half) grams += UNIT_TO_G[unit] * 0.5;
    any = true;
  }
  return any ? grams : null;
}

function convertDoseText(text) {
  return doseTextToGrams(text);
}

function parseDosageRange(text) {
  if (!text) return { minG: null, maxG: null, unit: null };
  const t = String(text).replace(/[０-９]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
  });
  const m = t.match(/(\d+(?:\.\d+)?)\s*[〜～~\-–至]\s*(\d+(?:\.\d+)?)\s*(克|g|G|两|钱|分|斤)/);
  if (m && UNIT_TO_G[m[3]]) {
    return { minG: Number(m[1]) * UNIT_TO_G[m[3]], maxG: Number(m[2]) * UNIT_TO_G[m[3]], unit: m[3] };
  }
  const single = t.match(/(\d+(?:\.\d+)?)\s*(克|g|G|两|钱|分|斤)/);
  if (single && UNIT_TO_G[single[2]]) {
    return { minG: Number(single[1]) * UNIT_TO_G[single[2]], maxG: Number(single[1]) * UNIT_TO_G[single[2]], unit: single[2] };
  }
  return { minG: null, maxG: null, unit: null };
}

function parseToxicity(property, caution) {
  const text = (property || '') + '；' + (caution || '');
  if (/大毒/.test(text)) return '大毒';
  if (/有毒/.test(text)) return '有毒';
  if (/小毒/.test(text)) return '小毒';
  return '无';
}

function extractPopulationCaution(text) {
  const out = [];
  const clauses = String(text || '').split(/[。；;]/);
  const populations = [
    '孕妇', '哺乳期', '儿童', '小儿', '婴幼儿', '老人', '年老', '体虚',
    '虚弱者', '体弱者', '气虚', '血虚', '阴虚', '阳虚', '脾胃虚寒',
    '脾虚', '便溏', '过敏体质', '高血压', '糖尿病', '心脏病', '肝肾功能不全', '实热', '发热'
  ];
  clauses.forEach(function (clause) {
    populations.forEach(function (pop) {
      if (clause.indexOf(pop) === -1) return;
      const high = /禁用|忌服|忌用|勿服|不可服|不可用|切忌/.test(clause);
      const mid = /慎用|慎服|不宜|少用/.test(clause);
      if (!high && !mid) return;
      const code = 'pop_' + pop;
      const raw = clause.trim();
      if (!out.some(function (x) { return x.code === code && x.raw === raw; })) {
        out.push({
          code: code,
          name: pop + '禁忌',
          population: pop,
          severity: high ? 'high' : 'medium',
          raw: raw
        });
      }
    });
  });
  return out;
}

function loadHerbs() {
  if (herbs) return herbs;
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'yaocai_data.json'), 'utf8'));
  herbs = raw.map(function (item) {
    const property = item['性味与归经'] || '';
    const dosageText = item['用法与用量'] || '';
    const range = parseDosageRange(dosageText);
    return {
      name: item['药材名称'] || '',
      property: property,
      indications: item['功能与主治'] || '',
      dosageText: dosageText,
      minG: range.minG,
      maxG: range.maxG,
      caution: item['注意'] || '',
      plainCaution: item['禁忌通俗化处理'] || '',
      toxicity: parseToxicity(property, item['注意'] || '')
    };
  });
  herbByName = {};
  herbs.forEach(function (h) { if (h.name) herbByName[h.name] = h; });
  return herbs;
}

function loadClassicalStats() {
  if (classicalStats) return classicalStats;
  try {
    classicalStats = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'herb_classical_stats.json'), 'utf8'));
  } catch (e) {
    classicalStats = {};
  }
  return classicalStats;
}

function getFormulaDb() {
  if (formulaDb) return formulaDb;
  formulaDb = new DatabaseSync(FORMULA_DB, { readOnly: true });
  return formulaDb;
}

function getRecordDb() {
  if (recordDb) return recordDb;
  recordDb = new DatabaseSync(RECORD_DB);
  recordDb.exec(
    'CREATE TABLE IF NOT EXISTS risk_analysis_record (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'created_at TEXT NOT NULL,' +
    'input_text TEXT NOT NULL,' +
    'overall_risk TEXT NOT NULL,' +
    'overall_score REAL NOT NULL,' +
    'summary TEXT NOT NULL,' +
    'result_json TEXT NOT NULL' +
    ');' +
    'CREATE TABLE IF NOT EXISTS risk_rule_hit (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'record_id INTEGER NOT NULL,' +
    'rule_code TEXT,' +
    'rule_name TEXT,' +
    'severity TEXT,' +
    'herb_name TEXT,' +
    'combo TEXT,' +
    'message TEXT,' +
    'evidence TEXT,' +
    'source TEXT' +
    ');'
  );
  return recordDb;
}

function resolveAlias(rawName) {
  const name = String(rawName || '').trim();
  if (!name) return null;
  if (herbByName[name]) return name;
  for (const canonical of Object.keys(ALIASES)) {
    for (const a of ALIASES[canonical]) {
      if (name === a || name.indexOf(a) === 0) {
        if (herbByName[canonical]) return canonical;
        if (GROUP_TO_PH[canonical]) return GROUP_TO_PH[canonical];
        return null;
      }
    }
  }
  return null;
}

function groupsForName(name) {
  const groups = [];
  for (const group of Object.keys(COMPAT_GROUPS)) {
    for (const alias of COMPAT_GROUPS[group]) {
      if (name === alias || name.indexOf(alias) === 0) {
        groups.push(group);
        break;
      }
    }
  }
  return groups;
}

function extractDose(line) {
  const s = String(line);
  // 与 doseTextToGrams 一致的「两」作数字 2 处理（同长替换，index 对齐原文本）
  const s2 = s.replace(/两(?=(钱|分|斤|克|g|G))/g, '二');
  DOSE_RE.lastIndex = 0;
  const segs = [];
  let m;
  while ((m = DOSE_RE.exec(s2))) segs.push(m);
  if (segs.length) {
    const grams = doseTextToGrams(segs.map(function (x) { return x[0]; }).join(''));
    if (grams !== null) {
      const start = segs[0].index;
      const end = segs[segs.length - 1].index + segs[segs.length - 1][0].length;
      return { text: s.slice(start, end), valueG: grams };
    }
  }
  // 非重量单位（枚/片/粒/丸等）：单段匹配，仅提取文本，不做克换算
  const nonWeight = s.match(
    /([0-9]+(?:\.[0-9]+)?|[一二两三四五六七八九十百千万]+)\s*(枚|个|片|粒|丸|锭|团|束|把|根|枝|条|块|段|只|头|对|付|帖|剂|盏|杯|碗|匙|捻|撮|挺|寸|尺|丈|层|钟|盂|桶|驮|擘|服|具|脚|株|张|页|尾|掬)/
  );
  if (nonWeight) return { text: nonWeight[0], valueG: null };
  return null;
}

function parseHerbs(text) {
  return String(text || '')
    .split(/[\n,，、;；]+/)
    .map(function (line) {
      const dose = extractDose(line);
      const desc = line.match(/(如[^，。；\s]{1,12}大|大如[^，。；\s]{1,12}|各等分|等分|少许|适量|不拘多少)/);
      let name = line;
      if (dose) name = name.replace(dose.text, '');
      if (desc) name = name.replace(desc[0], '');
      name = name.replace(/[（(][^）)]*[)）]/g, '').replace(/[：:\s]/g, '').trim();
      const canonical = resolveAlias(name);
      return {
        raw: line.trim(),
        name: name,
        canonicalName: canonical || name,
        matched: !!canonical,
        doseText: dose ? dose.text : (desc ? desc[0] : ''),
        doseG: dose ? dose.valueG : null,
        groups: groupsForName(name)
      };
    })
    .filter(function (item) {
      if (!item.name) return false;
      if (item.matched) return true;
      if (/[《》]/.test(item.raw)) return false;
      return !/(汤|散|丸|丹|膏|饮|煎|酒|锭|茶|片|胶囊|颗粒)$/.test(item.name);
    });
}

function severityWeight(sev) {
  if (sev === 'high') return 100;
  if (sev === 'medium') return 40;
  if (sev === 'low') return 10;
  return 0;
}

function getClassicalStatsForHerb(h) {
  const stats = loadClassicalStats();
  if (stats[h.canonicalName]) return stats[h.canonicalName];
  if (stats[h.name]) return stats[h.name];
  const aliases = ALIASES[h.canonicalName];
  if (aliases) {
    for (const a of aliases) {
      if (stats[a]) return stats[a];
    }
  }
  return null;
}



function findSimilarFormulas(herbs) {
  const names = [];
  herbs.forEach(function (h) {
    [h.name, h.canonicalName].forEach(function (n) {
      if (n && names.indexOf(n) === -1) names.push(n);
    });
    const aliases = ALIASES[h.canonicalName];
    if (aliases) {
      aliases.forEach(function (a) {
        if (names.indexOf(a) === -1) names.push(a);
      });
    }
  });
  if (!names.length) return { summary: '未匹配到可检索的药材。', matches: [] };
  const db = getFormulaDb();
  const placeholders = names.map(function () { return '?'; }).join(',');
  const rows = db.prepare(
    'SELECT f.id, f.name, f.source_text, COUNT(DISTINCT i.herb_name) AS overlap ' +
    'FROM formula f JOIN formula_ingredient i ON i.formula_id=f.id ' +
    'WHERE i.herb_name IN (' + placeholders + ') ' +
    'GROUP BY f.id ORDER BY overlap DESC, f.id LIMIT 6'
  ).all(...names);
  const matches = rows.map(function (r) {
    return Object.assign({}, r, { herbCount: herbs.length });
  });
  const summary = matches.length
    ? '数据库中找到 ' + matches.length + ' 条部分相似方剂，最多重合 ' + matches[0].overlap + '/' + herbs.length + ' 味。'
    : '未找到部分相似方剂。';
  return { summary: summary, matches: matches };
}

function analyzePrescription(text) {
  const inputText = String(text || '').trim();
  if (!inputText) throw new Error('请输入药方成分');
  loadHerbs();
  const parsed = parseHerbs(inputText);
  const findings = [];
  const herbRisks = [];
  const userGroupSet = {};

  parsed.forEach(function (h) {
    h.groups.forEach(function (g) { userGroupSet[g] = true; });
    const risk = {
      input: h.raw,
      name: h.name,
      canonicalName: h.canonicalName,
      matched: h.matched,
      doseText: h.doseText,
      doseG: h.doseG,
      toxicity: null,
      dosageRange: null,
      caution: '',
      findings: []
    };
    if (h.matched) {
      const ph = herbByName[h.canonicalName];
      if (ph) {
        risk.toxicity = ph.toxicity;
        risk.dosageRange = { minG: ph.minG, maxG: ph.maxG, text: ph.dosageText };
        risk.caution = ph.caution;
        if (ph.toxicity !== '无') {
          const sev = ph.toxicity === '小毒' ? 'medium' : 'high';
          risk.findings.push({
            code: 'tox_' + ph.toxicity,
            name: '含' + ph.toxicity,
            severity: sev,
            message: '药典记载本品' + ph.toxicity + '，需严格控制剂量与炮制方式。',
            source: '《中国药典》'
          });
        }
        if (h.doseG !== null && ph.maxG !== null) {
          if (h.doseG > ph.maxG * 2) {
            const doseSev = ph.toxicity !== '无' ? 'high' : 'medium';
            risk.findings.push({
              code: 'dose_over_2x',
              name: '超药典上限2倍以上',
              severity: doseSev,
              message: '输入剂量 ' + h.doseText + '，超过药典常用上限 ' + ph.maxG + 'g 的 2 倍。',
              source: '《中国药典》'
            });
          } else if (h.doseG > ph.maxG) {
            risk.findings.push({
              code: 'dose_over',
              name: '超过药典常用上限',
              severity: 'medium',
              message: '输入剂量 ' + h.doseText + '，高于药典常用上限 ' + ph.maxG + 'g。',
              source: '《中国药典》'
            });
          } else if (h.doseG < ph.minG * 0.5) {
            risk.findings.push({
              code: 'dose_under',
              name: '低于药典常用下限',
              severity: 'low',
              message: '输入剂量 ' + h.doseText + '，低于药典常用下限 ' + ph.minG + 'g 的一半。',
              source: '《中国药典》'
            });
          } else {
            risk.findings.push({
              code: 'dose_ok',
              name: '剂量在药典常用范围',
              severity: 'info',
              message: '输入剂量在药典常用范围内。',
              source: '《中国药典》'
            });
          }
        }
        if (/孕妇禁用|孕妇忌服|妊娠禁用/.test(ph.caution)) {
          risk.findings.push({
            code: 'preg_forbidden',
            name: '孕妇禁用',
            severity: 'high',
            message: '若用户为孕妇，本品禁用。',
            source: '《中国药典》'
          });
        } else if (/孕妇慎用|妊娠慎用/.test(ph.caution)) {
          risk.findings.push({
            code: 'preg_caution',
            name: '孕妇慎用',
            severity: 'medium',
            message: '若用户为孕妇，本品慎用，需医生指导。',
            source: '《中国药典》'
          });
        }
        extractPopulationCaution(ph.caution).concat(extractPopulationCaution(ph.plainCaution)).forEach(function (pop) {
          if (/孕妇/.test(pop.population)) return;
          const dup = risk.findings.some(function (f) { return f.code === pop.code && f.name === pop.name; });
          if (dup) return;
          risk.findings.push({
            code: pop.code,
            name: pop.name,
            severity: pop.severity,
            message: '药典注意：' + pop.raw + '。',
            source: '《中国药典》'
          });
        });
        const badPair = ph.caution.match(/不宜与([^，。；;]+?)同用/);
        if (badPair) {
          const other = badPair[1].replace(/[、和及]/, '').trim();
          const hit = parsed.some(function (x) {
            return x.canonicalName.indexOf(other) !== -1 || other.indexOf(x.canonicalName) !== -1;
          });
          risk.findings.push({
            code: 'caution_pair',
            name: '药典注意：不宜与' + other + '同用',
            severity: hit ? 'high' : 'low',
            message: hit
              ? '药典注意提示本品不宜与' + other + '同用，当前药方中已出现该组合。'
              : '药典注意提示本品不宜与' + other + '同用，当前药方未识别到该药材。',
            source: '《中国药典》'
          });
        }
        if (!risk.findings.length) {
          risk.findings.push({
            code: 'herb_ok',
            name: '药典基础信息',
            severity: 'info',
            message: '已匹配药典药材，未发现明确高风险项。',
            source: '《中国药典》'
          });
        }
      }
    } else {
      risk.findings.push({
        code: 'herb_unmatched',
        name: '未匹配药典药材',
        severity: 'low',
        message: '未在《中国药典》药材表中匹配到该写法，无法进行药典剂量与毒性判断。',
        source: '药材名匹配'
      });
    }
    const cs = getClassicalStatsForHerb(h);
    if (cs && cs.count) {
      risk.classical = cs;
      if (h.doseG !== null && cs.p95 && h.doseG > cs.p95) {
        risk.findings.push({
          code: 'classical_over_p95',
          name: '高于古籍常见剂量上限',
          severity: 'medium',
          message: '输入剂量超过古籍统计 P95（' + cs.p95 + 'g），相对古典方剂明显上升。',
          source: '8.4万条古籍方剂统计'
        });
      }
    }
    herbRisks.push(risk);
    risk.findings.forEach(function (f) { findings.push(f); });
  });

  const compatibility = [];
  COMPAT_RULES.forEach(function (rule) {
    if (userGroupSet[rule.a] && userGroupSet[rule.b]) {
      const msg = '检出「' + rule.name + '」，属于' + rule.source + '，建议不要同用。';
      compatibility.push({
        code: rule.code,
        name: rule.name,
        severity: rule.severity,
        herbs: [rule.a, rule.b],
        message: msg,
        source: rule.source
      });
      findings.push({
        code: rule.code,
        name: rule.name,
        severity: rule.severity,
        herb: rule.a + ' + ' + rule.b,
        combo: rule.a + ' + ' + rule.b,
        message: msg,
        evidence: '十八反/十九畏',
        source: rule.source
      });
    }
  });

  let score = 0;
  let highCount = 0;
  let mediumCount = 0;
  findings.forEach(function (f) {
    score += severityWeight(f.severity);
    if (f.severity === 'high') highCount += 1;
    if (f.severity === 'medium') mediumCount += 1;
  });
  score = Math.min(100, Math.round(score / Math.max(parsed.length, 1)));
  const level = highCount > 0 || score >= 70 ? 'high' : (score >= 30 ? 'medium' : 'low');
  const levelName = level === 'high' ? '高风险' : (level === 'medium' ? '中风险' : '低风险');
  const summary = '检出高风险 ' + highCount + ' 项、中风险 ' + mediumCount + ' 项。';

  const similarFormulas = findSimilarFormulas(parsed);
  const result = {
    inputText: inputText,
    similarFormulas: similarFormulas,
    herbs: parsed,
    herbRisks: herbRisks,
    compatibility: compatibility,
    overall: { level: level, levelName: levelName, score: score, summary: summary },
    rules: findings
  };
  result.recordId = saveRecord(result);
  return result;
}

function saveRecord(result) {
  const db = getRecordDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO risk_analysis_record (created_at, input_text, overall_risk, overall_score, summary, result_json) ' +
    'VALUES (?, ?, ?, ?, ?, ?)'
  );
  const info = stmt.run(now, result.inputText, result.overall.level, result.overall.score, result.overall.summary, JSON.stringify(result));
  const recordId = Number(info.lastInsertRowid);
  const hitStmt = db.prepare(
    'INSERT INTO risk_rule_hit (record_id, rule_code, rule_name, severity, herb_name, combo, message, evidence, source) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  result.rules.forEach(function (f) {
    hitStmt.run(
      recordId,
      f.code || '',
      f.name || '',
      f.severity || '',
      f.herb || '',
      f.combo || '',
      f.message || '',
      f.evidence || '',
      f.source || ''
    );
  });
  return recordId;
}

function listRecords(limit) {
  const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const db = getRecordDb();
  return db.prepare(
    'SELECT id, created_at, input_text, overall_risk, overall_score, summary ' +
    'FROM risk_analysis_record ORDER BY id DESC LIMIT ?'
  ).all(n);
}

function getRecord(id) {
  const db = getRecordDb();
  const record = db.prepare('SELECT * FROM risk_analysis_record WHERE id = ?').get(Number(id));
  if (!record) return null;
  const hits = db.prepare('SELECT * FROM risk_rule_hit WHERE record_id = ? ORDER BY id').all(Number(id));
  return Object.assign({}, record, { hits: hits });
}

module.exports = {
  analyzePrescription: analyzePrescription,
  listRecords: listRecords,
  getRecord: getRecord
};
