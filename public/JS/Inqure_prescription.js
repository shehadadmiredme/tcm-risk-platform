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

  /** 解析药方输入 → 原始行（保留用量，由后端做结构化解析） */
  function parseHerbs(text) {
    return text
      .split(/[\n,，、;；]+/)
      .map(function (line) { return line.replace(/\s+/g, ' ').trim(); })
      .filter(Boolean);
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

  /** 创建 DOM 节点 */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  /** 渲染风险分析真实结果 */
  function renderAnalyzeResult(data) {
    analyzeResult.innerHTML = '';
    var result = data || {};
    var overall = result.overall || {};
    var herbRisks = result.herbRisks || [];
    var compat = result.compatibility || [];
    var classical = result.classical || {};

    var banner = el('div', 'analyze-overall risk-level-' + overall.level);
    var icon = el('i', 'ri-shield-check-line');
    banner.appendChild(icon);
    var textWrap = el('div');
    var b = el('b', null, '整体风险评级：' + (overall.levelName || '待评估'));
    var span = el('span', null, '风险分 ' + (overall.score || 0) + ' · ' + (overall.summary || ''));
    textWrap.appendChild(b);
    textWrap.appendChild(span);
    banner.appendChild(textWrap);
    if (result.recordId) {
      banner.appendChild(el('span', 'record-id', '判定记录 #' + result.recordId));
    }
    analyzeResult.appendChild(banner);

    var grid = el('div', 'analyze-grid');

    var detailCard = el('div', 'analyze-card');
    var detailTitle = el('h3');
    detailTitle.appendChild(el('i', 'ri-alert-line'));
    detailTitle.appendChild(document.createTextNode('风险明细'));
    detailCard.appendChild(detailTitle);
    var highs = (result.rules || []).filter(function (f) { return f.severity === 'high'; });
    var mediums = (result.rules || []).filter(function (f) { return f.severity === 'medium'; });
    if (highs.length) {
      highs.forEach(function (f) {
        detailCard.appendChild(el('p', 'risk-line risk-sev-high', '[' + (f.name || '高风险') + '] ' + (f.message || '')));
      });
    } else if (mediums.length) {
      mediums.forEach(function (f) {
        detailCard.appendChild(el('p', 'risk-line risk-sev-medium', '[' + (f.name || '中风险') + '] ' + (f.message || '')));
      });
    } else {
      detailCard.appendChild(el('p', 'risk-line', '未检出明确高风险或中风险项。'));
    }
    grid.appendChild(detailCard);

    var herbCard = el('div', 'analyze-card');
    var herbTitle = el('h3');
    herbTitle.appendChild(el('i', 'ri-plant-line'));
    herbTitle.appendChild(document.createTextNode('逐味药材风险'));
    herbCard.appendChild(herbTitle);
    herbRisks.forEach(function (r) {
      var item = el('div', 'analyze-herb-item');
      var nameWrap = el('span', 'herb-name', (r.name || '') + (r.doseText ? ' ' + r.doseText : ''));
      item.appendChild(nameWrap);
      var status = el('span', 'herb-status');
      var sev = r.findings && r.findings.length ? r.findings[0].severity : 'info';
      status.appendChild(el('span', 'risk-dot risk-dot-' + sev));
      status.appendChild(document.createTextNode(r.matched ? '已匹配' : '未匹配药典'));
      item.appendChild(status);
      herbCard.appendChild(item);
      if (r.toxicity && r.toxicity !== '无') {
        herbCard.appendChild(el('p', 'risk-line', '毒性：' + r.toxicity + '；药典剂量：' + ((r.dosageRange && r.dosageRange.text) || '未见明确范围')));
      } else if (r.dosageRange) {
        herbCard.appendChild(el('p', 'risk-line', '药典剂量：' + r.dosageRange.text));
      }
      (r.findings || []).forEach(function (f) {
        herbCard.appendChild(el('p', 'risk-line risk-sev-' + f.severity, '[' + f.name + '] ' + f.message));
      });
    });
    if (!herbRisks.length) herbCard.appendChild(el('p', null, '未识别到有效药材。'));
    grid.appendChild(herbCard);

    var compatCard = el('div', 'analyze-card');
    var compatTitle = el('h3');
    compatTitle.appendChild(el('i', 'ri-node-tree-line'));
    compatTitle.appendChild(document.createTextNode('配伍风险提示'));
    compatCard.appendChild(compatTitle);
    if (compat.length) {
      compat.forEach(function (c) {
        compatCard.appendChild(el('p', 'risk-line risk-sev-' + c.severity, '[' + c.name + '] ' + c.message));
      });
    } else {
      compatCard.appendChild(el('p', null, '未检出十八反、十九畏等明确配伍禁忌组合。'));
    }
    grid.appendChild(compatCard);

    var classicalCard = el('div', 'analyze-card');
    var classicalTitle = el('h3');
    classicalTitle.appendChild(el('i', 'ri-history-line'));
    classicalTitle.appendChild(document.createTextNode('古籍相似方剂与剂量'));
    classicalCard.appendChild(classicalTitle);
    classicalCard.appendChild(el('p', 'risk-line', '已对比药典剂量与 8.4 万条古籍方剂统计。'));
    herbRisks.forEach(function (r) {
      if (r.classical && r.classical.count) {
        classicalCard.appendChild(el(
          'p',
          'risk-line',
          r.name + '：古籍样本 ' + r.classical.count + ' 条，P50 ' + r.classical.p50 + 'g，P95 ' + r.classical.p95 + 'g。'
        ));
      }
    });
    if (result.similarFormulas) {
      classicalCard.appendChild(el('p', 'risk-line', result.similarFormulas.summary || ''));
      (result.similarFormulas.matches || []).slice(0, 5).forEach(function (f) {
        classicalCard.appendChild(el(
          'p',
          'risk-line',
          f.name + '（出处：' + (f.source_text || '未知') + '，重合 ' + f.overlap + '/' + f.herbCount + ' 味）'
        ));
      });
    }
    grid.appendChild(classicalCard);

    var recordCard = el('div', 'analyze-card');
    var recordTitle = el('h3');
    recordTitle.appendChild(el('i', 'ri-file-list-3-line'));
    recordTitle.appendChild(document.createTextNode('判定记录'));
    recordCard.appendChild(recordTitle);
    recordCard.appendChild(el('p', 'risk-line', '本次判定已保存，记录编号：#' + (result.recordId || '待保存')));
    recordCard.appendChild(el('p', 'risk-line', '每条命中规则均保留规则编号、严重程度、证据来源，可回溯。'));
    grid.appendChild(recordCard);

    analyzeResult.appendChild(grid);
    var warning = el('p', 'analyze-warning', '结果仅作风险信息科普参考，不构成医疗建议；用药请遵医嘱。');
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

    var lines = parseHerbs(text);
    renderTags(lines);
    if (!lines.length) {
      renderEmpty('未能识别有效药材，请按「每行一味药材」的格式输入。');
      return;
    }

    if (analyzeBtn) {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = '分析中…';
    }
    analyzeResult.innerHTML = '';
    var loading = el('div', 'analyze-empty');
    loading.appendChild(el('i', 'ri-loader-4-line'));
    loading.appendChild(el('p', null, '正在分析药方风险'));
    analyzeResult.appendChild(loading);

    window.API.analyzePrescription(text)
      .then(function (data) {
        renderAnalyzeResult(data);
      })
      .catch(function (err) {
        renderEmpty('分析失败：' + (err.message || '未知错误'));
      })
      .finally(function () {
        if (analyzeBtn) {
          analyzeBtn.disabled = false;
          analyzeBtn.textContent = '开始分析';
        }
      });
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

  // 分页状态
  var fsQuery = '';       // 当前搜索词
  var fsOffset = 0;       // 下次加载的 offset
  var fsLoadedCount = 0;  // 当前已显示条数
  var fsPageSize = 30;    // 每页条数

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

  /** 通俗化解释块（与原文区分展示） */
  function fsPlainTip(parent, label, text) {
    var tip = document.createElement('div');
    tip.className = 'plain-tip';
    var b = document.createElement('b');
    b.textContent = label;
    tip.appendChild(b);
    tip.appendChild(document.createTextNode(text));
    parent.appendChild(tip);
  }

  // 命中来源标签：区分「名称/配方含/出处含/功效提及」
  var FS_MATCH = {
    name: { label: '', cls: '' },
    recipe: { label: '配方含', cls: 'fr-match-recipe' },
    source: { label: '出处含', cls: 'fr-match-source' },
    efficacy: { label: '功效提及', cls: 'fr-match-eff' }
  };

  /** 构建单条方剂结果项 */
  function fsBuildResultItem(f, nameRegex) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'formula-result-item';

    var head = document.createElement('div');
    head.className = 'fr-head';
    var name = document.createElement('span');
    name.className = 'fr-name';
    fsHighlight(name, f.name || '', nameRegex);
    head.appendChild(name);
    var m = FS_MATCH[f.match_field];
    if (m && m.label) {
      var tag = document.createElement('span');
      tag.className = 'fr-match ' + m.cls;
      tag.textContent = m.label;
      head.appendChild(tag);
    }
    item.appendChild(head);

    var src = document.createElement('span');
    src.className = 'fr-source';
    src.textContent = f.source_text || '';
    var eff = document.createElement('span');
    eff.className = 'fr-eff';
    eff.textContent = f.efficacy || '';
    item.appendChild(src);
    item.appendChild(eff);
    item.addEventListener('click', function () {
      fsOpenFormula(f.id);
    });
    return item;
  }

  /** 渲染搜索结果列表（第一页） */
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
      fsResultsList.appendChild(fsBuildResultItem(f, nameRegex));
    });
    fsLoadedCount = results.length;
    fsOffset = results.length;
    fsRenderLoadMore(total);
  }

  /** 渲染「加载更多」按钮（结果未显示完时出现） */
  function fsRenderLoadMore(total) {
    var old = document.getElementById('formulaLoadMore');
    if (old) old.remove();
    if (fsLoadedCount >= total) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'formulaLoadMore';
    btn.className = 'formula-load-more';
    btn.textContent = '加载更多（已显示 ' + fsLoadedCount + ' / ' + total + ' 条）';
    btn.addEventListener('click', fsLoadMore);
    fsResultsList.appendChild(btn);
  }

  /** 加载更多结果 */
  function fsLoadMore() {
    fsSetLoading(true);
    window.API.searchFormulas(fsQuery, fsPageSize, fsOffset)
      .then(function (data) {
        fsSetLoading(false);
        var results = data.results || [];
        var nameRegex = new RegExp(fsEscapeRegExp(fsQuery), 'g');
        var loadMoreBtn = document.getElementById('formulaLoadMore');
        results.forEach(function (f) {
          var item = fsBuildResultItem(f, nameRegex);
          if (loadMoreBtn && loadMoreBtn.parentNode) {
            fsResultsList.insertBefore(item, loadMoreBtn);
          } else {
            fsResultsList.appendChild(item);
          }
        });
        fsLoadedCount += results.length;
        fsOffset += results.length;
        fsRenderLoadMore(data.count);
      })
      .catch(function (err) {
        fsSetLoading(false);
        fsResultsHead.textContent = '加载失败：' + (err.message || '');
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
    // 功效通俗化解释（与原文区分展示）
    if (f.efficacy_plain) {
      fsPlainTip(cardIndications, '通俗解释', f.efficacy_plain);
    }

    // ── 不良反应与注意事项（配伍禁忌/相反相畏高亮）──
    fsCardClear(cardAdverse);
    if (f.caution && f.caution.trim()) {
      fsHighlight(cardAdverse, f.caution, /不宜与[^，。；;、]+?同用|[一-龥]{1,6}相[反畏]/g);
    } else {
      fsCardEmpty(cardAdverse, '该方剂未见明确的不良反应与禁忌记载，请遵医嘱使用。');
    }
    // 禁忌通俗化解释（与原文区分展示）
    if (f.caution_plain) {
      fsPlainTip(cardAdverse, '通俗解释', f.caution_plain);
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
    // 异名方（修正版数据库新增 alias_of 字段）
    if (f.alias_of) {
      var aliasItem = document.createElement('p');
      aliasItem.className = 'result-item';
      var b3 = document.createElement('b');
      b3.textContent = '异名方：';
      aliasItem.appendChild(b3);
      aliasItem.appendChild(document.createTextNode(f.alias_of));
      cardCredibility.appendChild(aliasItem);
    }
    var hint = document.createElement('p');
    hint.className = 'result-empty';
    hint.textContent = t('prescription.search.credibilityHint', '出处为古籍原文记载，可信度需结合现代医学研究评估。');
    cardCredibility.appendChild(hint);
  }

  /** 搜索流程 */
  function fsDoSearch() {
    var q = (fsInput.value || '').trim();
    if (!q) return;
    fsQuery = q;
    fsOffset = 0;
    fsLoadedCount = 0;
    fsSetLoading(true);
    window.API.searchFormulas(q, fsPageSize, 0)
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
