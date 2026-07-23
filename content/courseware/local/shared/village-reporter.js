/**
 * village-reporter.js — 课件完成进度上报
 * 在每个课件的 <head> 中引入：<script src="../shared/village-reporter.js"></script>
 * 自动拦截 celebrate() 调用，上报完成状态到村庄
 */
(function() {
  "use strict";

  var STORAGE_KEY = 'village_state';

  // 检测当前课件属于哪个zone
  function detectZone(filename) {
    if (/^english-/.test(filename)) return 'english';
    if (/^chinese-|^poem-/.test(filename)) return 'chinese';
    if (/^math-/.test(filename)) return 'math';
    if (/^gears-|^science-|^rainforest-|^nature-/.test(filename)) return 'science';
    if (/^story-/.test(filename)) return 'stories';
    // 童谣
    var songPrefixes = ['twinkle','old-macdonald','wheels','bingo','abc-song','head-shoulders',
      'humpty','baa-baa','five-little','hickory','hush-little','if-youre','itsy','jack-and',
      'jack-be','london','mary','mulberry','pat-a','rain-go','ring-around','row-your',
      'silent','skidamarink','three-blind','yankee','cat-and'];
    for (var i = 0; i < songPrefixes.length; i++) {
      if (filename.indexOf(songPrefixes[i]) === 0) return 'songs';
    }
    return null;
  }

  // 计算星星数
  function calculateStars() {
    if (typeof window.quizCorrect !== 'undefined' && typeof window.quizTotal !== 'undefined' && window.quizTotal > 0) {
      var ratio = window.quizCorrect / window.quizTotal;
      if (ratio >= 0.9) return 3;
      if (ratio >= 0.6) return 2;
      return 1;
    }
    return 1;
  }

  // 上报完成
  window.reportCourseComplete = function(stars) {
    var filename = location.pathname.split('/').pop();
    if (!filename || filename === 'index.html') return;

    var zone = detectZone(filename);
    if (!zone) return;

    var state;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? JSON.parse(raw) : null;
    } catch(e) {}
    if (!state) return; // 村庄未初始化

    stars = stars || calculateStars();

    if (!state.zones[zone]) return;

    var isNewCompletion = state.zones[zone].completed.indexOf(filename) === -1;

    if (isNewCompletion) {
      state.zones[zone].completed.push(filename);
      state.zones[zone].totalCompleted++;
      state.totalStars += stars;
      if (!state.zones[zone].firstCompletedAt) {
        state.zones[zone].firstCompletedAt = new Date().toISOString().split('T')[0];
      }
    }
    state.zones[zone].stars[filename] = Math.max(state.zones[zone].stars[filename] || 0, stars);

    // 金币奖励
    var coinsEarned = 0;
    if (isNewCompletion) {
      coinsEarned += 5; // 完成课程 +5
      if (stars >= 3) coinsEarned += 3; // 三星额外 +3
    }

    // 更新每日任务
    var today = new Date().toISOString().split('T')[0];
    var dailyBonus = 0;
    if (state.dailyMission && state.dailyMission.date === today && !state.dailyMission.completed) {
      if (state.dailyMission.zone === zone || state.dailyMission.zone === null) {
        state.dailyMission.completed = true;
        dailyBonus = 10;
      }
    }

    // 连续学习奖励
    var streakBonus = 0;
    if (state.streakDays >= 2) {
      streakBonus = Math.min(state.streakDays, 10) * 2; // 每天+2，最多+20
    }

    // 发放金币
    if (!state.coins) state.coins = 0;
    var totalCoins = coinsEarned + dailyBonus + streakBonus;
    if (totalCoins > 0) {
      state.coins += totalCoins;
    }

    // 物品奖励（仅首次完成）
    if (isNewCompletion) {
      state.pendingReward = true;
    }

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}

    // 显示返回村庄按钮
    showReturnButton(stars, totalCoins);
  };

  // 金币浮动动画
  function showCoinFloat(coinsEarned) {
    var el = document.createElement('div');
    el.textContent = '+' + coinsEarned + ' 金币';
    el.style.cssText = 'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);' +
      'font-size:28px;font-weight:900;color:#FFD700;z-index:9999;' +
      'text-shadow:0 2px 4px rgba(0,0,0,0.3);pointer-events:none;' +
      'font-family:Press Start 2P,Nunito,sans-serif;';
    document.body.appendChild(el);
    if (typeof gsap !== 'undefined') {
      gsap.to(el, { y: -80, opacity: 0, duration: 1.5, ease: 'power2.out', onComplete: function() { el.remove(); } });
    } else {
      el.style.transition = 'all 1.5s ease-out';
      setTimeout(function() { el.style.transform = 'translateX(-50%) translateY(-80px)'; el.style.opacity = '0'; }, 50);
      setTimeout(function() { el.remove(); }, 1600);
    }
  }

  // 显示返回按钮
  function showReturnButton(stars, coinsEarned) {
    if (document.querySelector('.return-village-btn')) return;
    var btn = document.createElement('div');
    btn.className = 'return-village-btn';
    btn.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);' +
      'color:#fff;padding:16px 28px;border-radius:20px;text-align:center;z-index:9998;cursor:pointer;' +
      'border:3px solid #FFD700;font-family:Nunito,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.3);';
    var coinHtml = coinsEarned > 0 ? '<div style="font-size:16px;color:#FFD700;margin-top:6px;">🪙 +' + coinsEarned + ' 金币</div>' : '';
    btn.innerHTML = '<div style="font-size:28px;margin-bottom:6px;">' + '⭐'.repeat(stars || 1) + '</div>' +
      '<div style="font-size:18px;font-weight:700;">返回村庄</div>' +
      coinHtml +
      '<div style="font-size:12px;color:#aaa;margin-top:4px;">看看村庄有什么变化！</div>';
    btn.onclick = function() {
      var filename = location.pathname.split('/').pop();
      window.location.href = '../village.html?justCompleted=' + encodeURIComponent(filename) + '&stars=' + (stars || 1);
    };
    document.body.appendChild(btn);
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(btn, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
    }
    // 金币浮动动画
    if (coinsEarned > 0) {
      setTimeout(function() { showCoinFloat(coinsEarned); }, 600);
    }
  }

  // 拦截 celebrate 函数
  var originalCelebrate = window.celebrate;
  window.celebrate = function() {
    if (typeof originalCelebrate === 'function') originalCelebrate();
    window.reportCourseComplete();
  };

})();
