/**
 * village.js — 我的学习村庄 状态管理与交互逻辑
 * 依赖：GSAP（CDN），village.css，village.html
 */
(function() {
  "use strict";

  /* ===== 配置 ===== */
  var STORAGE_KEY = 'village_state';

  var ZONE_CONFIG = {
    english: {
      name: '英语学校', icon: '🏫', color: '#4FC3F7',
      coursewarePrefix: ['english-'],
      description: 'Steve 和 Alex 在这里学英语！',
      totalCount: 25, unlockRequirement: 0
    },
    chinese: {
      name: '中文图书馆', icon: '📚', color: '#FF8A65',
      coursewarePrefix: ['chinese-'],
      description: 'Bob 爷爷在这里讲故事！',
      totalCount: 25, unlockRequirement: 0
    },
    math: {
      name: '数学集市', icon: '🔢', color: '#81C784',
      coursewarePrefix: ['math-'],
      description: '买卖东西，学数学！',
      totalCount: 25, unlockRequirement: 3, requiredZone: 'english'
    },
    songs: {
      name: '音乐舞台', icon: '🎵', color: '#F48FB1',
      coursewarePrefix: ['twinkle','old-macdonald','wheels','bingo','abc-song','head-shoulders','humpty','baa-baa','five-little','hickory','humpty','hush-little','if-youre','itsy','jack-and','jack-be','london','mary','mulberry','pat-a','rain-go','ring-around','row-your','silent','skidamarink','three-blind','yankee','cat-and'],
      description: '唱歌跳舞！',
      totalCount: 27, unlockRequirement: 0
    },
    science: {
      name: '科学实验室', icon: '🔬', color: '#B39DDB',
      coursewarePrefix: ['gears-','science-','rainforest-','nature-'],
      description: '齿轮、太阳系、大冒险！',
      totalCount: 8, unlockRequirement: 0
    },
    stories: {
      name: '绘本故事屋', icon: '📖', color: '#E67E22',
      coursewarePrefix: ['story-'],
      description: '精彩的故事绘本等你来读！',
      totalCount: 17, unlockRequirement: 0
    }
  };

  var DECORATION_RULES = [
    { id: 'school_flag', zone: 'english', condition: function(s) { return s.zones.english.totalCompleted >= 3; },
      message: '学校门口多了一面旗帜！', speak: '英语学了三课，学校更漂亮了！' },
    { id: 'library_bookshelf', zone: 'chinese', condition: function(s) { return s.zones.chinese.totalCompleted >= 5; },
      message: '图书馆多了好多书！', speak: '语文学了五课，图书馆装满了书！' },
    { id: 'village_lamp', zone: null, condition: function(s) { return s.totalStars >= 10; },
      message: '村庄中央亮起了路灯！', speak: '收集了十颗星星，村庄更亮了！' },
    { id: 'bob_resident', zone: null, condition: function(s) {
        var total = 0; Object.keys(s.zones).forEach(function(k) { total += s.zones[k].totalCompleted; });
        return total >= 10;
      }, message: 'Bob 爷爷搬进村庄住了！', speak: 'Bob 爷爷说：你学了这么多，我要住在这里陪你！' },
    { id: 'secret_chest', zone: null, condition: function(s) { return s.streakDays >= 3; },
      message: '发现了一个神秘宝箱！', speak: '连续三天来学习，发现了宝藏！' },
    { id: 'rainbow', zone: null, condition: function(s) {
        return Object.keys(s.zones).every(function(k) { return s.zones[k].totalCompleted >= 1; });
      }, message: '彩虹出现了！', speak: '每个地方都去了一次，天空出现了彩虹！' }
  ];

  var DAILY_TASKS = [
    { task: '完成一节英语课', zone: 'english', reward: 2 },
    { task: '唱一首童谣', zone: 'songs', reward: 1 },
    { task: '做三道数学题', zone: 'math', reward: 2 },
    { task: '读一个中文故事', zone: 'chinese', reward: 2 },
    { task: '探索科学实验室', zone: 'science', reward: 3 },
    { task: '读一个绘本故事', zone: 'stories', reward: 2 },
    { task: '今天学两门课', zone: null, reward: 3 }
  ];

  var STEVE_LINES = [
    '今天想去哪里学习？', '我们去图书馆吧！', '数学集市有好吃的！',
    '嘿！Alex 在等你！', '你真棒！继续加油！', '去看看新的故事吧！',
    '学完回来，村庄会有惊喜！'
  ];

  /* ===== 金币系统配置 ===== */
  var COIN_REWARDS = {
    courseComplete: 5,      // 完成1课
    coursePerfect: 3,       // 3星额外
    dailyMission: 10,       // 每日任务
    streakBonus: 2          // 连续学习每天额外
  };

  var SHOP_ITEMS = [
    { id: 'bread', name: '面包', icon: '🍞', price: 5, type: 'food', growth: 5, desc: '普通食物，宠物爱吃' },
    { id: 'apple', name: '苹果', icon: '🍎', price: 8, type: 'food', growth: 8, desc: '新鲜苹果，营养丰富' },
    { id: 'cake', name: '蛋糕', icon: '🎂', price: 15, type: 'food', growth: 15, desc: '美味蛋糕，成长加倍' },
    { id: 'cookie', name: '饼干', icon: '🍪', price: 10, type: 'food', growth: 10, desc: '香脆饼干' },
    { id: 'hat', name: '小帽子', icon: '🎩', price: 20, type: 'accessory', desc: '给宠物戴的帽子' },
    { id: 'scarf', name: '围巾', icon: '🧣', price: 20, type: 'accessory', desc: '温暖的围巾' },
    { id: 'bow', name: '蝴蝶结', icon: '🎀', price: 15, type: 'accessory', desc: '可爱的蝴蝶结' },
    { id: 'star_deco', name: '星星装饰', icon: '⭐', price: 30, type: 'village_deco', desc: '给村庄加一颗星星' }
  ];

  var PET_TYPES = [
    { id: 'cat', name: '猫', icon: '🐱', stages: ['🐱', '😺', '😸', '😻'] },
    { id: 'dog', name: '狗', icon: '🐶', stages: ['🐶', '🐕', '🦮', '🐕‍🦺'] },
    { id: 'parrot', name: '鹦鹉', icon: '🦜', stages: ['🐦', '🦜', '🦜', '🦜'] },
    { id: 'fox', name: '狐狸', icon: '🦊', stages: ['🦊', '🦊', '🦊', '🦊'] },
    { id: 'rabbit', name: '兔子', icon: '🐰', stages: ['🐰', '🐇', '🐇', '🐇'] },
    { id: 'panda', name: '熊猫', icon: '🐼', stages: ['🐼', '🐼', '🐼', '🐼'] }
  ];

  var PET_STAGES = [
    { name: '幼崽', minGrowth: 0, scale: 0.8 },
    { name: '少年', minGrowth: 50, scale: 1.0 },
    { name: '成年', minGrowth: 150, scale: 1.2 },
    { name: '传说', minGrowth: 300, scale: 1.4, glow: true }
  ];

  /* ===== 状态管理 ===== */
  function getDefaultState() {
    var zones = {};
    Object.keys(ZONE_CONFIG).forEach(function(k) {
      zones[k] = { completed: [], stars: {}, totalCompleted: 0, firstCompletedAt: '' };
    });
    return {
      version: 2, lastVisit: '', totalStars: 0, streakDays: 0,
      zones: zones,
      decorations: { school_flag: false, library_bookshelf: false, village_lamp: false,
                     bob_resident: false, secret_chest: false, rainbow: false },
      dailyMission: { date: '', task: '', zone: null, reward: 0, completed: false },
      coins: 0,
      pet: { type: '', name: '', growth: 0, mood: 100, hunger: 100, stage: 0, accessories: [], lastFeed: '' },
      purchasedItems: []
    };
  }

  window.loadVillageState = function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      var state = JSON.parse(raw);
      // 迁移：确保所有字段存在
      var def = getDefaultState();
      Object.keys(def.zones).forEach(function(k) {
        if (!state.zones[k]) state.zones[k] = def.zones[k];
      });
      if (!state.decorations) state.decorations = def.decorations;
      if (!state.dailyMission) state.dailyMission = def.dailyMission;
      if (typeof state.coins === 'undefined') state.coins = 0;
      if (!state.pet) state.pet = def.pet;
      if (!state.purchasedItems) state.purchasedItems = [];
      if (typeof state.pet.hunger === 'undefined') state.pet.hunger = 100;
      if (typeof state.pet.lastFeed === 'undefined') state.pet.lastFeed = '';
      return state;
    } catch(e) { return getDefaultState(); }
  };

  window.saveVillageState = function(state) {
    try {
      // Preserve petHub sub-object written by pet-hub.html
      var raw = localStorage.getItem(STORAGE_KEY);
      var existing = raw ? JSON.parse(raw) : {};
      if (existing.petHub) state.petHub = existing.petHub;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(e) {}
  };

  /* ===== 连续天数 ===== */
  function updateStreak(state) {
    var today = new Date().toISOString().split('T')[0];
    var last = state.lastVisit;
    if (!last) { state.streakDays = 1; }
    else {
      var dayDiff = Math.round((new Date(today) - new Date(last)) / 86400000);
      if (dayDiff === 1) state.streakDays++;
      else if (dayDiff > 1) state.streakDays = 1;
    }
    state.lastVisit = today;
    return state;
  }

  /* ===== 每日任务 ===== */
  function getDailyMission(state) {
    var today = new Date().toISOString().split('T')[0];
    if (state.dailyMission.date === today) return state.dailyMission;
    // 倾向最弱区域
    var weakest = null, minCompleted = Infinity;
    Object.keys(state.zones).forEach(function(k) {
      if (state.zones[k].totalCompleted < minCompleted) {
        minCompleted = state.zones[k].totalCompleted;
        weakest = k;
      }
    });
    var task = DAILY_TASKS.find(function(t) { return t.zone === weakest; }) || DAILY_TASKS[0];
    var mission = { date: today, task: task.task, zone: task.zone, reward: task.reward, completed: false };
    state.dailyMission = mission;
    saveVillageState(state);
    return mission;
  }

  /* ===== 解锁判断 ===== */
  window.isZoneUnlocked = function(zone, state) {
    var config = ZONE_CONFIG[zone];
    var req = config.unlockRequirement;
    if (req === 0) return true;
    // 如果指定了 requiredZone，检查该特定zone的完成数
    if (config.requiredZone) {
      return (state.zones[config.requiredZone] || {}).totalCompleted >= req;
    }
    // 否则检查所有zone的总完成数
    var totalOther = 0;
    Object.keys(state.zones).forEach(function(k) {
      if (k !== zone) totalOther += state.zones[k].totalCompleted;
    });
    return totalOther >= req;
  };

  /* ===== 渲染 ===== */
  function renderVillage(state) {
    // 星星数
    var starEl = document.getElementById('starCount');
    if (starEl) starEl.textContent = state.totalStars;
    // 连续天数
    var streakEl = document.getElementById('streakBadge');
    if (streakEl) streakEl.textContent = state.streakDays;
    // 各区域进度
    Object.keys(ZONE_CONFIG).forEach(function(zone) {
      var z = state.zones[zone];
      var el = document.getElementById('progress' + zone.charAt(0).toUpperCase() + zone.slice(1));
      if (el) el.textContent = z.totalCompleted + '/' + ZONE_CONFIG[zone].totalCount;
    });
    // 装饰
    renderDecorations(state);
    // 每日任务
    renderDailyMission(state);
  }

  function renderDecorations(state) {
    DECORATION_RULES.forEach(function(rule) {
      var el = document.getElementById('deco' + rule.id.split('_').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(''));
      if (!el) {
        // 尝试其他ID格式
        el = document.querySelector('[data-decoration="' + rule.id + '"]');
      }
      if (el && state.decorations[rule.id]) {
        el.classList.add('visible');
        el.classList.remove('hidden');
      }
      // 特殊处理旗帜和书架
      if (rule.id === 'school_flag' && state.decorations.school_flag) {
        var flag = document.getElementById('flagEnglish');
        if (flag) flag.classList.add('unlocked');
      }
      if (rule.id === 'library_bookshelf' && state.decorations.library_bookshelf) {
        var shelf = document.getElementById('bookshelfChinese');
        if (shelf) shelf.classList.add('unlocked');
      }
    });
  }

  function renderDailyMission(state) {
    var mission = getDailyMission(state);
    var taskEl = document.getElementById('dailyTaskText');
    var rewardEl = document.getElementById('dailyReward');
    var statusEl = document.getElementById('dailyStatus');
    if (taskEl) taskEl.textContent = mission.task;
    if (rewardEl) rewardEl.textContent = '奖励：' + '⭐'.repeat(mission.reward);
    if (statusEl) {
      statusEl.textContent = mission.completed ? '✅ 已完成' : '未完成';
      statusEl.className = 'board-status' + (mission.completed ? ' done' : '');
    }
  }

  /* ===== 点击建筑 ===== */
  window.onBuildingClick = function(zone) {
    var config = ZONE_CONFIG[zone];
    var state = loadVillageState();
    if (!isZoneUnlocked(zone, state)) {
      showLockMessage(config, zone, state);
      return;
    }
    openZonePanel(zone, config, state);
  };

  function showLockMessage(config, zone, state) {
    var req = config.unlockRequirement;
    if (config.requiredZone) {
      var done = (state.zones[config.requiredZone] || {}).totalCompleted || 0;
      var zoneName = ZONE_CONFIG[config.requiredZone].name;
      var remaining = Math.max(0, req - done);
      showSpeechBubbleGlobal(config.icon + ' 还需要完成 ' + remaining + ' 课' + zoneName + '才能解锁！');
    } else {
      var totalCompleted = 0;
      Object.keys(state.zones).forEach(function(k) { totalCompleted += state.zones[k].totalCompleted; });
      var remaining2 = Math.max(0, req - totalCompleted);
      showSpeechBubbleGlobal(config.icon + ' 还需要完成 ' + remaining2 + ' 课才能解锁！');
    }
  }

  /* ===== 课件列表面板 ===== */
  window.openZonePanel = function(zone, config, state) {
    var panel = document.getElementById('zonePanel');
    var overlay = document.getElementById('panelOverlay');
    document.getElementById('panelIcon').textContent = config.icon;
    document.getElementById('panelTitle').textContent = config.name;
    document.getElementById('panelDesc').textContent = config.description;

    var completed = state.zones[zone].totalCompleted;
    var total = config.totalCount;
    var pct = total > 0 ? Math.round(completed / total * 100) : 0;
    document.getElementById('panelProgressFill').style.width = pct + '%';
    document.getElementById('panelProgressText').textContent = completed + '/' + total;

    // 生成课件列表
    var list = document.getElementById('courseList');
    var courses = getCoursewareList(zone);
    list.innerHTML = courses.map(function(c) {
      var isCompleted = state.zones[zone].completed.indexOf(c.file) !== -1;
      var lessonTag = c.lesson ? '<span class="meta-tag">' + c.lesson + '</span>' : '';
      var durationTag = c.duration ? '<span class="meta-tag">' + c.duration + '</span>' : '';
      return '<div class="course-card' + (isCompleted ? ' completed' : '') + '" onclick="openCourse(\'' + c.file + '\',\'' + zone + '\')">' +
        '<div class="card-cover" style="background:' + c.bg + '">' +
          '<div class="card-cover-pattern"></div>' +
          '<span class="card-emoji">' + (isCompleted ? '⭐' : c.emoji) + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-title">' + c.title + '</div>' +
          (lessonTag || durationTag ? '<div class="card-meta">' + lessonTag + durationTag + '</div>' : '') +
          '<div class="card-status">' + (isCompleted ? '已完成 ✅' : '未完成') + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    panel.classList.add('open');
    if (overlay) overlay.classList.add('show');
  };

  window.closeZonePanel = function() {
    document.getElementById('zonePanel').classList.remove('open');
    var overlay = document.getElementById('panelOverlay');
    if (overlay) overlay.classList.remove('show');
  };

  /* ===== 课件封面配置 ===== */
  var COURSE_COVERS = {
    // 英语 — 绿色系
    'english-01-hello.html':       { bg: 'linear-gradient(135deg,#C8E6C9,#81C784)', emoji: '👋', lesson: '第1课', duration: '10分钟' },
    'english-02-abc.html':         { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🅰️', lesson: '第2课', duration: '12分钟' },
    'english-03-abc-nz.html':      { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🅱️', lesson: '第3课', duration: '12分钟' },
    'english-04-colors.html':      { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '🌈', lesson: '第4课', duration: '10分钟' },
    'english-05-numbers.html':     { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🔢', lesson: '第5课', duration: '10分钟' },
    'english-06-family.html':      { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '👨‍👩‍👧', lesson: '第6课', duration: '10分钟' },
    'english-07-animals.html':     { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🐾', lesson: '第7课', duration: '12分钟' },
    'english-08-body.html':        { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🖐️', lesson: '第8课', duration: '10分钟' },
    'english-09-food.html':        { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🍕', lesson: '第9课', duration: '10分钟' },
    'english-10-toys.html':        { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '🧸', lesson: '第10课', duration: '10分钟' },
    'english-11-weather.html':     { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '☀️', lesson: '第11课', duration: '10分钟' },
    'english-12-clothes.html':     { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '👗', lesson: '第12课', duration: '10分钟' },
    'english-13-actions.html':     { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🏃', lesson: '第13课', duration: '12分钟' },
    'english-14-places.html':      { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🏠', lesson: '第14课', duration: '10分钟' },
    'english-15-feelings.html':    { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '😊', lesson: '第15课', duration: '10分钟' },
    'english-16-time.html':        { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '⏰', lesson: '第16课', duration: '10分钟' },
    'english-17-transport.html':   { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🚗', lesson: '第17课', duration: '10分钟' },
    'english-18-review.html':      { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '✅', lesson: '复习', duration: '15分钟' },
    'english-19-lost-cat.html':    { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🐱', lesson: '第18课', duration: '12分钟' },
    'english-20-storm.html':       { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '⛈️', lesson: '第19课', duration: '12分钟' },
    'english-21-birthday.html':    { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '🎂', lesson: '第20课', duration: '12分钟' },
    'english-22-farm.html':        { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🐄', lesson: '第21课', duration: '12分钟' },
    'english-23-treasure.html':    { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '💎', lesson: '第22课', duration: '15分钟' },
    'english-24-review.html':      { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '🏆', lesson: '总复习', duration: '15分钟' },
    'english-colors.html':         { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '🎨', lesson: '拓展', duration: '10分钟' },

    // 中文 — 红色系
    'chinese-01-characters.html':  { bg: 'linear-gradient(135deg,#FAD0E0,#EF5350)', emoji: '📖', lesson: '第1课', duration: '10分钟' },
    'chinese-02-strokes.html':     { bg: 'linear-gradient(135deg,#FAD0E0,#EF5350)', emoji: '✒️', lesson: '第2课', duration: '12分钟' },
    'chinese-03-heaven-earth.html':{ bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '天地', lesson: '第3课', duration: '10分钟' },
    'chinese-04-nature.html':      { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🌿', lesson: '第4课', duration: '10分钟' },
    'chinese-05-family.html':      { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '家', lesson: '第5课', duration: '10分钟' },
    'chinese-06-school.html':      { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🏫', lesson: '第6课', duration: '10分钟' },
    'chinese-07-pinyin.html':      { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '🔤', lesson: '第7课', duration: '12分钟' },
    'chinese-08-pinyin2.html':     { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '🗣️', lesson: '第8课', duration: '12分钟' },
    'chinese-09-shengmu1.html':    { bg: 'linear-gradient(135deg,#FAD0E0,#EF5350)', emoji: '🅰️', lesson: '第9课', duration: '12分钟' },
    'chinese-10-shengmu2.html':    { bg: 'linear-gradient(135deg,#FAD0E0,#EF5350)', emoji: '🅱️', lesson: '第10课', duration: '12分钟' },
    'chinese-11-shengmu3.html':    { bg: 'linear-gradient(135deg,#FAD0E0,#EF5350)', emoji: '🆎', lesson: '第11课', duration: '12分钟' },
    'chinese-12-yunmu.html':       { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '🎵', lesson: '第12课', duration: '12分钟' },
    'chinese-13-body.html':        { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '🖐️', lesson: '第13课', duration: '10分钟' },
    'chinese-14-colors.html':      { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '🌈', lesson: '第14课', duration: '10分钟' },
    'chinese-15-food.html':        { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🍜', lesson: '第15课', duration: '10分钟' },
    'chinese-16-actions.html':     { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🏃', lesson: '第16课', duration: '10分钟' },
    'chinese-17-direction-time.html': { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🧭', lesson: '第17课', duration: '10分钟' },
    'chinese-18-animals.html':     { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🐾', lesson: '第18课', duration: '10分钟' },
    'chinese-19-compound.html':    { bg: 'linear-gradient(135deg,#FAD0E0,#EF5350)', emoji: '合', lesson: '第19课', duration: '12分钟' },
    'chinese-20-reading.html':     { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '📚', lesson: '第20课', duration: '12分钟' },
    'chinese-21-antonyms.html':    { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '↔️', lesson: '第21课', duration: '10分钟' },
    'chinese-22-qa.html':          { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '❓', lesson: '第22课', duration: '10分钟' },
    'chinese-23-poems.html':       { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '📜', lesson: '第23课', duration: '12分钟' },
    'chinese-24-adventure.html':   { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🗺️', lesson: '第24课', duration: '15分钟' },
    'chinese-magic-characters.html': { bg: 'linear-gradient(135deg,#FAD0E0,#EF5350)', emoji: '✨', lesson: '拓展', duration: '10分钟' },

    // 数学 — 蓝色系
    'math-01-counting.html':       { bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '🔢', lesson: '第1课', duration: '10分钟' },
    'math-02-counting-11to20.html':{ bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '🔟', lesson: '第2课', duration: '10分钟' },
    'math-03-compare.html':        { bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '⚖️', lesson: '第3课', duration: '10分钟' },
    'math-04-addition.html':       { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '➕', lesson: '第4课', duration: '12分钟' },
    'math-05-addition10.html':     { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🔟', lesson: '第5课', duration: '12分钟' },
    'math-06-subtraction5.html':   { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '➖', lesson: '第6课', duration: '12分钟' },
    'math-07-subtraction10.html':  { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '➖', lesson: '第7课', duration: '12分钟' },
    'math-08-addition20.html':     { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '➕', lesson: '第8课', duration: '12分钟' },
    'math-09-subtraction20.html':  { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '➖', lesson: '第9课', duration: '12分钟' },
    'math-10-shapes.html':         { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '🔷', lesson: '第10课', duration: '10分钟' },
    'math-11-measurement.html':    { bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '📏', lesson: '第11课', duration: '10分钟' },
    'math-12-review.html':         { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🔄', lesson: '复习', duration: '15分钟' },
    'math-13-numbers100.html':     { bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '💯', lesson: '第12课', duration: '12分钟' },
    'math-14-addsub2digit.html':   { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🧮', lesson: '第13课', duration: '15分钟' },
    'math-15-money.html':          { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '💰', lesson: '第14课', duration: '12分钟' },
    'math-16-clock.html':          { bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '🕐', lesson: '第15课', duration: '10分钟' },
    'math-17-shapes.html':         { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '📐', lesson: '第16课', duration: '10分钟' },
    'math-18-sorting.html':        { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '📊', lesson: '第17课', duration: '10分钟' },
    'math-19-statistics.html':     { bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '📈', lesson: '第18课', duration: '12分钟' },
    'math-20-direction.html':      { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '🧭', lesson: '第19课', duration: '10分钟' },
    'math-21-multiplication.html': { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '✖️', lesson: '第20课', duration: '12分钟' },
    'math-22-fractions.html':      { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '🍕', lesson: '第21课', duration: '12分钟' },
    'math-23-word-problems.html':  { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '📝', lesson: '第22课', duration: '15分钟' },
    'math-24-carnival.html':       { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '🎪', lesson: '总复习', duration: '15分钟' },
    'math-numbers-1-10.html':      { bg: 'linear-gradient(135deg,#B5D4F4,#42A5F5)', emoji: '1️⃣', lesson: '拓展', duration: '10分钟' },

    // 童谣 — 暖色系
    'twinkle-twinkle.html':        { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '⭐', lesson: '第1首', duration: '3分钟' },
    'old-macdonald.html':          { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🚜', lesson: '第2首', duration: '4分钟' },
    'wheels-on-bus.html':          { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🚌', lesson: '第3首', duration: '3分钟' },
    'bingo.html':                  { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🐕', lesson: '第4首', duration: '3分钟' },
    'abc-song.html':               { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🔤', lesson: '第5首', duration: '3分钟' },
    'head-shoulders.html':         { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🧒', lesson: '第6首', duration: '3分钟' },
    'humpty-dumpty.html':          { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '🥚', lesson: '第7首', duration: '3分钟' },
    'baa-baa-black-sheep.html':    { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🐑', lesson: '第8首', duration: '2分钟' },
    'five-little-monkeys.html':    { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🐒', lesson: '第9首', duration: '3分钟' },
    'hickory-dickory.html':        { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🐭', lesson: '第10首', duration: '2分钟' },
    'hush-little-baby.html':       { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🤱', lesson: '第11首', duration: '4分钟' },
    'if-youre-happy.html':        { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '👏', lesson: '第12首', duration: '3分钟' },
    'itsy-bitsy-spider.html':     { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🕷️', lesson: '第13首', duration: '2分钟' },
    'jack-and-jill.html':          { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🏔️', lesson: '第14首', duration: '2分钟' },
    'jack-be-nimble.html':         { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🕯️', lesson: '第15首', duration: '2分钟' },
    'london-bridge.html':          { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🌉', lesson: '第16首', duration: '3分钟' },
    'mary-lamb.html':              { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🐑', lesson: '第17首', duration: '3分钟' },
    'mulberry-bush.html':          { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🌳', lesson: '第18首', duration: '3分钟' },
    'pat-a-cake.html':             { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🎂', lesson: '第19首', duration: '2分钟' },
    'rain-go-away.html':           { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🌧️', lesson: '第20首', duration: '2分钟' },
    'ring-around-rosy.html':       { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🌹', lesson: '第21首', duration: '2分钟' },
    'row-your-boat.html':          { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🚣', lesson: '第22首', duration: '2分钟' },
    'silent-night.html':           { bg: 'linear-gradient(135deg,#1A1A2E,#3D5A80)', emoji: '🌙', lesson: '第23首', duration: '4分钟' },
    'skidamarink.html':            { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '💕', lesson: '第24首', duration: '3分钟' },
    'three-blind-mice.html':       { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🐭', lesson: '第25首', duration: '2分钟' },
    'yankee-doodle.html':          { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🎩', lesson: '第26首', duration: '3分钟' },
    'cat-and-fiddle.html':         { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🐱', lesson: '第27首', duration: '3分钟' },

    // 科学 — 紫/绿系
    'gears-transmission.html':     { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '⚙️', lesson: '第1课', duration: '15分钟' },
    'rainforest-adventure.html':   { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🌴', lesson: '第2课', duration: '15分钟' },
    'nature-lesson-4.html':        { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🦋', lesson: '第3课', duration: '12分钟' },
    'i-am-an-apple.html':          { bg: 'linear-gradient(135deg,#FFD166,#FF6B35)', emoji: '🍎', lesson: '第4课', duration: '10分钟' },
    'phonics-fat-cat.html':        { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🐱', lesson: '第5课', duration: '10分钟' },
    'sight-word-tales-can-we-get-a-pet.html': { bg: 'linear-gradient(135deg,#FFE4D6,#FF6B35)', emoji: '🐶', lesson: '第6课', duration: '10分钟' },
    'sight-word-tales-come-to-the-party.html': { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🎉', lesson: '第7课', duration: '10分钟' },
    'elephant-piggie-surprise.html': { bg: 'linear-gradient(135deg,#FAD0E0,#F48FB1)', emoji: '🐘', lesson: '第8课', duration: '10分钟' },

    // 绘本故事 — 多彩
    'story-hungry-snake.html':     { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '🐍', lesson: '第1个', duration: '8分钟' },
    'story-brave-pea-shooter.html':{ bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🌱', lesson: '第2个', duration: '8分钟' },
    'story-steve-wither.html':     { bg: 'linear-gradient(135deg,#1A1A2E,#3D5A80)', emoji: '💀', lesson: '第3个', duration: '10分钟' },
    'story-block-battle.html':     { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '⚔️', lesson: '第4个', duration: '10分钟' },
    'story-star-wars.html':        { bg: 'linear-gradient(135deg,#1A1A2E,#3D5A80)', emoji: '🌟', lesson: '第5个', duration: '10分钟' },
    'story-robot-battle.html':     { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '🤖', lesson: '第6个', duration: '10分钟' },
    'story-brave-tank.html':       { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🛡️', lesson: '第7个', duration: '10分钟' },
    'story-minecraft-tank-1.html': { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '⛏️', lesson: '第8个', duration: '10分钟' },
    'story-minecraft-tank-2.html': { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '⛏️', lesson: '第9个', duration: '10分钟' },
    'story-minecraft-tank-3.html': { bg: 'linear-gradient(135deg,#FFD166,#FFA726)', emoji: '⛏️', lesson: '第10个', duration: '10分钟' },
    'story-sugarcane-tank.html':   { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🎋', lesson: '第11个', duration: '8分钟' },
    'story-invisible-tank.html':   { bg: 'linear-gradient(135deg,#EAD6F5,#9B59B6)', emoji: '👻', lesson: '第12个', duration: '8分钟' },
    'story-space-d1.html':         { bg: 'linear-gradient(135deg,#1A1A2E,#3D5A80)', emoji: '🚀', lesson: '第13个', duration: '10分钟' },
    'story-space-d2.html':         { bg: 'linear-gradient(135deg,#1A1A2E,#3D5A80)', emoji: '🛸', lesson: '第14个', duration: '10分钟' },
    'story-space-d3.html':         { bg: 'linear-gradient(135deg,#A8E6CF,#5BAD6F)', emoji: '🦕', lesson: '第15个', duration: '10分钟' },
    'story-space-d4.html':         { bg: 'linear-gradient(135deg,#B5D4F4,#4A90D9)', emoji: '🏙️', lesson: '第16个', duration: '10分钟' },
    'story-ocean-adventure.html':  { bg: 'linear-gradient(135deg,#B5D4F4,#26C6DA)', emoji: '🐙', lesson: '第17个', duration: '10分钟' }
  };

  function getCourseCover(filename) {
    return COURSE_COVERS[filename] || { bg: 'linear-gradient(135deg,#E0E0E0,#BDBDBD)', emoji: '📄' };
  }

  /* ===== 课件列表生成 ===== */
  function getCoursewareList(zone) {
    var config = ZONE_CONFIG[zone];
    var prefixes = config.coursewarePrefix;
    var allFiles = getAllCoursewareFiles();
    var matched = [];
    allFiles.forEach(function(f) {
      var name = f.toLowerCase();
      for (var i = 0; i < prefixes.length; i++) {
        if (name.startsWith(prefixes[i])) {
          var cover = getCourseCover(f);
          matched.push({ file: f, title: fileToTitle(f), emoji: cover.emoji, bg: cover.bg, lesson: cover.lesson || '', duration: cover.duration || '' });
          break;
        }
      }
    });
    return matched;
  }

  function getAllCoursewareFiles() {
    // 静态列表，从仓库扫描结果硬编码
    return [
      'english-01-hello.html','english-02-abc.html','english-03-abc-nz.html','english-04-colors.html',
      'english-05-numbers.html','english-06-family.html','english-07-animals.html','english-08-body.html',
      'english-09-food.html','english-10-toys.html','english-11-weather.html','english-12-clothes.html',
      'english-13-actions.html','english-14-places.html','english-15-feelings.html','english-16-time.html',
      'english-17-transport.html','english-18-review.html','english-19-lost-cat.html','english-20-storm.html',
      'english-21-birthday.html','english-22-farm.html','english-23-treasure.html','english-24-review.html',
      'english-colors.html',
      'chinese-01-characters.html','chinese-02-strokes.html','chinese-03-heaven-earth.html','chinese-04-nature.html',
      'chinese-05-family.html','chinese-06-school.html','chinese-07-pinyin.html','chinese-08-pinyin2.html',
      'chinese-09-shengmu1.html','chinese-10-shengmu2.html','chinese-11-shengmu3.html','chinese-12-yunmu.html',
      'chinese-13-body.html','chinese-14-colors.html','chinese-15-food.html','chinese-16-actions.html',
      'chinese-17-direction-time.html','chinese-18-animals.html','chinese-19-compound.html','chinese-20-reading.html',
      'chinese-21-antonyms.html','chinese-22-qa.html','chinese-23-poems.html','chinese-24-adventure.html',
      'chinese-magic-characters.html',
      'math-01-counting.html','math-02-counting-11to20.html','math-03-compare.html','math-04-addition.html',
      'math-05-addition10.html','math-06-subtraction5.html','math-07-subtraction10.html','math-08-addition20.html',
      'math-09-subtraction20.html','math-10-shapes.html','math-11-measurement.html','math-12-review.html',
      'math-13-numbers100.html','math-14-addsub2digit.html','math-15-money.html','math-16-clock.html',
      'math-17-shapes.html','math-18-sorting.html','math-19-statistics.html','math-20-direction.html',
      'math-21-multiplication.html','math-22-fractions.html','math-23-word-problems.html','math-24-carnival.html',
      'math-numbers-1-10.html',
      'twinkle-twinkle.html','old-macdonald.html','wheels-on-bus.html','bingo.html','abc-song.html',
      'head-shoulders.html','humpty-dumpty.html','baa-baa-black-sheep.html','five-little-monkeys.html',
      'hickory-dickory.html','hush-little-baby.html','if-youre-happy.html','itsy-bitsy-spider.html',
      'jack-and-jill.html','jack-be-nimble.html','london-bridge.html','mary-lamb.html','mulberry-bush.html',
      'pat-a-cake.html','rain-go-away.html','ring-around-rosy.html','row-your-boat.html',
      'silent-night.html','skidamarink.html','three-blind-mice.html','yankee-doodle.html','cat-and-fiddle.html',
      'gears-transmission.html','rainforest-adventure.html','nature-lesson-4.html',
      'i-am-an-apple.html','phonics-fat-cat.html','sight-word-tales-can-we-get-a-pet.html',
      'sight-word-tales-come-to-the-party.html','elephant-piggie-surprise.html',
      // 绘本故事
      'story-hungry-snake.html','story-brave-pea-shooter.html','story-steve-wither.html',
      'story-block-battle.html','story-star-wars.html','story-robot-battle.html',
      'story-brave-tank.html','story-minecraft-tank-1.html','story-minecraft-tank-2.html',
      'story-minecraft-tank-3.html','story-sugarcane-tank.html','story-invisible-tank.html',
      'story-space-d1.html','story-space-d2.html','story-space-d3.html','story-space-d4.html',
      'story-ocean-adventure.html'
    ];
  }

  function fileToTitle(filename) {
    var name = filename.replace('.html','');
    var map = {
      'english-01-hello':'Lesson 1 Hello','english-02-abc':'Lesson 2 ABC','english-03-abc-nz':'Lesson 3 N-Z',
      'english-04-colors':'Lesson 4 Colors','english-05-numbers':'Lesson 5 Numbers','english-06-family':'Lesson 6 Family',
      'english-07-animals':'Lesson 7 Animals','english-08-body':'Lesson 8 Body','english-09-food':'Lesson 9 Food',
      'english-10-toys':'Lesson 10 Toys','english-11-weather':'Lesson 11 Weather','english-12-clothes':'Lesson 12 Clothes',
      'english-13-actions':'Lesson 13 Actions','english-14-places':'Lesson 14 Places','english-15-feelings':'Lesson 15 Feelings',
      'english-16-time':'Lesson 16 Time','english-17-transport':'Lesson 17 Transport','english-18-review':'Lesson 18 Review',
      'english-19-lost-cat':'Lesson 19 Lost Cat','english-20-storm':'Lesson 20 Storm','english-21-birthday':'Lesson 21 Birthday',
      'english-22-farm':'Lesson 22 Farm','english-23-treasure':'Lesson 23 Treasure','english-24-review':'Lesson 24 Review',
      'english-colors':'Colors Fun',
      'chinese-01-characters':'第1课 汉字','chinese-02-strokes':'第2课 笔画','chinese-03-heaven-earth':'第3课 天地',
      'chinese-04-nature':'第4课 自然','chinese-05-family':'第5课 家庭','chinese-06-school':'第6课 学校',
      'chinese-07-pinyin':'第7课 拼音','chinese-08-pinyin2':'第8课 拼音2','chinese-09-shengmu1':'第9课 声母1',
      'chinese-10-shengmu2':'第10课 声母2','chinese-11-shengmu3':'第11课 声母3','chinese-12-yunmu':'第12课 韵母',
      'chinese-13-body':'第13课 身体','chinese-14-colors':'第14课 颜色','chinese-15-food':'第15课 食物',
      'chinese-16-actions':'第16课 动作','chinese-17-direction-time':'第17课 方向时间','chinese-18-animals':'第18课 动物',
      'chinese-19-compound':'第19课 合体字','chinese-20-reading':'第20课 阅读','chinese-21-antonyms':'第21课 反义词',
      'chinese-22-qa':'第22课 问答','chinese-23-poems':'第23课 古诗','chinese-24-adventure':'第24课 冒险',
      'chinese-magic-characters':'神奇汉字',
      'math-01-counting':'第1课 数数','math-02-counting-11to20':'第2课 11-20','math-03-compare':'第3课 比较',
      'math-04-addition':'第4课 加法','math-05-addition10':'第5课 加法10','math-06-subtraction5':'第6课 减法5',
      'math-07-subtraction10':'第7课 减法10','math-08-addition20':'第8课 加法20','math-09-subtraction20':'第9课 减法20',
      'math-10-shapes':'第10课 图形','math-11-measurement':'第11课 测量','math-12-review':'第12课 复习',
      'math-13-numbers100':'第13课 100以内','math-14-addsub2digit':'第14课 两位数','math-15-money':'第15课 钱',
      'math-16-clock':'第16课 时钟','math-17-shapes':'第17课 图形2','math-18-sorting':'第18课 分类',
      'math-19-statistics':'第19课 统计','math-20-direction':'第20课 方向','math-21-multiplication':'第21课 乘法',
      'math-22-fractions':'第22课 分数','math-23-word-problems':'第23课 应用题','math-24-carnival':'第24课 嘉年华',
      'math-numbers-1-10':'数字1-10',
      'story-hungry-snake':'好饿的小蛇','story-brave-pea-shooter':'勇敢的豌豆射手',
      'story-steve-wither':'Steve vs Wither','story-block-battle':'方块大战',
      'story-star-wars':'星球大战','story-robot-battle':'家务机器人大战',
      'story-brave-tank':'勇敢的小坦克','story-minecraft-tank-1':'坦克大战·第一册',
      'story-minecraft-tank-2':'坦克大战·第二册','story-minecraft-tank-3':'坦克大战·第三册',
      'story-sugarcane-tank':'甘蔗坦克大作战','story-invisible-tank':'隐身战车奇袭',
      'story-space-d1':'太空冒险·飞行平台','story-space-d2':'太空冒险·宇宙飞船',
      'story-space-d3':'太空冒险·恐龙星球','story-space-d4':'太空冒险·太空城市',
      'story-ocean-adventure':'海底大冒险'
    };
    return map[name] || name;
  }

  /* ===== 打开课件 ===== */
  var ZONE_DIR = {
    english: 'english', chinese: 'chinese', math: 'math',
    songs: 'songs', science: 'science', stories: 'stories'
  };
  window.openCourse = function(filename, zone) {
    var dir = ZONE_DIR[zone] || '';
    var path = dir ? dir + '/' + filename : filename;
    window.open(path, '_blank');
  };

  /* ===== Steve 动画 ===== */
  var steveState = { x: 0, dir: 1, timer: 0, speechTimer: 0 };

  function updateSteve() {
    var el = document.getElementById('steve');
    if (!el) return;
    var mapW = document.getElementById('villageMap').offsetWidth;
    steveState.x += 0.5 * steveState.dir;
    if (steveState.x > mapW * 0.35 || steveState.x < -mapW * 0.05) {
      steveState.dir *= -1;
    }
    el.style.left = (20 + steveState.x / mapW * 100) + '%';
    steveState.timer++;
  }

  // 点击Steve说话
  var steveEl = document.getElementById('steve');
  if (steveEl) {
    steveEl.addEventListener('click', function() {
      var line = STEVE_LINES[Math.floor(Math.random() * STEVE_LINES.length)];
      showSteveSpeech(line);
    });
  }

  function showSteveSpeech(text) {
    var bubble = document.getElementById('steveSpeech');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(steveState.speechTimer);
    steveState.speechTimer = setTimeout(function() { bubble.classList.remove('show'); }, 3000);
  }

  /* ===== 通用提示 ===== */
  function showSpeechBubbleGlobal(text) {
    showSteveSpeech(text);
  }

  /* ===== 欢迎动画 ===== */
  function showWelcome() {
    var overlay = document.getElementById('welcomeOverlay');
    if (!overlay) return;
    var lastVisit = loadVillageState().lastVisit;
    var today = new Date().toISOString().split('T')[0];
    if (lastVisit === today) return; // 今天已来过
    overlay.classList.add('show');
    setTimeout(function() {
      overlay.classList.remove('show');
    }, 2500);
  }

  /* ===== 完成事件处理 ===== */
  window.checkJustCompleted = function() {
    var params = new URLSearchParams(location.search);
    var justCompleted = params.get('justCompleted');
    var stars = parseInt(params.get('stars')) || 1;
    if (!justCompleted) return;
    history.replaceState({}, '', location.pathname);
    // 显示完成提示
    var toast = document.getElementById('completionToast');
    var starsEl = document.getElementById('toastStars');
    var textEl = document.getElementById('toastText');
    if (toast && starsEl) {
      starsEl.textContent = '⭐'.repeat(stars);
      textEl.textContent = '太棒了！完成了一课！';
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 3000);
    }
    // 检查装饰解锁
    var state = loadVillageState();
    checkAndUnlockDecorations(state);
  };

  function checkAndUnlockDecorations(state) {
    DECORATION_RULES.forEach(function(rule) {
      if (!state.decorations[rule.id] && rule.condition(state)) {
        state.decorations[rule.id] = true;
        saveVillageState(state);
        // 动画解锁
        setTimeout(function() {
          showSteveSpeech(rule.speak);
          renderDecorations(state);
          if (typeof celebrate === 'function') celebrate();
        }, 1500);
      }
    });
  }

  /* ===== 金币系统 ===== */
  window.earnCoins = function(amount, reason) {
    var state = loadVillageState();
    state.coins = (state.coins || 0) + amount;
    saveVillageState(state);
    renderCoinDisplay(state);
    showCoinAnimation(amount, reason);
  };

  window.spendCoins = function(amount) {
    var state = loadVillageState();
    if ((state.coins || 0) < amount) return false;
    state.coins -= amount;
    saveVillageState(state);
    renderCoinDisplay(state);
    return true;
  };

  function renderCoinDisplay(state) {
    var el = document.getElementById('coinCount');
    if (el) {
      var val = el.querySelector('.badge-value');
      if (val) { val.textContent = state.coins || 0; }
      else { el.textContent = '🪙 ' + (state.coins || 0); }
    }
  }

  function showCoinAnimation(amount, reason) {
    var el = document.createElement('div');
    el.className = 'coin-float';
    el.textContent = '+' + amount + ' 🪙';
    if (reason) el.title = reason;
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'font-size:28px;font-weight:800;color:#FFD700;z-index:9999;pointer-events:none;' +
      'text-shadow:2px 2px 4px rgba(0,0,0,0.5);';
    document.body.appendChild(el);
    if (typeof gsap !== 'undefined') {
      gsap.to(el, { y: -80, opacity: 0, duration: 1.5, ease: 'power2.out',
        onComplete: function() { el.remove(); }
      });
    } else {
      setTimeout(function() { el.remove(); }, 1500);
    }
  }

  /* ===== 商店系统 ===== */
  window.openShop = function() {
    var state = loadVillageState();
    var panel = document.getElementById('shopPanel');
    if (!panel) return;

    var html = '<div class="panel-handle"><div class="panel-handle-bar"></div></div>' +
      '<div class="shop-header"><span class="shop-title">🛒 商店</span>' +
      '<span class="shop-coins">🪙 ' + (state.coins || 0) + '</span>' +
      '<button class="panel-close" onclick="closeShop()">✕</button></div>' +
      '<div class="shop-items">';

    SHOP_ITEMS.forEach(function(item) {
      var canAfford = (state.coins || 0) >= item.price;
      var owned = item.type === 'accessory' && state.purchasedItems &&
                  state.purchasedItems.indexOf(item.id) !== -1;
      html += '<div class="shop-item' + (canAfford ? '' : ' disabled') + '">' +
        '<div class="item-icon">' + item.icon + '</div>' +
        '<div class="item-name">' + item.name + '</div>' +
        '<div class="item-desc">' + item.desc + '</div>' +
        '<div class="item-price">🪙 ' + item.price + '</div>' +
        (owned ? '<div class="item-owned">已拥有</div>' :
          '<button class="item-buy" ' + (canAfford ? 'onclick="buyItem(\'' + item.id + '\')"' : 'disabled') + '>' +
          (canAfford ? '购买' : '金币不足') + '</button>') +
        '</div>';
    });

    html += '</div>';
    panel.innerHTML = html;
    panel.classList.add('open');
    var overlay = document.getElementById('panelOverlay');
    if (overlay) overlay.classList.add('show');
  };

  window.closeShop = function() {
    var panel = document.getElementById('shopPanel');
    if (panel) panel.classList.remove('open');
    var overlay = document.getElementById('panelOverlay');
    if (overlay) overlay.classList.remove('show');
  };

  window.buyItem = function(itemId) {
    var item = SHOP_ITEMS.find(function(i) { return i.id === itemId; });
    if (!item) return;
    var state = loadVillageState();
    if ((state.coins || 0) < item.price) return;

    state.coins -= item.price;

    if (item.type === 'food') {
      // 直接喂给宠物
      if (!state.pet || !state.pet.type) {
        showSteveSpeech('先选一只宠物才能喂食哦！');
        state.coins += item.price; // 退钱
        saveVillageState(state);
        return;
      }
      state.pet.growth = (state.pet.growth || 0) + item.growth;
      state.pet.hunger = Math.min(100, (state.pet.hunger || 0) + 20);
      state.pet.mood = Math.min(100, (state.pet.mood || 0) + 10);
      state.pet.lastFeed = new Date().toISOString().split('T')[0];
      // 检查成长阶段
      var newStage = 0;
      for (var i = PET_STAGES.length - 1; i >= 0; i--) {
        if (state.pet.growth >= PET_STAGES[i].minGrowth) { newStage = i; break; }
      }
      if (newStage > state.pet.stage) {
        state.pet.stage = newStage;
        saveVillageState(state);
        showSteveSpeech('宠物进化到' + PET_STAGES[newStage].name + '了！');
        if (typeof celebrate === 'function') celebrate();
      }
      showSteveSpeech(item.icon + ' 好好吃！成长值+' + item.growth);
    } else if (item.type === 'accessory') {
      if (!state.purchasedItems) state.purchasedItems = [];
      state.purchasedItems.push(item.id);
      if (state.pet && state.pet.accessories) {
        state.pet.accessories.push(item.id);
      }
      showSteveSpeech('买了' + item.name + '！');
    } else if (item.type === 'village_deco') {
      if (!state.purchasedItems) state.purchasedItems = [];
      state.purchasedItems.push(item.id);
      showSteveSpeech('村庄更漂亮了！');
    }

    saveVillageState(state);
    renderCoinDisplay(state);
    renderPet(state);
    openShop(); // 刷新商店
  };

  /* ===== 宠物系统 ===== */
  window.showPetSelection = function() {
    var panel = document.getElementById('petPanel');
    if (!panel) return;
    var state = loadVillageState();
    if (state.pet && state.pet.type) {
      openPetPanel();
      return;
    }

    var html = '<div class="panel-handle"><div class="panel-handle-bar"></div></div>' +
      '<div class="shop-header"><span class="shop-title">🐾 选择你的宠物</span>' +
      '<button class="panel-close" onclick="closePetPanel()">✕</button></div>' +
      '<div class="pet-select-grid">';

    PET_TYPES.forEach(function(pet) {
      html += '<div class="pet-select-card" onclick="selectPet(\'' + pet.id + '\')">' +
        '<div class="pet-select-icon">' + getPetSVG(pet.id, 0) + '</div>' +
        '<div class="pet-select-name">' + pet.name + '</div>' +
        '</div>';
    });

    html += '</div>';
    panel.innerHTML = html;
    panel.classList.add('open');
    var overlay = document.getElementById('panelOverlay');
    if (overlay) overlay.classList.add('show');
  };

  window.selectPet = function(petType) {
    var petDef = PET_TYPES.find(function(p) { return p.id === petType; });
    if (!petDef) return;
    var state = loadVillageState();
    state.pet = {
      type: petType, name: petDef.name, growth: 0, mood: 100, hunger: 100,
      stage: 0, accessories: [], lastFeed: new Date().toISOString().split('T')[0]
    };
    saveVillageState(state);
    renderPet(state);
    closePetPanel();
    showSteveSpeech('你选了' + petDef.name + '！好好照顾它吧！');
    if (typeof celebrate === 'function') celebrate();
  };

  window.openPetPanel = function() {
    var state = loadVillageState();
    if (!state.pet || !state.pet.type) { showPetSelection(); return; }
    var panel = document.getElementById('petPanel');
    if (!panel) return;

    var petDef = PET_TYPES.find(function(p) { return p.id === state.pet.type; });
    var stage = PET_STAGES[state.pet.stage || 0];
    var nextStage = PET_STAGES[(state.pet.stage || 0) + 1];
    var growthPct = nextStage ? Math.round((state.pet.growth / nextStage.minGrowth) * 100) : 100;

    var moodEmoji = state.pet.mood > 70 ? '😊' : (state.pet.mood > 30 ? '😐' : '😢');
    var hungerEmoji = state.pet.hunger > 50 ? '😋' : '🍽️';

    var accHtml = '';
    if (state.pet.accessories && state.pet.accessories.length > 0) {
      accHtml = '<div class="pet-accessories">';
      state.pet.accessories.forEach(function(accId) {
        var acc = SHOP_ITEMS.find(function(i) { return i.id === accId; });
        if (acc) accHtml += '<span class="pet-acc">' + acc.icon + '</span>';
      });
      accHtml += '</div>';
    }

    var html = '<div class="panel-handle"><div class="panel-handle-bar"></div></div>' +
      '<div class="shop-header"><span class="shop-title">' +
      (petDef ? petDef.icon : '🐾') + ' ' + (state.pet.name || '宠物') + '</span>' +
      '<button class="panel-close" onclick="closePetPanel()">✕</button></div>' +
      '<div class="pet-status-panel">' +
      '<div class="pet-big-icon">' + (petDef ? petDef.stages[state.pet.stage || 0] : '🐾') + '</div>' +
      accHtml +
      '<div class="pet-stage">阶段：' + stage.name + '</div>' +
      '<div class="pet-stat"><span>成长值</span><div class="stat-bar"><div class="stat-fill" style="width:' + growthPct + '%;background:#4CAF50"></div></div><span>' + (state.pet.growth || 0) + (nextStage ? '/' + nextStage.minGrowth : ' MAX') + '</span></div>' +
      '<div class="pet-stat"><span>心情</span><div class="stat-bar"><div class="stat-fill" style="width:' + (state.pet.mood || 0) + '%;background:#FF9800"></div></div><span>' + moodEmoji + ' ' + (state.pet.mood || 0) + '%</span></div>' +
      '<div class="pet-stat"><span>饱食</span><div class="stat-bar"><div class="stat-fill" style="width:' + (state.pet.hunger || 0) + '%;background:#2196F3"></div></div><span>' + hungerEmoji + ' ' + (state.pet.hunger || 0) + '%</span></div>' +
      '<button class="pet-feed-btn" onclick="closePetPanel();openShop();">🛒 去商店买食物</button>' +
      '<button class="pet-play-btn" onclick="playWithPet()">🎾 和宠物玩</button>' +
      '<button class="pet-feed-btn" style="background:#2E5C1A;margin-top:8px;width:100%;" onclick="window.location.href=\'pet-hub.html\'">🐾 进入宠物中心</button>' +
      '</div>';

    panel.innerHTML = html;
    panel.classList.add('open');
    var overlay = document.getElementById('panelOverlay');
    if (overlay) overlay.classList.add('show');
  };

  window.closePetPanel = function() {
    var panel = document.getElementById('petPanel');
    if (panel) panel.classList.remove('open');
    var overlay = document.getElementById('panelOverlay');
    if (overlay) overlay.classList.remove('show');
  };

  window.playWithPet = function() {
    var state = loadVillageState();
    if (!state.pet) return;
    state.pet.mood = Math.min(100, (state.pet.mood || 0) + 15);
    saveVillageState(state);
    renderPet(state);
    showSteveSpeech('和宠物玩得好开心！心情+15');
    openPetPanel(); // 刷新面板
  };

  // 宠物图片渲染函数
  function getPetSVG(petType, stage) {
    var scale = 0.8 + (stage || 0) * 0.1;
    var size = Math.round(48 * scale);
    var petImages = {
      cat: 'images/minecraft/cat.png',
      dog: 'images/minecraft/dog.png',
      parrot: 'images/minecraft/parrot.png',
      fox: 'images/minecraft/fox.png',
      rabbit: 'images/minecraft/rabbit.png',
      panda: 'images/minecraft/panda.png'
    };
    // 尝试用 GPT sprites（如果 SpriteLoader 已加载且有对应动物）
    var gptSrc = '';
    if (window.SpriteLoader && SpriteLoader.isReady()) {
      var frames = SpriteLoader.getFrames('animals', petType);
      if (frames.length) gptSrc = SpriteLoader.url(frames[0]);
    }
    var src = gptSrc || petImages[petType] || petImages.cat;
    return '<img src="' + src + '" alt="' + petType + '" style="width:' + size + 'px;height:' + size + 'px;image-rendering:pixelated;filter:drop-shadow(1px 1px 0 rgba(0,0,0,0.3))">';
  }

  function renderPet(state) {
    var el = document.getElementById('petCharacter');
    if (!el) return;
    if (!state.pet || !state.pet.type) {
      el.style.display = 'none';
      return;
    }
    var petDef = PET_TYPES.find(function(p) { return p.id === state.pet.type; });
    if (!petDef) return;
    el.style.display = '';
    var stage = state.pet.stage || 0;
    var stageDef = PET_STAGES[stage];
    var svgContainer = el.querySelector('.pet-svg');
    var tagEl = el.querySelector('.pet-tag');
    if (svgContainer) {
      svgContainer.innerHTML = getPetSVG(state.pet.type, stage);
      if (stageDef && stageDef.glow) {
        svgContainer.style.filter = 'drop-shadow(0 0 8px #FFD700)';
      } else {
        svgContainer.style.filter = '';
      }
    }
    if (tagEl) tagEl.textContent = state.pet.name || petDef.name;
    // 心情动画
    if (state.pet.mood > 70) {
      el.classList.add('pet-happy');
      el.classList.remove('pet-sad');
    } else if (state.pet.mood < 30) {
      el.classList.add('pet-sad');
      el.classList.remove('pet-happy');
    } else {
      el.classList.remove('pet-happy', 'pet-sad');
    }
  }

  // 宠物饥饿衰减（每次打开村庄检查）
  function updatePetHunger(state) {
    if (!state.pet || !state.pet.type) return state;
    var today = new Date().toISOString().split('T')[0];
    var lastFeed = state.pet.lastFeed || today;
    var dayDiff = Math.round((new Date(today) - new Date(lastFeed)) / 86400000);
    if (dayDiff > 0) {
      state.pet.hunger = Math.max(0, (state.pet.hunger || 100) - dayDiff * 10);
      state.pet.mood = Math.max(0, (state.pet.mood || 100) - dayDiff * 5);
    }
    return state;
  }

  /* ===== 游戏循环 ===== */
  function gameLoop() {
    // 新布局中 Steve 是静态卡片，不需要移动动画
    // updateSteve();
    requestAnimationFrame(gameLoop);
  }

  /* ===== 初始化 ===== */
  document.addEventListener('DOMContentLoaded', function() {
    var state = loadVillageState();
    state = updateStreak(state);
    state = updatePetHunger(state);
    // Sync from pet-hub if available
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var full = JSON.parse(raw);
        if (full.petHub && full.petHub.pets) {
          // pet-hub has data, sync active pet back to village format
          var ph = full.petHub;
          if (ph.activePet && ph.pets[ph.activePet]) {
            var phPet = ph.pets[ph.activePet];
            var petNames = {wolf:'小灰',pig:'小粉',cat:'花花',creep:'苦力怕',dragon:'小龙'};
            state.pet = {
              type: ph.activePet,
              name: petNames[ph.activePet] || ph.activePet,
              growth: (phPet.fed || 0) * 10,
              mood: phPet.mood || 50,
              hunger: phPet.hunger || 50,
              stage: phPet.stage || 0,
              accessories: state.pet.accessories || [],
              lastFeed: new Date().toISOString().split('T')[0]
            };
          }
        }
      }
    } catch(e) {}
    saveVillageState(state);
    renderVillage(state);
    renderCoinDisplay(state);
    renderPet(state);
    checkJustCompleted();
    // 首次打开且无宠物，提示选宠物
    if (!state.pet || !state.pet.type) {
      setTimeout(function() { showSteveSpeech('点击我旁边的🐾选一只宠物吧！'); }, 3500);
    }
    showWelcome();
    gameLoop();
  });

})();
