/**
 * story-template.js — 绘本故事通用渲染引擎
 * 依赖：story-template.css, courseware.js, village-reporter.js
 *
 * 使用方式：
 *   <script src="shared/story-template.js"></script>
 *   <script>
 *     initStory({
 *       title: '勇敢的豌豆射手',
 *       titleEn: 'The Brave Pea Shooter',
 *       unit: 'Story 1',
 *       courseId: 'story-brave-pea-shooter',
 *       pages: [
 *         { img: 'images/minecraft/zombie.png',
 *           en: 'In a bright garden lived a Pea Shooter named Pip.',
 *           zh: '在一个明亮的花园里，住着一只豌豆射手，名叫皮皮。',
 *           keys: [{w:'bright',p:'/braɪt/',zh:'明亮的'},{w:'garden',p:'/ˈɡɑːrdən/',zh:'花园'}] },
 *         ...
 *       ]
 *     });
 *   </script>
 */
(function() {
  'use strict';

  var cur = 0;
  var DATA = null;
  var synth = window.speechSynthesis;

  window.initStory = function(config) {
    DATA = config;
    document.title = config.title + ' | 儿童绘本';
    buildHTML();
    renderPage(0);
    bindEvents();
  };

  function buildHTML() {
    document.body.innerHTML =
      '<div class="reader-wrap">' +
        '<div class="reader-header">' +
          '<div class="story-unit">' + esc(DATA.unit || '') + '</div>' +
          '<h2>' + esc(DATA.title) + '<br><small>' + esc(DATA.titleEn || '') + '</small></h2>' +
          '<a class="back-link" href="../stories-index.html">← 返回故事列表</a>' +
        '</div>' +
        '<div class="progress-bar-wrap"><div class="progress-bar-fill" id="progressFill"></div></div>' +
        '<div id="pageArea"></div>' +
      '</div>' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="prevBtn" onclick="storyPrev()">◀</button>' +
        '<div class="nav-center">' +
          '<button class="speak-btn" id="speakBtn" onclick="storySpeak()" title="朗读本页">🔊</button>' +
          '<div class="dots" id="dots"></div>' +
        '</div>' +
        '<button class="nav-btn" id="nextBtn" onclick="storyNext()">▶</button>' +
      '</div>' +
      '<script src="shared/village-animals.js"><\/script>';
  }

  function renderPage(i) {
    var area = document.getElementById('pageArea');
    var total = DATA.pages.length;

    // Cover page
    if (i === 0) {
      var first = DATA.pages[0];
      area.innerHTML =
        '<div class="page active">' +
          '<div class="cover-page">' +
            (first.img
              ? '<img class="cover-img" src="' + esc(first.img) + '" alt="' + esc(DATA.title) + '" onerror="this.style.display=\'none\'">'
              : '<div class="cover-emoji">' + esc(first.emoji || '📖') + '</div>') +
            '<div class="cover-title">' + esc(DATA.title) + '</div>' +
            '<div class="cover-subtitle">' + esc(DATA.titleEn || '') + '</div>' +
            '<div class="cover-hint">📖 点击翻页开始阅读</div>' +
          '</div>' +
        '</div>';
      updateUI(i, total);
      return;
    }

    // Celebration (last page)
    if (i === total - 1) {
      var last = DATA.pages[i];
      area.innerHTML =
        '<div class="page active">' +
          '<div class="celebration-page">' +
            '<div class="celebrate-emoji">' + esc(last.emoji || '🎉') + '</div>' +
            '<h2 style="font-size:24px;margin-bottom:8px;">🎉 ' + esc(DATA.title) + '</h2>' +
            '<div class="badge">太棒了！</div>' +
            '<div class="celebrate-text">' + esc(last.zh || last.en || '你读完了这个故事！') + '</div>' +
            '<button class="btn-replay" onclick="storyGoTo(0)">再读一遍 🔄</button>' +
          '</div>' +
        '</div>';
      updateUI(i, total);
      reportCompletion();
      return;
    }

    // Story page
    var p = DATA.pages[i];
    var words = (p.en || '').split(' ').map(function(w, idx) {
      var clean = w.replace(/[.,!?'"()]/g, '');
      return '<span class="word" id="w' + idx + '" onclick="storyWordTip(this,\'' + esc(clean) + '\')">' + esc(w) + '</span>';
    }).join(' ');

    var vocabCards = (p.keys || []).map(function(k) {
      return '<div class="vocab-card" onclick="storySpeakWord(\'' + esc(k.w) + '\')">' +
        '<div class="vw">' + esc(k.w) + '</div>' +
        '<div class="vp">' + esc(k.p || '') + '</div>' +
        '<div class="vz">' + esc(k.zh || '') + '</div>' +
      '</div>';
    }).join('');

    area.innerHTML =
      '<div class="page active">' +
        '<div class="story-page">' +
          (p.img
            ? '<img class="page-img" src="' + esc(p.img) + '" alt="page ' + i + '" onerror="this.style.display=\'none\'">'
            : '<div class="page-emoji">' + esc(p.emoji || '📖') + '</div>') +
          '<div class="text-area">' +
            '<div class="en-sentence">' + words + '</div>' +
            '<div class="zh-sentence hidden" id="zhSent" onclick="this.classList.toggle(\'hidden\')">' +
              esc(p.zh || '') +
            '</div>' +
            (vocabCards ? '<div class="vocab-row">' + vocabCards + '</div>' : '') +
          '</div>' +
          '<div class="page-num">' + i + ' / ' + (total - 1) + '</div>' +
        '</div>' +
      '</div>';

    updateUI(i, total);
  }

  function updateUI(i, total) {
    // Progress bar
    var fill = document.getElementById('progressFill');
    if (fill) fill.style.width = ((i + 1) / total * 100) + '%';

    // Dots
    var dotsEl = document.getElementById('dots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (var d = 0; d < total; d++) {
        var dot = document.createElement('span');
        dot.className = 'dot' + (d === i ? ' active' : '');
        dot.setAttribute('data-page', d);
        dot.onclick = (function(idx) { return function() { storyGoTo(idx); }; })(d);
        dotsEl.appendChild(dot);
      }
    }

    // Nav buttons
    var prev = document.getElementById('prevBtn');
    var next = document.getElementById('nextBtn');
    if (prev) prev.disabled = (i === 0);
    if (next) next.disabled = (i === total - 1);

    cur = i;
    if (synth) synth.cancel();
  }

  function reportCompletion() {
    if (typeof window.villageReporter !== 'undefined' && window.villageReporter.report) {
      window.villageReporter.report(DATA.courseId || 'story', 3);
    }
  }

  // Navigation
  window.storyGoTo = function(idx) {
    if (!DATA || idx < 0 || idx >= DATA.pages.length) return;
    renderPage(idx);
    window.scrollTo(0, 0);
  };
  window.storyPrev = function() { storyGoTo(cur - 1); };
  window.storyNext = function() { storyGoTo(cur + 1); };

  // TTS: read current page
  window.storySpeak = function() {
    if (!synth || !DATA) return;
    synth.cancel();
    var p = DATA.pages[cur];
    if (!p || !p.en) return;

    // Try MP3 first
    var courseName = DATA.courseId || '';
    var pageIdx = cur;
    var mp3Path = '../audio/' + courseName + '/page-' + pageIdx + '.mp3';

    var audio = new Audio(mp3Path);
    audio.onerror = function() {
      // Fallback to word-by-word speech
      speakWords(p.en);
    };
    audio.play().catch(function() {
      speakWords(p.en);
    });
  };

  function speakWords(text) {
    var words = text.split(' ');
    var idx = 0;
    function next() {
      if (idx >= words.length) {
        document.querySelectorAll('.word').forEach(function(el) { el.classList.remove('speaking'); });
        return;
      }
      document.querySelectorAll('.word').forEach(function(el) { el.classList.remove('speaking'); });
      var el = document.getElementById('w' + idx);
      if (el) el.classList.add('speaking');
      var utt = new SpeechSynthesisUtterance(words[idx]);
      utt.lang = 'en-GB';
      utt.rate = 0.8;
      utt.onend = function() { idx++; next(); };
      synth.speak(utt);
    }
    next();
  }

  // Word tooltip + pronunciation
  window.storyWordTip = function(el, word) {
    storySpeakWord(word);
    // Show tooltip if vocab exists
    var tip = el.querySelector('.word-tip');
    if (tip) { tip.remove(); return; }
    var p = DATA.pages[cur];
    if (!p.keys) return;
    var key = p.keys.find(function(k) { return k.w.toLowerCase() === word.toLowerCase(); });
    if (key) {
      var span = document.createElement('span');
      span.className = 'word-tip';
      span.style.cssText = 'display:inline-block;font-size:13px;color:#888;background:#f8f8f8;border-radius:6px;padding:2px 8px;margin-left:4px;';
      span.textContent = key.p + ' ' + key.zh;
      el.appendChild(span);
    }
  };

  window.storySpeakWord = function(word) {
    if (!synth) return;
    synth.cancel();
    var utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-GB';
    utt.rate = 0.7;
    synth.speak(utt);
  };

  // Touch swipe
  function bindEvents() {
    var sx = 0, swiping = false;
    document.addEventListener('touchstart', function(e) {
      sx = e.changedTouches[0].clientX;
      swiping = true;
    }, {passive: true});
    document.addEventListener('touchend', function(e) {
      if (!swiping) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) { dx < 0 ? storyNext() : storyPrev(); }
      swiping = false;
    }, {passive: true});

    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight') storyNext();
      if (e.key === 'ArrowLeft') storyPrev();
      if (e.key === 'Home') storyGoTo(0);
    });
  }

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
