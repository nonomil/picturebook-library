/**
 * village-animals.js
 * 我的世界村庄动物悬浮窗 — 页面两侧偶尔出现随机动物
 *
 * 使用方法：在任意HTML页面的 <body> 末尾加一行：
 *   <script src="shared/village-animals.js"></script>
 *
 * 手动触发庆祝：window.villageAnimals.celebrate()
 * 手动触发反应：window.villageAnimals.react('chicken')
 */

(function () {
  'use strict';

  var CFG = Object.assign({
    allTypes: ['chicken','sheep','cow','villager','bat'],
    panelWidth: 84,
    mobileBreak: 500,
    minStay: 8000,
    maxStay: 20000,
    minGap: 15000,
    maxGap: 60000,
  }, window.VILLAGE_ANIMALS_CONFIG || {});

  // ─── 像素动物 SVG ────────────────────────────────────────
  var SVG = {
    chicken: function(f) { return '<svg viewBox="0 0 16 16" width="40" height="40" shape-rendering="crispEdges" style="transform:scaleX('+(f?-1:1)+');transform-origin:center;display:block"><rect x="7" y="1" width="2" height="2" fill="#FF2222"/><rect x="9" y="2" width="1" height="1" fill="#FF2222"/><rect x="5" y="3" width="6" height="5" fill="#EEE"/><rect x="4" y="4" width="1" height="3" fill="#DDD"/><rect x="9" y="4" width="1" height="2" fill="#111"/><rect x="11" y="5" width="2" height="1" fill="#F90"/><rect x="11" y="6" width="3" height="1" fill="#F70"/><rect x="11" y="6" width="1" height="2" fill="#F22"/><rect x="3" y="8" width="9" height="5" fill="#EEE"/><rect x="3" y="9" width="2" height="3" fill="#DDD"/><rect x="2" y="7" width="2" height="2" fill="#EEE"/><rect x="5" y="13" width="2" height="2" fill="#F90"/><rect x="9" y="13" width="2" height="2" fill="#F90"/><rect x="4" y="14" width="3" height="1" fill="#E80"/><rect x="8" y="14" width="3" height="1" fill="#E80"/></svg>'; },

    sheep: function(f) { return '<svg viewBox="0 0 16 16" width="48" height="48" shape-rendering="crispEdges" style="transform:scaleX('+(f?-1:1)+');transform-origin:center;display:block"><rect x="2" y="4" width="3" height="3" fill="#F0F0F0"/><rect x="6" y="3" width="3" height="3" fill="#FAFAFA"/><rect x="10" y="4" width="3" height="3" fill="#F0F0F0"/><rect x="2" y="5" width="12" height="5" fill="#F5F5F5"/><rect x="1" y="6" width="14" height="3" fill="#FFF"/><rect x="11" y="7" width="4" height="4" fill="#999"/><rect x="14" y="8" width="1" height="1" fill="#111"/><rect x="12" y="10" width="2" height="1" fill="#777"/><rect x="4" y="10" width="2" height="4" fill="#888"/><rect x="9" y="10" width="2" height="4" fill="#888"/><rect x="4" y="13" width="2" height="1" fill="#444"/><rect x="9" y="13" width="2" height="1" fill="#444"/></svg>'; },

    cow: function(f) { return '<svg viewBox="0 0 18 16" width="52" height="48" shape-rendering="crispEdges" style="transform:scaleX('+(f?-1:1)+');transform-origin:center;display:block"><rect x="2" y="4" width="11" height="8" fill="#FFF"/><rect x="3" y="5" width="3" height="3" fill="#333"/><rect x="8" y="7" width="3" height="3" fill="#333"/><rect x="13" y="4" width="5" height="6" fill="#FFF"/><rect x="14" y="5" width="1" height="2" fill="#111"/><rect x="13" y="9" width="5" height="2" fill="#FFAABB"/><rect x="14" y="10" width="1" height="1" fill="#FF8899"/><rect x="16" y="10" width="1" height="1" fill="#FF8899"/><rect x="13" y="3" width="2" height="2" fill="#FFF"/><rect x="14" y="2" width="1" height="2" fill="#DDC888"/><rect x="16" y="2" width="1" height="2" fill="#DDC888"/><rect x="3" y="12" width="2" height="3" fill="#444"/><rect x="8" y="12" width="2" height="3" fill="#444"/><rect x="3" y="14" width="2" height="1" fill="#222"/><rect x="8" y="14" width="2" height="1" fill="#222"/><rect x="0" y="6" width="2" height="3" fill="#EEE"/></svg>'; },

    villager: function(f) { return '<svg viewBox="0 0 14 18" width="36" height="46" shape-rendering="crispEdges" style="transform:scaleX('+(f?-1:1)+');transform-origin:center;display:block"><rect x="3" y="0" width="8" height="2" fill="#8B6343"/><rect x="2" y="2" width="10" height="6" fill="#F5C8A0"/><rect x="3" y="4" width="2" height="2" fill="#5A2810"/><rect x="9" y="4" width="2" height="2" fill="#5A2810"/><rect x="6" y="6" width="2" height="1" fill="#D4956A"/><rect x="4" y="7" width="6" height="1" fill="#333"/><rect x="1" y="8" width="12" height="7" fill="#8B6940"/><rect x="5" y="8" width="4" height="1" fill="#6B4920"/><rect x="0" y="9" width="2" height="5" fill="#8B6940"/><rect x="12" y="9" width="2" height="5" fill="#8B6940"/><rect x="0" y="13" width="2" height="2" fill="#F5C8A0"/><rect x="12" y="13" width="2" height="2" fill="#F5C8A0"/><rect x="3" y="15" width="3" height="3" fill="#333"/><rect x="8" y="15" width="3" height="3" fill="#333"/></svg>'; },

    bat: function(f) { return '<svg viewBox="0 0 20 12" width="44" height="26" shape-rendering="crispEdges" style="transform:scaleX('+(f?-1:1)+');transform-origin:center;display:block"><rect x="0" y="5" width="5" height="4" fill="#333"/><rect x="1" y="3" width="4" height="3" fill="#333"/><rect x="15" y="5" width="5" height="4" fill="#333"/><rect x="15" y="3" width="4" height="3" fill="#333"/><rect x="5" y="3" width="10" height="6" fill="#444"/><rect x="6" y="1" width="2" height="3" fill="#444"/><rect x="12" y="1" width="2" height="3" fill="#444"/><rect x="7" y="4" width="2" height="2" fill="#F22"/><rect x="11" y="4" width="2" height="2" fill="#F22"/><rect x="8" y="8" width="2" height="2" fill="#333"/><rect x="10" y="8" width="2" height="2" fill="#333"/></svg>'; },
  };

  var DEFS = {
    chicken:  { size: 40, idle: 'va-peck 2.2s ease-in-out infinite',  cheers: ['加油！','咕咕！','你好棒！','耶！','继续！'] },
    sheep:    { size: 48, idle: 'va-graze 3.5s ease-in-out infinite', cheers: ['咩！','好厉害！','加油哦！','棒！','继续！'] },
    cow:      { size: 52, idle: 'va-chew 2s ease-in-out infinite',    cheers: ['哞！','了不起！','继续！','好棒！','耶！'] },
    villager: { size: 36, idle: 'va-nod 3s ease-in-out infinite',     cheers: ['嗯！','你真棒！','太好了！','加油！','耶！'] },
    bat:      { size: 44, idle: 'va-flap 1.2s ease-in-out infinite',  cheers: ['嘎！','嘎嘎！','加油！','好棒！','✨✨'] },
  };

  // ─── CSS ──────────────────────────────────────────────────
  var CSS = [
    '.va-panel{position:fixed;top:0;bottom:0;width:'+CFG.panelWidth+'px;pointer-events:none;z-index:50;overflow:hidden}',
    '.va-panel.va-left{left:0}.va-panel.va-right{right:0}',
    '.va-scene{width:100%;height:100%;position:relative;background:linear-gradient(180deg,#0A1828 0%,#1A3A5C 32%,#2A5A8C 46%,#4E8C33 46%,#3A6824 53%,#7B5227 53%,#5C3A18 100%)}',
    '.va-scene::before{content:"";position:absolute;inset:0;background:radial-gradient(1px 1px at 15% 8%,rgba(255,255,255,.9) 100%,transparent),radial-gradient(1px 1px at 60% 18%,rgba(255,255,255,.6) 100%,transparent),radial-gradient(1px 1px at 80% 6%,rgba(255,255,255,.8) 100%,transparent),radial-gradient(2px 2px at 35% 25%,rgba(255,255,255,.4) 100%,transparent)}',
    '.va-walkway{position:absolute;left:0;right:0;bottom:calc(47% - 2px);height:56px}',
    '.va-animal{position:absolute;bottom:0;cursor:pointer;pointer-events:all;transform-origin:bottom center;transition:filter .1s,opacity .6s ease}',
    '.va-animal.va-hidden{opacity:0;pointer-events:none}',
    '.va-animal:hover{filter:brightness(1.2)}',
    '.va-bubble{position:absolute;bottom:calc(100% + 3px);left:50%;transform:translateX(-50%);background:#fff;border:3px solid #222;color:#222;font-family:"Press Start 2P",monospace;font-size:6px;padding:3px 5px;white-space:nowrap;z-index:100;pointer-events:none;animation:va-bpop .15s ease}',
    '.va-bubble::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#222}',
    '.va-bubble::before{content:"";position:absolute;top:calc(100% + 1px);left:50%;transform:translateX(-50%);border:3px solid transparent;border-top-color:#fff;z-index:1}',
    '@keyframes va-peck{0%,60%,100%{transform:rotate(0)}25%{transform:rotate(18deg) translateY(4px)}45%{transform:rotate(-4deg)}}',
    '@keyframes va-graze{0%,55%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(5px) rotate(5deg)}}',
    '@keyframes va-chew{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.94) translateX(1px)}}',
    '@keyframes va-nod{0%,70%,100%{transform:translateY(0)}35%{transform:translateY(-5px)}}',
    '@keyframes va-flap{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}',
    '@keyframes va-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
    '@keyframes va-cel{0%{transform:translateY(0) scale(1)}20%{transform:translateY(-18px) scale(1.25)}50%{transform:translateY(-8px)}70%{transform:translateY(-20px) scale(1.2)}100%{transform:translateY(0) scale(1)}}',
    '@keyframes va-bpop{from{transform:translateX(-50%) scale(0);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}',
    '@keyframes va-flicker{from{opacity:1;transform:scale(1)}to{opacity:.7;transform:scale(.9)}}',
    '@media (max-width:'+CFG.mobileBreak+'px){.va-panel{display:none}}',
  ].join('\n');

  // ─── 随机工具 ─────────────────────────────────────────────
  function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
  function randRange(min, max) { return min + Math.random() * (max - min); }

  // ─── 游荡动物 ─────────────────────────────────────────────
  var activeAnimals = [];

  function createAnimal(container, type) {
    var def = DEFS[type];
    var startX = Math.random() > 0.5 ? 0 : CFG.panelWidth - def.size - 2;
    var flip = startX > 0;
    var el = document.createElement('div');
    el.className = 'va-animal va-hidden';
    el.style.left = startX + 'px';
    el.innerHTML = SVG[type] ? SVG[type](flip) : '';
    container.appendChild(el);

    var stayDuration = randRange(CFG.minStay, CFG.maxStay);
    var obj = {
      type: type, el: el, def: def, x: startX, flip: flip, timer: null
    };

    // 淡入
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.classList.remove('va-hidden');
        el.style.animation = def.idle;
      });
    });

    // 互动方法
    obj.react = function() {
      showBubble(el, rand(def.cheers), 2000);
      var prev = el.style.animation;
      el.style.animation = 'va-cel .65s ease';
      setTimeout(function() { el.style.animation = prev || def.idle; }, 650);
    };

    // 点击互动
    el.addEventListener('click', function() { obj.react(); });

    // 随机自言自语
    var bubbleTimer = setTimeout(function randBubble() {
      if (!obj.alive) return;
      if (Math.random() < 0.4) {
        showBubble(el, rand(def.cheers), 1500);
      }
      obj.bubbleTimer = setTimeout(randBubble, 6000 + Math.random() * 12000);
    }, 3000 + Math.random() * 8000);

    // 随机走动
    function randWalk() {
      if (!obj.alive) return;
      var maxX = CFG.panelWidth - def.size - 2;
      var goRight = obj.x < maxX / 2;
      var targetX = goRight ? maxX : 0;
      var dist = Math.abs(targetX - obj.x);
      var dur = (dist / maxX) * (5000 + Math.random() * 6000);

      obj.flip = !goRight;
      el.innerHTML = SVG[type](!goRight);
      el.style.animation = 'va-bob .45s ease-in-out infinite';
      el.style.transition = 'left ' + dur + 'ms linear, opacity .6s ease';
      el.style.left = targetX + 'px';
      obj.x = targetX;

      obj.walkTimer = setTimeout(function() {
        if (!obj.alive) return;
        el.style.animation = def.idle;
        obj.walkTimer = setTimeout(randWalk, 2000 + Math.random() * 4000);
      }, dur);
    }
    obj.walkTimer = setTimeout(randWalk, 800 + Math.random() * 2000);

    // 定时离开
    obj.timer = setTimeout(function() {
      leaveAnimal(obj, container);
    }, stayDuration);

    // 清理方法
    obj.destroy = function() {
      obj.alive = false;
      clearTimeout(obj.timer);
      clearTimeout(obj.walkTimer);
      clearTimeout(obj.bubbleTimer);
      el.remove();
      var idx = activeAnimals.indexOf(obj);
      if (idx >= 0) activeAnimals.splice(idx, 1);
    };

    obj.alive = true;
    activeAnimals.push(obj);
    return obj;
  }

  function leaveAnimal(obj, container) {
    if (!obj.alive) return;
    var el = obj.el;
    el.classList.add('va-hidden');
    setTimeout(function() {
      obj.destroy();
      // 继续循环
      scheduleNext(container);
    }, 600);
  }

  function showBubble(el, txt, dur) {
    el.querySelectorAll('.va-bubble').forEach(function(b) { b.remove(); });
    var b = document.createElement('div');
    b.className = 'va-bubble'; b.textContent = txt;
    el.appendChild(b);
    setTimeout(function() { b.remove(); }, dur);
  }

  // ─── 循环调度 ─────────────────────────────────────────────
  function scheduleNext(container) {
    var delay = randRange(CFG.minGap, CFG.maxGap);
    setTimeout(function() {
      var type = rand(CFG.allTypes);
      createAnimal(container, type);
    }, delay);
  }

  // ─── 构建面板 ─────────────────────────────────────────────
  function buildPanel(side) {
    var panel = document.createElement('div');
    panel.className = 'va-panel va-' + side;

    var scene = document.createElement('div');
    scene.className = 'va-scene';

    var walkway = document.createElement('div');
    walkway.className = 'va-walkway';
    scene.appendChild(walkway);
    panel.appendChild(scene);
    document.body.appendChild(panel);

    return walkway;
  }

  // ─── 初始化 ───────────────────────────────────────────────
  var walkways = {};

  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    walkways.left = buildPanel('left');
    walkways.right = buildPanel('right');

    // 随机延迟启动
    setTimeout(function() {
      createAnimal(walkways.left, rand(CFG.allTypes));
    }, 3000 + Math.random() * 5000);
    setTimeout(function() {
      if (Math.random() < 0.6) {
        createAnimal(walkways.right, rand(CFG.allTypes));
      }
    }, 8000 + Math.random() * 10000);

    // 任务完成庆祝
    window.addEventListener('storage', function(e) {
      if (e.key !== 'childlib_event') return;
      try {
        var d = JSON.parse(e.newValue || '{}');
        if (d.type === 'task_complete') doCelebrate();
      } catch (_) {}
    });
  }

  // ─── 公共 API ─────────────────────────────────────────────
  function doCelebrate() {
    // 现有动物庆祝 + 额外召唤一只
    activeAnimals.forEach(function(a) {
      if (a.alive) {
        showBubble(a.el, rand(a.def.cheers), 2000);
        a.el.style.animation = 'va-cel .8s ease';
        setTimeout(function() { a.el.style.animation = a.def.idle; }, 800);
      }
    });
    // 庆祝时也召唤一只
    if (Math.random() < 0.7) {
      var side = Math.random() > 0.5 ? 'left' : 'right';
      if (walkways[side]) {
        createAnimal(walkways[side], rand(CFG.allTypes));
      }
    }
  }

  window.villageAnimals = {
    celebrate: doCelebrate,
    react: function(type) {
      activeAnimals.filter(function(a) { return a.type === type && a.alive; })
        .forEach(function(a) { a.react(); });
    },
    getActive: function() { return activeAnimals.length; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
