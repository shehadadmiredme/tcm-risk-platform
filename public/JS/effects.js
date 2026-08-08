/**
 * 全局交互动效引擎
 * 功能：按钮水波纹、数字递增、滚动揭示、卡片倾斜、粒子爆发
 */

(function() {
    'use strict';

    // ============================================================
    // 1. 按钮水波纹效果（Material Ripple）
    // ============================================================
    function initRipple() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.btn, .bottom-link, .footer-btn, .pill, .search span');
            if (!btn) return;

            // 跳过脉冲动画按钮，避免 overflow:hidden 裁切发光效果
            if (btn.classList.contains('btn-pulse') || btn.classList.contains('btn-pulse-white')) return;

            // 移除旧波纹
            var oldRipple = btn.querySelector('.ripple');
            if (oldRipple) oldRipple.remove();

            var ripple = document.createElement('span');
            ripple.className = 'ripple';

            var rect = btn.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height) * 2;
            var x = e.clientX - rect.left - size / 2;
            var y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = [
                'position: absolute',
                'pointer-events: none',
                'width: ' + size + 'px',
                'height: ' + size + 'px',
                'left: ' + x + 'px',
                'top: ' + y + 'px',
                'border-radius: 50%',
                'background: rgba(255,255,255,0.35)',
                'transform: scale(0)',
                'animation: rippleOut 0.6s ease-out forwards',
                'z-index: 1'
            ].join(';');

            btn.style.position = btn.style.position || 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);

            ripple.addEventListener('animationend', function() {
                ripple.remove();
            });
        });
    }

    // ============================================================
    // 2. 数字递增动画
    // ============================================================
    function initCountUp() {
        var counters = document.querySelectorAll('[data-countup]');
        if (!counters.length) return;

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var target = parseInt(el.getAttribute('data-countup'), 10);
                var suffix = el.getAttribute('data-suffix') || '';
                var prefix = el.getAttribute('data-prefix') || '';
                var duration = parseInt(el.getAttribute('data-duration') || '1500', 10);
                var start = performance.now();

                function update(now) {
                    var elapsed = now - start;
                    var progress = Math.min(elapsed / duration, 1);
                    // easeOutCubic
                    var eased = 1 - Math.pow(1 - progress, 3);
                    var current = Math.round(eased * target);
                    el.textContent = prefix + current + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = prefix + target + suffix;
                    }
                }

                requestAnimationFrame(update);
                observer.unobserve(el);
            });
        }, { threshold: 0.3 });

        counters.forEach(function(el) { observer.observe(el); });
    }

    // ============================================================
    // 3. 滚动揭示动画（Intersection Observer）
    // ============================================================
    function initScrollReveal() {
        var revealEls = document.querySelectorAll('[data-reveal]');

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });

        revealEls.forEach(function(el) {
            el.classList.add('reveal-hidden');
            observer.observe(el);
        });
    }

    // ============================================================
    // 4. 卡片 3D 倾斜效果
    // ============================================================
    function initTilt() {
        var cards = document.querySelectorAll('[data-tilt]');

        cards.forEach(function(card) {
            card.addEventListener('mousemove', function(e) {
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                var centerX = rect.width / 2;
                var centerY = rect.height / 2;
                var rotateX = (y - centerY) / centerY * -6;
                var rotateY = (x - centerX) / centerX * 6;

                card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.02, 1.02, 1.02)';
                card.style.transition = 'transform 0.1s ease';
            });

            card.addEventListener('mouseleave', function() {
                card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
                card.style.transition = 'transform 0.5s ease';
            });
        });
    }

    // ============================================================
    // 5. 打字机效果
    // ============================================================
    function initTypewriter() {
        var els = document.querySelectorAll('[data-typewriter]');
        if (!els.length) return;

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var text = el.getAttribute('data-typewriter') || el.textContent;
                var speed = parseInt(el.getAttribute('data-speed') || '60', 10);
                el.textContent = '';
                var i = 0;

                function type() {
                    if (i < text.length) {
                        el.textContent += text.charAt(i);
                        i++;
                        setTimeout(type, speed + Math.random() * 40);
                    } else {
                        el.classList.add('typewriter-done');
                    }
                }

                type();
                observer.unobserve(el);
            });
        }, { threshold: 0.3 });

        els.forEach(function(el) { observer.observe(el); });
    }

    // ============================================================
    // 6. 光标跟随光晕
    // ============================================================
    function initCursorGlow() {
        var glowAreas = document.querySelectorAll('[data-cursor-glow]');

        glowAreas.forEach(function(area) {
            area.addEventListener('mousemove', function(e) {
                var rect = area.getBoundingClientRect();
                var x = ((e.clientX - rect.left) / rect.width) * 100;
                var y = ((e.clientY - rect.top) / rect.height) * 100;
                area.style.setProperty('--glow-x', x + '%');
                area.style.setProperty('--glow-y', y + '%');
            });
        });
    }

    // ============================================================
    // 7. 粒子爆发（按钮点击时）
    // ============================================================
    function burstParticles(x, y, color) {
        var count = 8;
        for (var i = 0; i < count; i++) {
            var particle = document.createElement('span');
            var angle = (Math.PI * 2 * i) / count;
            var distance = 30 + Math.random() * 20;
            var size = 4 + Math.random() * 6;

            particle.style.cssText = [
                'position: fixed',
                'pointer-events: none',
                'z-index: 9999',
                'width: ' + size + 'px',
                'height: ' + size + 'px',
                'border-radius: 50%',
                'background: ' + color,
                'left: ' + x + 'px',
                'top: ' + y + 'px',
                'transform: translate(-50%, -50%)',
                'animation: particleBurst 0.7s ease-out forwards',
                '--tx: ' + (Math.cos(angle) * distance) + 'px',
                '--ty: ' + (Math.sin(angle) * distance) + 'px'
            ].join(';');

            document.body.appendChild(particle);

            particle.addEventListener('animationend', function() {
                particle.remove();
            });
        }
    }

    function initParticleButtons() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.btn-primary, [data-particle]');
            if (!btn) return;
            burstParticles(e.clientX, e.clientY, 'rgba(15,118,110,0.5)');
        });
    }

    // ============================================================
    // 8. 闪烁骨架屏（自动移除）
    // ============================================================
    function initSkeleton() {
        var skeletons = document.querySelectorAll('[data-skeleton]');
        skeletons.forEach(function(el) {
            el.classList.add('skeleton-shimmer');
            // 2 秒后自动移除骨架效果
            setTimeout(function() {
                el.classList.remove('skeleton-shimmer');
                el.classList.add('skeleton-done');
            }, parseInt(el.getAttribute('data-skeleton') || '2000', 10));
        });
    }

    // ============================================================
    // 移动端导航汉堡切换
    // ============================================================
    function initNavToggle() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.nav-toggle');
            var nav = e.target.closest('.nav');
            if (btn && nav) {
                nav.classList.toggle('open');
                return;
            }
            // 点击菜单项（非「查询」下拉展开区域）后收起导航
            if (nav && !e.target.closest('#insert')) {
                nav.classList.remove('open');
            }
        });
    }

    // ============================================================
    // 初始化所有效果
    // ============================================================
    function initAll() {
        initRipple();
        initCountUp();
        initScrollReveal();
        initTilt();
        initTypewriter();
        initCursorGlow();
        initParticleButtons();
        initSkeleton();
        initNavToggle();
    }

    // DOM 就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

})();
