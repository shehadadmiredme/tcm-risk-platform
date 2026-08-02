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

  /* ---------- 初始化 ---------- */

  /** 支持 URL hash 定位：Inqure_prescription.html#analyze 直达药方风险分析 */
  function syncTabFromHash() {
    var h = (location.hash || '').slice(1);
    activateTab(h === 'analyze' ? 'analyze' : 'query');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderEmpty();
    syncTabFromHash();
  });

  window.addEventListener('hashchange', syncTabFromHash);
})();
