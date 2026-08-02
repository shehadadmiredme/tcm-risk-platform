/**
 * scripts/build-graph.js —— 从 yaocai_data.json 构建知识图谱产物 data/graph.json
 *
 * 运行：npm run build:graph （数据变更后需重跑并提交产物）
 *
 * 提取关系：
 *  - 归经     ：药材 → 12 正经（性味与归经「归X经」）
 *  - 功效     ：药材 → 功效词（功能与主治 子串匹配，固化词表）
 *  - 主治症状 ：药材 → 症状（功能与主治「用于」段短语，全局计数≥4）
 *  - 配伍禁忌 ：药材 → 药材 / 药材 → 禁忌物（注意「不宜与X同用」及相反相畏）
 *  - 毒性     ：药材 → 有毒（性味/注意含 大毒/有毒/小毒）
 *
 * 节点 value = 入度（被多少药材连接），供前端 symbolSize 使用。
 * 产物 schema 与 ECharts graph 系列兼容，由 lib/jsonProvider 读取。
 */

const fs = require('fs');
const path = require('path');
const { normalizeText } = require('../lib/normalize');

const DATA_FILE = path.join(__dirname, '../data/yaocai_data.json');
const OUT_FILE = path.join(__dirname, '../data/graph.json');

/* ---------- 常量 ---------- */

// 12 正经集合（归经只保留这些）
const MERIDIANS = ['心', '肝', '脾', '肺', '肾', '胃', '胆', '小肠', '大肠', '膀胱', '三焦', '心包'];

// 功效词表：从数据统计的高频功效短语固化（长度≥3，避免「解毒」「止痛」等短词造成节点过密）
const EFFECTS = [
  '清热解毒', '疏散风热', '祛风除湿', '消肿止痛', '活血止痛', '行气止痛',
  '清热燥湿', '祛风止痛', '清热利湿', '散结消肿', '清热泻火', '凉血止血',
  '祛风湿', '利尿通淋', '补肝肾', '利水消肿', '补肾助阳', '理气止痛',
  '利尿消肿', '泻火解毒', '温中散寒', '凉血消斑', '利湿退黄', '解毒消肿',
  '化浊降脂', '活血化瘀', '清热润肺', '化痰止咳', '滋补肝肾', '散寒止痛',
  '通络止痛', '活血通经', '生津止渴', '祛风通络', '消肿散结', '舒筋活络',
  '涩肠止泻', '软坚散结', '燥湿化痰', '活血调经', '疏肝解郁', '补肾阳',
  '清热凉血', '益胃生津', '解表散寒', '温中止呕', '止咳平喘', '调经止痛',
  '清湿热', '清热化痰', '散瘀止痛', '清肝泻火', '疏肝理气', '利水渗湿',
  '降气化痰',
  // 补益类高频功效（提升人参/黄芪类覆盖）
  '大补元气', '复脉固脱', '补脾益肺', '生津养血', '安神益智', '健脾益气',
  '益气养阴', '滋阴润燥', '养阴生津', '平肝潜阳', '宁心安神', '收敛固涩',
  '固表止汗', '托毒生肌', '升阳举陷', '清虚热', '温肾助阳', '补气固表',
  '益气升阳', '润肠通便'
];
// 按长度降序，匹配时优先长词
EFFECTS.sort((a, b) => b.length - a.length);

// 配伍禁忌目标的 OCR 变体归并
const CONFLICT_ALIAS = {
  '制萆乌': '制草乌',
  '半里': '半夏',
  '堪乌': '草乌',
  '苹乌': '草乌'
};

const TOXIC_LEVELS = [
  ['大毒', 3],
  ['有毒', 2],
  ['小毒', 1]
];

const DATA_VERSION = '2026-08-02';

// 图谱中加入的精选方剂数量（从 8 万余方剂中选组成药材均为药典品种的代表方剂）
const FORMULA_LIMIT = 400;

/* ---------- 数据加载与归一化 ---------- */

const rawHerbs = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const herbs = rawHerbs.map((h) => {
  const out = {};
  for (const [k, v] of Object.entries(h)) out[k] = typeof v === 'string' ? normalizeText(v) : v;
  return out;
});
const herbNames = new Set(herbs.map((h) => h['药材名称']));

/* ---------- 提取函数 ---------- */

function extractMeridians(herb) {
  const t = herb['性味与归经'] || '';
  const m = t.match(/归([^。；;]+?)经/);
  if (!m) return [];
  return m[1]
    .split(/[、，,]/)
    .map((s) => s.trim())
    .filter((s) => MERIDIANS.includes(s));
}

function extractEffects(herb) {
  const t = herb['功能与主治'] || '';
  const hit = [];
  for (const w of EFFECTS) {
    if (t.includes(w)) {
      // 若已被更长的命中词包含则跳过
      if (!hit.some((h) => h.includes(w))) hit.push(w);
    }
  }
  return hit;
}

function extractSymptoms(herb) {
  const t = herb['功能与主治'] || '';
  const idx = t.indexOf('用于');
  if (idx < 0) return [];
  return t
    .slice(idx + 2)
    .split(/[，,、；;。]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function extractConflicts(herb) {
  const z = herb['注意'] || '';
  const targets = [];

  // 「不宜与X同用」
  const re1 = /不宜与([^，。；;、]+?)同用/g;
  let m;
  while ((m = re1.exec(z))) {
    for (const raw of m[1].split(/[、，,]/)) {
      const t = raw.trim();
      if (t) targets.push(CONFLICT_ALIAS[t] || t);
    }
  }

  // 「X相反」/「X相畏」
  const re2 = /([一-龥]{1,6})相[反畏]/g;
  while ((m = re2.exec(z))) {
    const t = m[1];
    if (t && !t.includes('不') && !t.includes('无')) targets.push(t);
  }

  return targets;
}

function getToxicLevel(herb) {
  const t = (herb['性味与归经'] || '') + (herb['注意'] || '');
  let level = 0;
  for (const [kw, lv] of TOXIC_LEVELS) if (t.includes(kw)) level = Math.max(level, lv);
  return level;
}

/* ---------- 构建 ---------- */

const nodeMap = new Map(); // id -> node
const edges = [];
const edgeSet = new Set();

function addNode(type, name, extra = {}) {
  const id = extra.id || `${type}:${name}`;
  if (!nodeMap.has(id)) {
    nodeMap.set(id, Object.assign({ id, name, type, value: 0 }, extra));
  }
  return id;
}

function addEdge(source, target, type) {
  const key = `${source}|${target}|${type}`;
  if (!edgeSet.has(key)) {
    edgeSet.add(key);
    edges.push({ source, target, type });
  }
}

// 先统计症状全局出现次数（决定哪些症状入图）
const symptomCount = {};
for (const h of herbs) {
  for (const s of extractSymptoms(h)) symptomCount[s] = (symptomCount[s] || 0) + 1;
}
const MIN_SYMPTOM_COUNT = 4; // 只保留出现≥4次的症状，控制图谱规模

// 药材节点 + 关系边
for (const h of herbs) {
  const name = h['药材名称'];
  const level = getToxicLevel(h);
  addNode('herb', name, { toxic: level > 0, toxicLevel: level });

  for (const mer of extractMeridians(h)) {
    addNode('meridian', mer);
    addEdge(`herb:${name}`, `meridian:${mer}`, '归经');
  }

  for (const eff of extractEffects(h)) {
    addNode('effect', eff);
    addEdge(`herb:${name}`, `effect:${eff}`, '功效');
  }

  for (const sym of extractSymptoms(h)) {
    if (symptomCount[sym] >= MIN_SYMPTOM_COUNT) {
      addNode('symptom', sym);
      addEdge(`herb:${name}`, `symptom:${sym}`, '主治');
    }
  }

  for (const target of extractConflicts(h)) {
    const targetId = herbNames.has(target) ? `herb:${target}` : `caution:${target}`;
    if (!herbNames.has(target)) addNode('caution', target);
    addEdge(`herb:${name}`, targetId, '配伍禁忌');
  }

  if (level > 0) {
    addNode('caution', '有毒');
    addEdge(`herb:${name}`, 'caution:有毒', '毒性');
  }
}

/* ---------- 方剂节点（精选代表方剂，组成药材均为药典品种） ---------- */

const { DatabaseSync } = require('node:sqlite');
const pdb = new DatabaseSync(path.join(__dirname, '../data/tcm_formula.db'), { readOnly: true });

// 药典药材名按首字符索引，加速正向匹配（处理「炒白术」「炙甘草」等炮制前缀）
const herbsByFirstChar = new Map();
for (const h of herbNames) {
  const ch = h[0];
  if (!herbsByFirstChar.has(ch)) herbsByFirstChar.set(ch, []);
  herbsByFirstChar.get(ch).push(h);
}
// 按长度降序，用于反向匹配（成分名是药典名的子串时兜底）
const herbNamesSorted = Array.from(herbNames).sort((a, b) => b.length - a.length);

// 古籍成分名 → 药典品种名的精确映射（歧义消解）。
// 反向包含匹配无法区分同长候选（「大戟」会命中「红大戟」），
// 古籍「大戟」多指大戟科京大戟，此处显式指定。
const HERB_ALIAS = {
  '大戟': '京大戟'
};

/** 返回 herb_name 匹配到的药典药材名，未匹配返回 null */
function matchFormulaHerb(hname) {
  // 正向：成分名包含药典药材名（古籍成分多为「药材+炮制前缀/用量后缀」）
  const cands = herbsByFirstChar.get(hname[0]);
  if (cands) {
    for (const h of cands) if (hname.includes(h)) return h;
  }
  // 别名精确映射（优先于反向兜底）
  const alias = HERB_ALIAS[hname];
  if (alias && herbNames.has(alias)) return alias;
  // 反向：药典药材名包含成分名
  if (hname.length >= 2) {
    for (const h of herbNamesSorted) {
      if (h.length >= 3 && h.includes(hname)) return h;
    }
  }
  return null;
}

const ingRows = pdb
  .prepare("SELECT formula_id, herb_name FROM formula_ingredient WHERE herb_name IS NOT NULL AND herb_name != ''")
  .all();

const formulaAll = new Map(); // formula_id -> [herb_name,...]
for (const r of ingRows) {
  if (!formulaAll.has(r.formula_id)) formulaAll.set(r.formula_id, []);
  formulaAll.get(r.formula_id).push(r.herb_name);
}

// 候选方剂：匹配到药典药材的占比 ≥50%，且匹配药材 3~20 味
const formulaCandidates = [];
for (const [fid, hnames] of formulaAll) {
  const matched = [];
  for (const h of hnames) {
    const m = matchFormulaHerb(h);
    if (m) matched.push(m);
  }
  const ms = new Set(matched);
  if (ms.size >= 3 && matched.length / hnames.length >= 0.5) {
    formulaCandidates.push({ fid, herbs: ms });
  }
}

// 1) 覆盖优先：保证数据库中存在方剂的每味药材至少关联一个方剂
//    （优先复用已选方剂，否则选匹配药材最少的方剂以控制规模）
const herbToCand = new Map();
for (const h of herbNames) herbToCand.set(h, []);
formulaCandidates.forEach((c, idx) => {
  for (const h of c.herbs) {
    const arr = herbToCand.get(h);
    if (arr) arr.push(idx);
  }
});
const pickedIdx = new Set();
for (const h of herbNames) {
  const idxs = herbToCand.get(h) || [];
  let chosen = -1;
  for (const idx of idxs) {
    if (pickedIdx.has(idx)) { chosen = idx; break; }
    if (chosen === -1 || formulaCandidates[idx].herbs.size < formulaCandidates[chosen].herbs.size) chosen = idx;
  }
  if (chosen !== -1) pickedIdx.add(chosen);
}
let selectedCandidates = Array.from(pickedIdx).map((i) => formulaCandidates[i]);

// 2) 剩余额度：按「组成药材流行度均值」补充常用药材组成的代表方剂
const remain = FORMULA_LIMIT - selectedCandidates.length;
if (remain > 0) {
  const herbFreq = {};
  for (const c of formulaCandidates) for (const h of c.herbs) herbFreq[h] = (herbFreq[h] || 0) + 1;
  const avgScore = (c) => Array.from(c.herbs).reduce((s, h) => s + (herbFreq[h] || 0), 0) / Math.max(c.herbs.size, 1);
  const rest = formulaCandidates
    .filter((c, i) => !pickedIdx.has(i))
    .sort((a, b) => avgScore(b) - avgScore(a));
  selectedCandidates = selectedCandidates.concat(rest.slice(0, remain));
}

const topFormulas = selectedCandidates;
const formulaInfo = new Map();
for (const c of topFormulas) {
  const row = pdb.prepare('SELECT name, source_text FROM formula WHERE id = ?').get(c.fid);
  if (row) formulaInfo.set(c.fid, row);
}

// 按方剂名合并重名方剂为一个节点（如「理中丸」有 8 个版本），组成药材取并集
const formulaGroups = new Map(); // 方剂名 -> { ids, herbs:Set, sources:Set }
for (const c of topFormulas) {
  const row = formulaInfo.get(c.fid);
  if (!row) continue;
  const name = normalizeText(row.name);
  if (!formulaGroups.has(name)) formulaGroups.set(name, { ids: [], herbs: new Set(), sources: new Set() });
  const g = formulaGroups.get(name);
  g.ids.push(c.fid);
  for (const h of c.herbs) g.herbs.add(h);
  g.sources.add(row.source_text || '');
}

for (const [name, g] of formulaGroups) {
  const fid = 'formula:' + name;
  addNode('formula', name, {
    id: fid,
    variant_count: g.ids.length,
    sources: Array.from(g.sources)
  });
  for (const h of g.herbs) {
    addEdge(fid, `herb:${h}`, '组成');
  }
}
pdb.close();

// 计算节点 value = 入度（被多少药材连接）；药材节点 value = 出度
const inDegree = {};
const outDegree = {};
for (const e of edges) {
  inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  outDegree[e.source] = (outDegree[e.source] || 0) + 1;
}
const nodeList = Array.from(nodeMap.values());
for (const n of nodeList) {
  n.value = (n.type === 'herb' || n.type === 'formula') ? (outDegree[n.id] || 0) : (inDegree[n.id] || 0);
}

/* ---------- 统计与输出 ---------- */

const stats = {
  nodes: nodeList.length,
  edges: edges.length,
  herbTotal: herbs.length,
  toxicCount: nodeList.filter((n) => n.type === 'herb' && n.toxic).length,
  conflictPairs: edges.filter((e) => e.type === '配伍禁忌').length,
  meridianCount: nodeList.filter((n) => n.type === 'meridian').length,
  effectCount: nodeList.filter((n) => n.type === 'effect').length,
  symptomCount: nodeList.filter((n) => n.type === 'symptom').length,
  cautionCount: nodeList.filter((n) => n.type === 'caution').length,
  formulaCount: nodeList.filter((n) => n.type === 'formula').length
};

const graph = {
  meta: { dataVersion: DATA_VERSION, generatedAt: new Date().toISOString(), herbTotal: herbs.length },
  stats,
  nodes: nodeList,
  edges
};

fs.writeFileSync(OUT_FILE, JSON.stringify(graph, null, 2), 'utf-8');
console.log(`✔ 图谱构建完成：${stats.nodes} 节点 / ${stats.edges} 边`);
console.log(
  `  药材 ${stats.herbTotal} | 方剂 ${stats.formulaCount} | 有毒 ${stats.toxicCount} | 配伍 ${stats.conflictPairs} | ` +
  `经络 ${stats.meridianCount} | 功效 ${stats.effectCount} | 症状 ${stats.symptomCount} | 禁忌 ${stats.cautionCount}`
);
console.log(`  产物：${OUT_FILE}`);
