/**
 * lib/normalize.js —— OCR 噪音字符归一化
 *
 * 药典 PDF 文字层存在 OCR 错误，实测数据后固化的映射表。
 * jsonProvider（搜索/展示）与 build-graph（图谱提取）共用本表，保证结果一致。
 * 数据：C:/Users/Administrator/Desktop/药典项目/输出结果_修正版/yaocai_data.json（2026-07-31）
 */

// 单字符映射：这些字在数据中只会是噪音变体，全局替换安全
const NORMALIZE_MAP = {
  '卩': '胃', // 蔓荆子「胱、肝、卩经」
  '宵': '肾', // 野木瓜「归肝、宵经」
  '抒': '肾', // 牵牛子「归肺、抒、大肠经」
  '杆': '肾', // 甘遂「归肺、杆、大肠经」
  '胄': '胃', // 青皮「胄经」/辛夷「胄弱者」
  '贤': '肾', // 千金子霜「归肝、贤」/「肝贤阴虚」
  '犖': '晕', // 「眩犖耳鸣」
  '衂': '衄', // 「衂血」
  '氣': '气'  // 草果「辛氣归脾」
};

// 上下文替换：仅特定语境出现，避免误伤（如「雍」在「痰雍」中为「壅」）
const CONTEXT_RULES = [
  [/有雍/g, '有毒'],   // 牵牛子「苦寒；有雍」→「苦寒；有毒」
  [/大\.肠/g, '大肠']  // 归经中 OCR 插入点号
];

/**
 * 归一化一段文本
 * @param {string} str
 * @returns {string}
 */
function normalizeText(str) {
  if (typeof str !== 'string') return str;
  let s = '';
  for (const ch of str) s += NORMALIZE_MAP[ch] || ch;
  for (const [re, rep] of CONTEXT_RULES) s = s.replace(re, rep);
  return s.trim();
}

module.exports = { NORMALIZE_MAP, CONTEXT_RULES, normalizeText };
