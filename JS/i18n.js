/**
 * i18n 国际化轻量引擎
 * 基于 data-i18n 属性自动替换 DOM 文本内容
 * 支持 data-i18n-placeholder、data-i18n-alt 等属性
 * 来源参考：GitHub 开源社区常见 i18n 纯 JS 实现模式
 */
var I18N = (function() {
    'use strict';

    var currentLang = 'zh-CN';
    var translations = {};

    /**
     * 注册语言包
     * @param {string} lang - 语言代码
     * @param {object} dict - 翻译字典（支持嵌套 key，如 "nav.home"）
     */
    function register(lang, dict) {
        translations[lang] = dict;
    }

    /**
     * 获取翻译文本
     * @param {string} key - 翻译键（支持点号分隔的嵌套路径）
     * @param {string} fallback - 未找到时的回退文本
     * @returns {string}
     */
    function t(key, fallback) {
        var dict = translations[currentLang];
        if (!dict) return fallback || key;

        // 支持嵌套 key，如 "nav.brand" → dict.nav.brand
        var parts = key.split('.');
        var value = dict;
        for (var i = 0; i < parts.length; i++) {
            if (value == null || typeof value !== 'object') return fallback || key;
            value = value[parts[i]];
        }
        return (value != null) ? String(value) : (fallback || key);
    }

    /**
     * 刷新 DOM：遍历所有带有 data-i18n 属性的元素并替换文本
     */
    function refreshDOM() {
        // data-i18n（文本内容）
        var elements = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var key = el.getAttribute('data-i18n');
            if (!key) continue;
            var text = t(key, el.textContent.trim());
            if (text) el.textContent = text;
        }

        // data-i18n-placeholder
        var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        for (var j = 0; j < placeholders.length; j++) {
            var pel = placeholders[j];
            var pkey = pel.getAttribute('data-i18n-placeholder');
            if (!pkey) continue;
            var ptext = t(pkey, pel.placeholder);
            if (ptext) pel.placeholder = ptext;
        }

        // data-i18n-alt（图片 alt 属性）
        var alts = document.querySelectorAll('[data-i18n-alt]');
        for (var k = 0; k < alts.length; k++) {
            var ael = alts[k];
            var akey = ael.getAttribute('data-i18n-alt');
            if (!akey) continue;
            var atext = t(akey, ael.alt);
            if (atext) ael.alt = atext;
        }

        // data-i18n-title
        var titles = document.querySelectorAll('[data-i18n-title]');
        for (var m = 0; m < titles.length; m++) {
            var tel = titles[m];
            var tkey = tel.getAttribute('data-i18n-title');
            if (!tkey) continue;
            var ttext = t(tkey, tel.title);
            if (ttext) tel.title = ttext;
        }
    }

    /**
     * 切换语言
     * @param {string} lang - 目标语言代码
     */
    function setLang(lang) {
        if (translations[lang]) {
            currentLang = lang;
            try { localStorage.setItem('i18n-lang', lang); } catch(e) {}
            refreshDOM();
            // 更新 html lang 属性
            document.documentElement.lang = lang;
        }
    }

    /**
     * 获取当前语言
     * @returns {string}
     */
    function getLang() {
        return currentLang;
    }

    /**
     * 自动检测并初始化语言
     * 优先级：localStorage > 浏览器语言 > 默认中文
     */
    function autoInit() {
        var saved = null;
        try { saved = localStorage.getItem('i18n-lang'); } catch(e) {}

        var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();

        var lang = saved || (browserLang.indexOf('zh') === 0 ? 'zh-CN' :
                              browserLang.indexOf('en') === 0 ? 'en' : 'zh-CN');

        setLang(lang);
    }

    // 公开 API
    return {
        register: register,
        t: t,
        refreshDOM: refreshDOM,
        setLang: setLang,
        getLang: getLang,
        autoInit: autoInit
    };
})();
