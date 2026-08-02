/**
 * public/JS/Inqure_prescription.js —— 药方查询页逻辑
 *
 * 两个功能模块：
 *  1. Tab 切换（方剂查询 / 药方风险分析）
 *  2. 药方风险分析的前端交互：
 *     - 解析用户输入 → 生成已识别药材标签
 *     - 点击「开始分析」→ 渲染风险分析结果占位框架
 *     （真实分析引擎尚未接入，仅展示前端界面）
 *
 * 依赖：JS/i18n.js、JS/zh-CN.js（文案通过 I18N.t 获取，防 XSS 用 DOM 操作）
 */
(function () {
  'use strict';

  var t = function (key, fallback) {
    return (typeof I18N !== 'undefined') ? I18N.t(key, fallback) : fallback;
  };

  /* ---------- 1. Tab 切换 ---------- */

  var tabs = document.querySelectorAll('.prescription-tab');
  var panels = document.querySelectorAll('.prescription-panel');

  function activateTab(key) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-tab') === key;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      var show = panel.getAttribute('data-panel') === key;
      if (show) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateTab(tab.getAttribute('data-tab'));
    });
  });

  /* ---------- 2. 药方风险分析：前端交互 ---------- */

  var analyzeInput = document.getElementById('analyzeInput');
  var analyzeBtn = document.getElementById('analyzeBtn');
  var analyzeClearBtn = document.getElementById('analyzeClearBtn');
  var analyzeTags = document.getElementById('analyzeTags');
  var analyzeTagsList = document.getElementById('analyzeTagsList');
  var analyzeResult = document.getElementById('analyzeResult');

  /** 解析药方文本 → 药材名数组（纯前端：去用量、去空白、去重） */
  function parseHerbs(text) {
    var herbs = text
      .split(/[\n,，、;；]+/)
      .map(function (line) {
        // 去掉用量标注，如：30g、20克、1.5g
        return line
          .replace(/[0-9０-９]+(?:[.．][0-9０-９]+)?\s*[克gG公斤两钱片粒mLml毫升]*/g, '')
          .replace(/[（(][^）)]*[)）]?/g, '')
          .trim();
      })
      .filter(Boolean);
    // 去重，保持先后顺序
    return herbs.filter(function (herb, i) {
      return herbs.indexOf(herb) === i;
    });
  }

  /** 渲染已识别药材标签 */
  function renderTags(herbs) {
    analyzeTagsList.innerHTML = '';
    herbs.forEach(function (herb) {
      var tag = document.createElement('span');
      tag.className = 'analyze-tag';
      tag.textContent = herb;
      analyzeTagsList.appendChild(tag);
    });
    analyzeTags.hidden = herbs.length === 0;
  }

  /** 渲染风险分析结果占位框架（机制待实现） */
  function renderResultPlaceholder(herbs) {
    analyzeResult.innerHTML = '';

    // ── 整体风险评级横幅 ──
    var overall = document.createElement('div');
    overall.className = 'analyze-overall';

    var icon = document.createElement('i');
    icon.className = 'ri-shield-check-line';
    overall.appendChild(icon);

    var textWrap = document.createElement('div');
    var b = document.createElement('b');
    b.textContent = t('prescription.analyze.result.overallTitle', '整体风险评级');
    var span = document.createElement('span');
    span.textContent = ' — ' + t('prescription.analyze.result.overallEmpty', '风险评级机制即将上线，敬请期待。');
    textWrap.appendChild(b);
    textWrap.appendChild(span);
    overall.appendChild(textWrap);

    var badge = document.createElement('span');
    badge.className = 'dev-badge';
    var badgeIcon = document.createElement('i');
    badgeIcon.className = 'ri-tools-line';
    badge.appendChild(badgeIcon);
    badge.appendChild(document.createTextNode(t('prescription.analyze.result.devBadge', '功能开发中')));
    overall.appendChild(badge);

    analyzeResult.appendChild(overall);

    // ── 逐味药材风险 + 配伍风险 ──
    var grid = document.createElement('div');
    grid.className = 'analyze-grid';

    // 逐味药材风险卡
    var herbCard = document.createElement('div');
    herbCard.className = 'analyze-card';

    var herbTitle = document.createElement('h3');
    var herbIcon = document.createElement('i');
    herbIcon.className = 'ri-plant-line';
    herbTitle.appendChild(herbIcon);
    herbTitle.appendChild(document.createTextNode(t('prescription.analyze.result.herbTitle', '逐味药材风险')));
    herbCard.appendChild(herbTitle);

    var notReady = t('prescription.analyze.result.notReady', '待分析');
    herbs.forEach(function (herb) {
      var item = document.createElement('div');
      item.className = 'analyze-herb-item';

      var name = document.createElement('span');
      name.className = 'herb-name';
      name.textContent = herb;

      var status = document.createElement('span');
      status.className = 'herb-status';
      var statusIcon = document.createElement('i');
      statusIcon.className = 'ri-time-line';
      status.appendChild(statusIcon);
      status.appendChild(document.createTextNode(notReady));

      item.appendChild(name);
      item.appendChild(status);
      herbCard.appendChild(item);
    });
    grid.appendChild(herbCard);

    // 配伍风险提示卡
    var compatCard = document.createElement('div');
    compatCard.className = 'analyze-card';

    var compatTitle = document.createElement('h3');
    var compatIcon = document.createElement('i');
    compatIcon.className = 'ri-node-tree-line';
    compatTitle.appendChild(compatIcon);
    compatTitle.appendChild(document.createTextNode(t('prescription.analyze.result.compatTitle', '配伍风险提示')));
    compatCard.appendChild(compatTitle);

    var compatEmpty = document.createElement('p');
    compatEmpty.textContent = t('prescription.analyze.result.compatEmpty', '将展示方剂中潜在的相反、相畏及不适宜同用的组合。');
    compatCard.appendChild(compatEmpty);

    grid.appendChild(compatCard);
    analyzeResult.appendChild(grid);

    // ── 底部开发中提示 ──
    var warning = document.createElement('p');
    warning.className = 'analyze-warning';
    warning.textContent = '⚠ ' + t('prescription.analyze.warningDev', '当前为前端演示版本，风险分析引擎即将上线。');
    analyzeResult.appendChild(warning);
  }

  /** 恢复空状态 */
  function renderEmpty(hint) {
    analyzeResult.innerHTML = '';
    var empty = document.createElement('div');
    empty.className = 'analyze-empty';

    var icon = document.createElement('i');
    icon.className = 'ri-stethoscope-line';
    empty.appendChild(icon);

    var title = document.createElement('p');
    title.textContent = t('prescription.analyze.emptyTitle', '等待药方输入');
    empty.appendChild(title);

    var hintEl = document.createElement('span');
    hintEl.textContent = hint || t('prescription.analyze.emptyHint', '在输入框中逐行录入药材，点击「开始分析」后，此处将展示风险分析结果。');
    empty.appendChild(hintEl);

    analyzeResult.appendChild(empty);
  }

  function doAnalyze() {
    var text = (analyzeInput.value || '').trim();
    if (!text) {
      analyzeTags.hidden = true;
      renderEmpty('请先输入药方成分。');
      analyzeInput.focus();
      return;
    }

    var herbs = parseHerbs(text);
    renderTags(herbs);

    if (herbs.length === 0) {
      renderEmpty('未能识别有效药材，请按「每行一味药材」的格式输入。');
      return;
    }

    renderResultPlaceholder(herbs);
  }

  function clearAll() {
    analyzeInput.value = '';
    analyzeTags.hidden = true;
    analyzeTagsList.innerHTML = '';
    renderEmpty();
  }

  if (analyzeBtn) analyzeBtn.addEventListener('click', doAnalyze);
  if (analyzeClearBtn) analyzeClearBtn.addEventListener('click', clearAll);
  if (analyzeInput) {
    analyzeInput.addEventListener('keydown', function (e) {
      // Ctrl/Cmd + Enter 触发分析
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') doAnalyze();
    });
  }

  /* ---------- 方剂查询：前后端交接（/api/formulas/search） ---------- */

  var fsInput = document.getElementById('prescriptionSearchInput');
  var fsBtn = document.getElementById('prescriptionSearchBtn');
  var fsBox = fsInput ? fsInput.closest('.search') : null;
  var fsResults = document.getElementById('formulaResults');
  var fsResultsHead = document.getElementById('formulaResultsHead');
  var fsResultsList = document.getElementById('formulaResultsList');
  var fsTitle = document.getElementById('formulaTitle');
  var fsNameEl = document.getElementById('formulaName');
  var fsSourceEl = document.getElementById('formulaSource');
  var cardComposition = document.getElementById('card-composition');
  var cardIndications = document.getElementById('card-indications');
  var cardAdverse = document.getElementById('card-adverse');
  var cardCredibility = document.getElementById('card-credibility');

  function fsSetLoading(on) {
    if (!fsBox) return;
    fsBox.classList.toggle('search-loading', !!on);
  }

  function fsEscapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** 按正则高亮追加（DOM 操作，安全防 XSS） */
  function fsHighlight(parent, text, regex) {
    parent.innerHTML = '';
    var last = 0;
    var m;
    if (regex) regex.lastIndex = 0;
    while (regex && (m = regex.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var mark = document.createElement('mark');
      mark.className = 'keyword-hl';
      mark.textContent = m[0];
      parent.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function fsCardClear(card) {
    card.innerHTML = '';
  }

  function fsCardEmpty(card, text) {
    fsCardClear(card);
    var p = document.createElement('p');
    p.className = 'result-empty';
    p.textContent = text;
    card.appendChild(p);
  }

  /** 渲染搜索结果列表 */
  function fsRenderResults(q, data) {
    var results = data.results || [];
    fsResults.hidden = false;
    fsResultsList.innerHTML = '';
    if (!results.length) {
      fsResultsHead.textContent = t('prescription.search.notFound', '未找到相关方剂，请尝试其他关键词。');
      return;
    }
    var total = data.count;
    fsResultsHead.textContent =
      t('prescription.search.totalPrefix', '共') + ' ' + total + ' ' +
      t('prescription.search.totalSuffix', '条相关方剂') + ' · ' +
      t('prescription.search.clickHint', '点击方剂名称查看详情');
    var nameRegex = new RegExp(fsEscapeRegExp(q), 'g');
    results.forEach(function (f) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'formula-result-item';
      var name = document.createElement('span');
      name.className = 'fr-name';
      fsHighlight(name, f.name || '', nameRegex);
      var src = document.createElement('span');
      src.className = 'fr-source';
      src.textContent = f.source_text || '';
      var eff = document.createElement('span');
      eff.className = 'fr-eff';
      eff.textContent = f.efficacy || '';
      item.appendChild(name);
      item.appendChild(src);
      item.appendChild(eff);
      item.addEventListener('click', function () {
        fsOpenFormula(f.id);
      });
      fsResultsList.appendChild(item);
    });
  }

  /** 打开方剂详情 */
  function fsOpenFormula(id) {
    window.API.getFormula(id).then(function (f) {
      fsResults.hidden = true;
      fsRenderFormula(f);
    }).catch(function (err) {
      fsResultsHead.textContent = '加载详情失败：' + (err.message || '');
      fsResults.hidden = false;
    });
  }

  /** 渲染方剂详情：标题栏 + 四宫格 */
  function fsRenderFormula(f) {
    fsTitle.hidden = false;
    fsNameEl.textContent = f.name || '';
    fsSourceEl.textContent = f.source_text || '';

    // ── 组成成分 ──
    var ing = f.ingredients || [];
    fsCardClear(cardComposition);
    if (ing.length) {
      ing.forEach(function (it) {
        var item = document.createElement('p');
        item.className = 'result-item';
        var b = document.createElement('b');
        b.textContent = (it.herb_name || it.raw_text || '').trim() + '：';
        item.appendChild(b);
        // dosage 字段已含单位（如「6两」）；dosage_note 为「各半/等分」等修饰语
        var dose = it.dosage || '';
        if (it.dosage_note) dose = dose ? dose + '（' + it.dosage_note + '）' : it.dosage_note;
        item.appendChild(document.createTextNode(dose || it.raw_text || ''));
        cardComposition.appendChild(item);
      });
    } else if (f.recipe_raw) {
      var p0 = document.createElement('p');
      p0.className = 'result-item';
      p0.textContent = f.recipe_raw;
      cardComposition.appendChild(p0);
    } else {
      fsCardEmpty(cardComposition, t('prescription.search.noRecord', '未记载'));
    }

    // ── 适用人群或症状 ──
    fsCardClear(cardIndications);
    if (f.efficacy && f.efficacy.trim()) {
      var p1 = document.createElement('p');
      p1.className = 'result-item';
      p1.textContent = f.efficacy;
      cardIndications.appendChild(p1);
    } else {
      fsCardEmpty(cardIndications, t('prescription.search.noRecord', '未记载'));
    }

    // ── 不良反应与注意事项（配伍禁忌/相反相畏高亮）──
    fsCardClear(cardAdverse);
    if (f.caution && f.caution.trim()) {
      fsHighlight(cardAdverse, f.caution, /不宜与[^，。；;、]+?同用|[一-龥]{1,6}相[反畏]/g);
    } else {
      fsCardEmpty(cardAdverse, '该方剂未见明确的不良反应与禁忌记载，请遵医嘱使用。');
    }

    // ── 估计对比与可信度 ──
    fsCardClear(cardCredibility);
    var srcItem = document.createElement('p');
    srcItem.className = 'result-item';
    var b2 = document.createElement('b');
    b2.textContent = t('prescription.search.sourceLabel', '出处：');
    srcItem.appendChild(b2);
    srcItem.appendChild(document.createTextNode(f.source_text || t('prescription.search.noRecord', '未记载')));
    cardCredibility.appendChild(srcItem);
    var hint = document.createElement('p');
    hint.className = 'result-empty';
    hint.textContent = t('prescription.search.credibilityHint', '出处为古籍原文记载，可信度需结合现代医学研究评估。');
    cardCredibility.appendChild(hint);
  }

  /** 搜索流程 */
  function fsDoSearch() {
    var q = (fsInput.value || '').trim();
    if (!q) return;
    fsSetLoading(true);
    window.API.searchFormulas(q, 30)
      .then(function (data) {
        fsSetLoading(false);
        fsRenderResults(q, data);
      })
      .catch(function (err) {
        fsSetLoading(false);
        fsResults.hidden = false;
        fsResultsHead.textContent = '查询失败：' + (err.message || '未知错误');
        fsResultsList.innerHTML = '';
      });
  }

  /** 支持 URL 参数：Inqure_prescription.html?q=红糖姜水 直达搜索 */
  function fsAutoSearchFromUrl() {
    var params = new URLSearchParams(location.search);
    var q = (params.get('q') || '').trim();
    if (q && fsInput) {
      fsInput.value = q;
      fsDoSearch();
    }
  }

  if (fsBtn) fsBtn.addEventListener('click', fsDoSearch);
  if (fsInput) {
    fsInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') fsDoSearch();
    });
  }

  /* ---------- 初始化 ---------- */

  /** 支持 URL hash 定位：Inqure_prescription.html#analyze 直达药方风险分析 */
  function syncTabFromHash() {
    var h = (location.hash || '').slice(1);
    activateTab(h === 'analyze' ? 'analyze' : 'query');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderEmpty();
    syncTabFromHash();
    fsAutoSearchFromUrl();
  });

  window.addEventListener('hashchange', syncTabFromHash);
})();
