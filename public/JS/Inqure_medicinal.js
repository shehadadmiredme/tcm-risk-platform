/**
 * public/JS/Inqure_medicinal.js —— 药材查询页逻辑
 *
 * 功能：名称/关键词搜索 → GET /api/herbs/search → 填充标题与四宫格
 * 支持 URL 参数：Inqure_medicinal.html?q=板蓝根（首页跳转直达查询）
 * 依赖：JS/api.js
 */
(function () {
  'use strict';

  var searchInput = document.getElementById('searchInput');
  var searchBtn = document.getElementById('searchBtn');
  var searchBox = searchInput ? searchInput.closest('.search') : null;

  var herbNameEl = document.getElementById('herbName');
  var herbAliasEl = document.getElementById('herbAlias');
  var cardBasic = document.getElementById('card-basic');
  var cardRisk = document.getElementById('card-risk');
  var cardNote = document.getElementById('card-note');
  var cardSymptom = document.getElementById('card-symptom');

  /* ---------- 工具 ---------- */

  function setLoading(on) {
    if (!searchBox) return;
    if (on) searchBox.classList.add('search-loading');
    else searchBox.classList.remove('search-loading');
  }

  /** 向容器追加文本，并把匹配正则的片段用 <mark> 高亮（DOM 操作，安全防 XSS） */
  function appendHighlighted(parent, text, regex, cls) {
    var last = 0;
    regex.lastIndex = 0;
    var m;
    while ((m = regex.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var mark = document.createElement('mark');
      mark.className = cls || 'keyword-hl';
      mark.textContent = m[0];
      parent.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function clearCard(card) {
    card.innerHTML = '';
  }

  function setCardPlaceholder(card, text) {
    clearCard(card);
    var p = document.createElement('p');
    p.className = 'result-empty';
    p.textContent = text;
    card.appendChild(p);
  }

  /** 从「注意」提取含风险关键词的句子（毒/慎/禁/发汗/刺激/忌/勿；「不宜与X同用」归入注意事项卡，不重复） */
  function extractRiskSentences(caution) {
    if (!caution || caution === '无') return [];
    var riskKw = /毒|慎|禁|发汗|刺激|忌|勿/;
    return caution
      .split(/[。；;]/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0 && riskKw.test(s) && s.indexOf('不宜与') < 0; });
  }

  /** 从「功能与主治」提取「用于」后的症状短语 */
  function extractSymptoms(func) {
    var idx = (func || '').indexOf('用于');
    if (idx < 0) return [];
    return func
      .slice(idx + 2)
      .split(/[，,、；;。]/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length >= 2; });
  }

  /** 提取毒性等级：从性味与归经 + 注意 */
  function getToxicLevel(herb) {
    var t = (herb['性味与归经'] || '') + (herb['注意'] || '');
    if (t.indexOf('大毒') >= 0) return '大毒';
    if (t.indexOf('有毒') >= 0) return '有毒';
    if (t.indexOf('小毒') >= 0) return '小毒';
    return null;
  }

  /* ---------- 渲染 ---------- */

  function render(herb) {
    var toxic = getToxicLevel(herb);

    // 标题
    herbNameEl.textContent = herb['药材名称'];
    if (toxic) {
      herbAliasEl.textContent = '《中国药典》2025年版品种 · ' + toxic;
    } else {
      herbAliasEl.textContent = '《中国药典》2025年版品种';
    }

    // ── 基础信息卡 ──
    clearCard(cardBasic);
    var item1 = document.createElement('p');
    item1.className = 'result-item';
    var b1 = document.createElement('b');
    b1.textContent = '性味与归经：';
    item1.appendChild(b1);
    item1.appendChild(document.createTextNode(herb['性味与归经'] || '无'));
    cardBasic.appendChild(item1);

    var item2 = document.createElement('p');
    item2.className = 'result-item';
    var b2 = document.createElement('b');
    b2.textContent = '用法与用量：';
    item2.appendChild(b2);
    item2.appendChild(document.createTextNode(herb['用法与用量'] || '无'));
    cardBasic.appendChild(item2);

    if (toxic) {
      var pill = document.createElement('span');
      pill.className = 'pill pill-danger';
      pill.textContent = '⚠ ' + toxic;
      cardBasic.appendChild(pill);
    }

    // ── 不良症状卡 ──
    var risks = extractRiskSentences(herb['注意']);
    if (risks.length) {
      clearCard(cardRisk);
      risks.forEach(function (s) {
        var p = document.createElement('p');
        p.className = 'result-item';
        p.textContent = '· ' + s;
        cardRisk.appendChild(p);
      });
    } else {
      setCardPlaceholder(cardRisk, '该药材未见明确的不良反应记载，但仍需遵医嘱谨慎使用。');
    }

    // ── 注意事项卡 ──
    clearCard(cardNote);
    var caution = herb['注意'] || '无';
    if (caution && caution !== '无') {
      // 配伍禁忌高亮
      appendHighlighted(cardNote, caution, /不宜与[^，。；;、]+?同用/g, 'keyword-hl');
      // 「X相反」高亮
      appendHighlighted(cardNote, caution, /[一-龥]{1,6}相[反畏]/g, 'keyword-hl');
    } else {
      setCardPlaceholder(cardNote, '未见明确记载的用药注意事项。');
    }

    // ── 主治症状卡 ──
    var syms = extractSymptoms(herb['功能与主治']);
    if (syms.length) {
      clearCard(cardSymptom);
      syms.forEach(function (s) {
        var pill = document.createElement('span');
        pill.className = 'symptom-pill';
        pill.textContent = s;
        cardSymptom.appendChild(pill);
      });
    } else {
      setCardPlaceholder(cardSymptom, '功能与主治：' + (herb['功能与主治'] || '无'));
    }
  }

  function renderNotFound(q) {
    herbNameEl.textContent = '未收录该药材';
    herbAliasEl.textContent = '「' + q + '」在当前药典数据中未找到';
    setCardPlaceholder(cardBasic, '未收录「' + q + '」，请尝试其他名称或关键词。');
    setCardPlaceholder(cardRisk, '—');
    setCardPlaceholder(cardNote, '—');
    setCardPlaceholder(cardSymptom, '—');
  }

  function renderError(msg) {
    herbNameEl.textContent = '查询失败';
    herbAliasEl.textContent = '';
    setCardPlaceholder(cardBasic, '网络或服务异常：' + msg);
    setCardPlaceholder(cardRisk, '—');
    setCardPlaceholder(cardNote, '—');
    setCardPlaceholder(cardSymptom, '—');
  }

  /* ---------- 搜索流程 ---------- */

  function doSearch() {
    var q = (searchInput.value || '').trim();
    if (!q) return;
    setLoading(true);
    window.API
      .searchHerbs(q)
      .then(function (data) {
        setLoading(false);
        if (data.count > 0) render(data.results[0]);
        else renderNotFound(q);
      })
      .catch(function (err) {
        setLoading(false);
        renderError(err.message || '未知错误');
      });
  }

  function bindEvents() {
    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSearch();
      });
    }
  }

  function autoSearchFromUrl() {
    var params = new URLSearchParams(location.search);
    var q = (params.get('q') || '').trim();
    if (q) {
      searchInput.value = q;
      doSearch();
    }
  }

  /* ---------- 初始化 ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    autoSearchFromUrl();
  });
})();
