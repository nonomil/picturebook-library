import {
  getCompletionState,
  getProgress,
  markInteraction,
  startSession,
  visitStep
} from './courseware-model.js';

const SESSION_PREFIX = 'picturebook_courseware_session_v1:';
const COMPLETION_KEY = 'picturebook_courseware_completions_v1';

function getConfig() {
  const config = globalThis.COURSEWARE_CONFIG;
  if (!config || typeof config !== 'object') throw new Error('courseware config is missing');
  if (!Array.isArray(config.steps) || config.steps.length === 0) throw new Error('courseware steps are missing');
  return config;
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn('[CoursewareRuntime] local storage read failed', error);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[CoursewareRuntime] local storage write failed', error);
    return false;
  }
}

function createInitialSession(config) {
  return startSession({
    id: config.id,
    template: config.template,
    steps: config.steps,
    requiredInteractions: config.requiredInteractions || []
  });
}

function loadSession(config) {
  const stored = readJson(`${SESSION_PREFIX}${config.id}`, null);
  if (!stored || stored.id !== config.id || stored.template !== config.template) return createInitialSession(config);
  if (!Array.isArray(stored.steps) || stored.steps.length !== config.steps.length) return createInitialSession(config);
  if (!Array.isArray(stored.visited) || stored.visited.length !== config.steps.length) return createInitialSession(config);
  if (!Array.isArray(stored.interactions)) return createInitialSession(config);
  const resumed = { ...stored, steps: config.steps, requiredInteractions: config.requiredInteractions || [] };
  return visitStep(resumed, Math.min(Math.max(Number(resumed.currentIndex) || 0, 0), config.steps.length - 1));
}

function saveSession(session) {
  writeJson(`${SESSION_PREFIX}${session.id}`, session);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderParagraphs(value, className = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.split(/\n+/).map(paragraph => `<p class="${className}">${escapeHtml(paragraph)}</p>`).join('');
}

function detailsMarkup(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return `<details class="cw-details"><summary>展开完整内容</summary>${renderParagraphs(text, 'cw-details-copy')}</details>`;
}

function sceneMarkup(scene = 'meadow') {
  const scenes = {
    meadow: ['meadow', '阳光草地', 'TILLY'],
    picnic: ['picnic', '野餐时光', 'SHARE'],
    wind: ['wind', '风把野餐吹走了', 'WHOOSH'],
    listening: ['listening', '学会倾听', 'LISTEN'],
    bubbles: ['bubbles', '泡泡实验台', 'OBSERVE'],
    star: ['star', '夜空音乐台', 'SING']
  };
  const [className, label, mark] = scenes[scene] || scenes.meadow;
  return `<div class="cw-scene cw-scene-${className}" role="img" aria-label="${escapeHtml(label)}">
    <span class="cw-scene-sun"></span><span class="cw-scene-hill"></span><span class="cw-scene-orbit"></span>
    <span class="cw-scene-mark">${escapeHtml(mark)}</span><span class="cw-scene-label">${escapeHtml(label)}</span>
  </div>`;
}

function artMarkup(step) {
  if (step.artSvg) {
    const svg = String(step.artSvg)
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
    return `<div class="cw-art-panel cw-art-panel-svg"><div class="cw-art-svg" role="img" aria-label="${escapeHtml(step.imageAlt || step.title || '课程插图')}">${svg}</div></div>`;
  }
  const images = Array.isArray(step.images) && step.images.length ? step.images : step.image ? [step.image] : [];
  if (images.length) {
    return `<div class="cw-art-panel${images.length > 1 ? ' cw-art-panel-gallery' : ''}"><div class="cw-art-gallery">${images.map((image, index) => `<img class="cw-image" src="${escapeHtml(image)}" alt="${escapeHtml(step.imageAlt || `${step.title || '课程插图'} · ${index + 1}`)}" />`).join('')}</div></div>`;
  }
  return `<div class="cw-art-panel">${sceneMarkup(step.scene)}</div>`;
}

function vocabMarkup(vocab = []) {
  if (!Array.isArray(vocab) || vocab.length === 0) return '';
  return `<div class="cw-vocab" aria-label="词语朗读">
    ${vocab.map((word, index) => `<button type="button" class="cw-vocab-button" data-speak="${escapeHtml(word.en || word.text || word.zh || '')}" data-vocab-index="${index}">${escapeHtml(word.text || word.zh || word.en || '')}${word.en ? `<small>${escapeHtml(word.en)}</small>` : ''}</button>`).join('')}
  </div>`;
}

function taskMarkup(step, index) {
  if (!Array.isArray(step.options) || step.options.length === 0) return '';
  return `<section class="cw-task" aria-labelledby="cw-task-title">
    <p class="cw-task-label">一起想一想</p>
    <h3 id="cw-task-title">${escapeHtml(step.question || '请选择一个答案')}</h3>
    <div class="cw-options">
      ${step.options.map((option, optionIndex) => `<button type="button" class="cw-option" data-quiz-index="${index}" data-option-index="${optionIndex}" data-correct="${option.correct ? 'true' : 'false'}">${escapeHtml(option.label || option.text || '')}</button>`).join('')}
    </div>
    <p class="cw-feedback" id="cw-feedback" role="status">${escapeHtml(step.hint || '选好后会看到提示，可以再试一次。')}</p>
  </section>`;
}

function recordMarkup(step, index) {
  if (!step.record) return '';
  return `<section class="cw-record-card" aria-labelledby="cw-record-title">
    <p class="cw-task-label">我的发现</p>
    <h3 id="cw-record-title">${escapeHtml(step.record.prompt || '完成观察后，记录你的发现')}</h3>
    <label class="cw-record-check"><input type="checkbox" data-record-index="${index}" /> <span>${escapeHtml(step.record.label || '我已经完成这一步')}</span></label>
    <p class="cw-feedback" id="cw-record-feedback" role="status">勾选后会保存到本机。</p>
  </section>`;
}

function audioMarkup(step) {
  if (!step.audio?.src) return '';
  return `<button type="button" class="cw-audio-button" data-audio-src="${escapeHtml(step.audio.src)}" data-audio-lang="${escapeHtml(step.audio.lang || '')}">播放本页音频</button>`;
}

function poemMarkup(step) {
  if (!step.poemLine) return '';
  return `<section class="cw-poem-reading" aria-label="诗句朗读"><p class="cw-poem-label">诗句</p><button type="button" class="cw-poem-line" data-speak="${escapeHtml(step.poemLine)}">${escapeHtml(step.poemLine)}<span>点击诗句也可以朗读</span></button><div class="cw-poem-explanation"><strong>画面意思</strong><p>${escapeHtml(step.poemExplanation || step.textZh || '')}</p></div></section>`;
}

function practiceMarkup(step, index) {
  const practice = step.practice;
  if (!practice) return '';
  const pairs = Array.isArray(practice.pairs) ? practice.pairs : [];
  const pairMarkup = pairs.length ? `<div class="cw-practice-pairs" aria-label="配对练习"><div class="cw-practice-column"><span class="cw-practice-column-label">${escapeHtml(practice.leftLabel || '图画')}</span>${pairs.map((pair, pairIndex) => `<button type="button" class="cw-practice-pair" data-practice-side="left" data-practice-pair="${index}:${pairIndex}">${escapeHtml(pair.left)}</button>`).join('')}</div><span class="cw-practice-arrow" aria-hidden="true">↔</span><div class="cw-practice-column"><span class="cw-practice-column-label">${escapeHtml(practice.rightLabel || '汉字')}</span>${pairs.map((pair, pairIndex) => `<button type="button" class="cw-practice-pair" data-practice-side="right" data-practice-pair="${index}:${pairIndex}">${escapeHtml(pair.right)}</button>`).join('')}</div></div>` : '';
  const traceMarkup = practice.trace ? `<div class="cw-trace-card"><p class="cw-practice-help">用手指在框里画一画，再点击“我画好啦”。</p><canvas class="cw-trace-canvas" data-trace-pad="${index}" width="640" height="220" aria-label="描字练习画板"></canvas><button type="button" class="cw-practice-done" data-practice-trace="${index}">我画好啦</button></div>` : '';
  if (!pairMarkup && !traceMarkup) return `<div class="cw-practice-card"><p class="cw-practice-help">${escapeHtml(practice.prompt || '完成这一页的动手练习。')}</p><button type="button" class="cw-practice-done" data-practice-observe="${index}">我完成了</button></div>`;
  return `<section class="cw-practice-card" aria-label="${escapeHtml(practice.label || '动手练习')}"><p class="cw-task-label">动手试试</p><h3>${escapeHtml(practice.prompt || '完成这一页的动手练习，再继续下一页。')}</h3>${pairMarkup}${traceMarkup}<p class="cw-feedback" data-practice-feedback="${index}" role="status">还差一步，完成后才能继续。</p></section>`;
}

function renderAdventure(step, index) {
  return `<div class="cw-stage-grid">
    ${artMarkup(step)}
    <div class="cw-copy-panel">
      <p class="cw-step-kicker">第 ${index + 1} 页 · 故事继续</p>
      <h2>${escapeHtml(step.title)}</h2>
      ${poemMarkup(step)}
      ${renderParagraphs(step.textZh, 'cw-zh')}
      ${renderParagraphs(step.textEn, 'cw-en')}
      ${audioMarkup(step)}
      ${detailsMarkup(step.detailsText)}
      ${vocabMarkup(step.vocab)}
      ${taskMarkup(step, index)}
    </div>
  </div>`;
}

function renderPoem(step, index) {
  const hasLine = Boolean(step.poemLine);
  return `<div class="cw-poem-stage">
    ${artMarkup(step)}
    <section class="cw-poem-copy">
      <p class="cw-step-kicker">第 ${index + 1} 步 · ${hasLine ? '读诗看画' : '说说诗意'}</p>
      <h2>${escapeHtml(step.title)}</h2>
      ${poemMarkup(step)}
      ${hasLine ? '' : renderParagraphs(step.textZh, 'cw-zh')}
      ${renderParagraphs(step.textEn, 'cw-en')}
      ${audioMarkup(step)}
      ${detailsMarkup(step.detailsText)}
      ${taskMarkup(step, index)}
    </section>
  </div>`;
}

function renderClassroom(step, index) {
  return `<div class="cw-classroom-grid">
    ${step.artSvg || step.image || (Array.isArray(step.images) && step.images.length) ? artMarkup(step) : ''}
    <section class="cw-concept-card">
      <p class="cw-step-kicker">第 ${index + 1} 步 · 认识与练习</p>
      <h2>${escapeHtml(step.title)}</h2>
      ${renderParagraphs(step.body || step.textZh, 'cw-zh')}
      ${renderParagraphs(step.textEn, 'cw-en')}
      ${audioMarkup(step)}
      ${detailsMarkup(step.detailsText)}
      ${Array.isArray(step.keywords) ? `<div class="cw-keyword-grid">${step.keywords.map(item => `<div class="cw-keyword">${escapeHtml(item.main || item)}${item.sub ? `<small>${escapeHtml(item.sub)}</small>` : ''}</div>`).join('')}</div>` : ''}
      ${vocabMarkup(step.vocab)}
      ${taskMarkup(step, index)}
      ${recordMarkup(step, index)}
      ${practiceMarkup(step, index)}
    </section>
  </div>`;
}

function renderActivity(step, index) {
  return `<div class="cw-activity-stack">
    ${step.image || (Array.isArray(step.images) && step.images.length) || step.scene ? artMarkup(step) : ''}
    <section class="cw-activity-card">
      <p class="cw-step-kicker">第 ${index + 1} 步 · 动手试试</p>
      <h2>${escapeHtml(step.title)}</h2>
      ${renderParagraphs(step.body || step.textZh, 'cw-zh')}
      ${renderParagraphs(step.textEn, 'cw-en')}
      ${audioMarkup(step)}
      ${detailsMarkup(step.detailsText)}
      ${Array.isArray(step.lyrics) ? `<div class="cw-song-lyrics">${step.lyrics.map(line => `<div class="cw-song-line">${escapeHtml(line)}</div>`).join('')}</div>` : ''}
      ${Array.isArray(step.checklist) ? `<div class="cw-record">${step.checklist.map((item, itemIndex) => `<label><input type="checkbox" data-checklist-index="${index}:${itemIndex}" /> <span>${escapeHtml(item)}</span></label>`).join('')}</div>` : ''}
      ${taskMarkup(step, index)}
      ${recordMarkup(step, index)}
      ${practiceMarkup(step, index)}
    </section>
  </div>`;
}

function readText(step) {
  if (step.poemLine) return [step.poemLine, step.poemExplanation || step.textZh].filter(Boolean).join('。');
  if (step.audio?.lang?.startsWith('zh')) return [step.textZh || step.body, step.title].filter(Boolean).join('. ');
  if (step.audio?.lang?.startsWith('en')) return [step.textEn || step.textZh || step.body, step.title].filter(Boolean).join('. ');
  return [step.textZh || step.textEn || step.body, step.title].filter(Boolean).join('. ');
}

export function interactionBelongsToStep(key, index) {
  const value = String(key || '').trim();
  const step = String(Number(index));
  return value === `quiz:${step}`
    || value === `record:${step}`
    || value === `practice:${step}`
    || value === `check:${step}`
    || value.startsWith(`practice:${step}:`)
    || value.startsWith(`check:${step}:`);
}

function completionLedger() {
  const value = readJson(COMPLETION_KEY, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function markCompleted(config, completionId) {
  const ledger = completionLedger();
  const firstCompletion = !ledger[config.id];
  if (firstCompletion) {
    ledger[config.id] = { completionId, completedAt: new Date().toISOString() };
    writeJson(COMPLETION_KEY, ledger);
  }
  const detail = { id: config.id, completionId, firstCompletion };
  if (firstCompletion) window.dispatchEvent(new CustomEvent('courseware:completed', { detail }));
  return detail;
}

function boot(config) {
  const app = document.querySelector('#courseware-app');
  if (!app) throw new Error('courseware app root is missing');
  const stage = app.querySelector('#cw-stage');
  const progressFill = app.querySelector('#cw-progress-fill');
  const progressValue = app.querySelector('#cw-progress-value');
  const progressLabel = app.querySelector('#cw-progress-label');
  const stepCounter = app.querySelector('#cw-step-counter');
  const status = app.querySelector('#cw-status');
  const completion = app.querySelector('#cw-completion');
  const completionText = app.querySelector('#cw-completion-text');
  const previous = app.querySelector('#cw-prev');
  const next = app.querySelector('#cw-next');
  const sessionState = { current: loadSession(config) };

  function setStatus(message, state = '') {
    status.textContent = message;
    status.className = `cw-status${state ? ` is-${state}` : ''}`;
  }

  function refreshCompletion() {
    const state = getCompletionState(sessionState.current);
    progressFill.style.width = `${state.progress}%`;
    progressValue.textContent = `${state.progress}%`;
    progressLabel.textContent = state.completed ? '已完成' : '阅读进度';
    stepCounter.textContent = `第 ${sessionState.current.currentIndex + 1} / ${config.steps.length} 步`;
    previous.disabled = sessionState.current.currentIndex === 0;
    next.textContent = state.completed ? '重新开始' : sessionState.current.currentIndex === config.steps.length - 1 ? '完成阅读' : '下一步';
    if (state.completed) {
      completion.hidden = false;
      const result = markCompleted(config, state.completionId);
      completionText.textContent = result.firstCompletion
        ? `你完成了这次${config.activityLabel || '学习'}，完成记录已保存到本机。再次阅读会保留记录。`
        : `你完成了这次${config.activityLabel || '学习'}，本机已经保存过完成记录。`;
      setStatus('完成记录已保存到本机。', 'success');
    } else {
      completion.hidden = true;
    }
  }

  function render() {
    const step = config.steps[sessionState.current.currentIndex];
    if (config.contentType === 'poem') stage.innerHTML = renderPoem(step, sessionState.current.currentIndex);
    else if (config.template === 'adventure-story') stage.innerHTML = renderAdventure(step, sessionState.current.currentIndex);
    else if (config.template === 'interactive-classroom') stage.innerHTML = renderClassroom(step, sessionState.current.currentIndex);
    else stage.innerHTML = renderActivity(step, sessionState.current.currentIndex);
    refreshCompletion();
    stage.querySelectorAll('[data-speak], .cw-vocab-button').forEach(button => {
      button.addEventListener('click', () => speak(button.dataset.speak || button.textContent));
    });
    stage.querySelectorAll('[data-audio-src]').forEach(button => {
      button.addEventListener('click', () => playLocalAudio(button));
    });
    stage.querySelectorAll('img.cw-image').forEach(image => {
      image.addEventListener('error', () => {
        image.replaceWith(Object.assign(document.createElement('div'), {
          className: 'cw-media-fallback',
          textContent: '这张插图暂时打不开，请先观察文字并继续。'
        }));
        setStatus('插图暂时打不开，已保留文字内容。', 'warning');
      }, { once: true });
    });
    stage.querySelectorAll('[data-quiz-index]').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.quizIndex);
        const option = config.steps[index]?.options?.[Number(button.dataset.optionIndex)];
        const feedback = stage.querySelector('#cw-feedback');
        if (option?.correct) {
          sessionState.current = markInteraction(sessionState.current, `quiz:${index}`);
          saveSession(sessionState.current);
          stage.querySelectorAll('[data-quiz-index]').forEach(item => {
            item.disabled = true;
            if (item.dataset.correct === 'true') item.classList.add('is-correct');
          });
          if (feedback) feedback.textContent = option.feedback || '答对了！可以继续下一步。';
          setStatus('练习完成，可以继续。', 'success');
          refreshCompletion();
        } else if (feedback) {
          button.classList.add('is-wrong');
          feedback.textContent = option?.hint || '再想一想，看看题目中的线索。';
          setStatus('可以再试一次。', 'warning');
        }
      });
    });
    stage.querySelectorAll('[data-record-index]').forEach(input => {
      input.addEventListener('change', () => {
        const index = Number(input.dataset.recordIndex);
        if (!input.checked) return;
        sessionState.current = markInteraction(sessionState.current, `record:${index}`);
        saveSession(sessionState.current);
        const feedback = stage.querySelector('#cw-record-feedback');
        if (feedback) feedback.textContent = '已记录，可以继续。';
        setStatus('观察记录已保存。', 'success');
        refreshCompletion();
      });
    });
    stage.querySelectorAll('[data-checklist-index]').forEach(input => {
      input.addEventListener('change', () => {
        const [stepIndex, itemIndex] = input.dataset.checklistIndex.split(':').map(Number);
        if (input.checked) {
          sessionState.current = markInteraction(sessionState.current, `check:${stepIndex}:${itemIndex}`);
          saveSession(sessionState.current);
          setStatus('这项准备已记录。', 'success');
        }
      });
    });
    bindPractice(stage);
  }

  function bindPractice(container) {
    const practiceButtons = container.querySelectorAll('[data-practice-side]');
    const selected = { left: null, right: null };
    const matched = new Set();
    practiceButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (button.disabled || button.classList.contains('is-matched')) return;
        const side = button.dataset.practiceSide;
        practiceButtons.forEach(item => item.classList.toggle('is-selected', item === button));
        selected[side] = button;
        if (!selected.left || !selected.right) return;
        const [leftIndex] = selected.left.dataset.practicePair.split(':').map(Number);
        const [rightIndex] = selected.right.dataset.practicePair.split(':').map(Number);
        const leftPair = Number(selected.left.dataset.practicePair.split(':')[1]);
        const rightPair = Number(selected.right.dataset.practicePair.split(':')[1]);
        const feedback = container.querySelector('[data-practice-feedback]');
        if (leftIndex === rightIndex && leftPair === rightPair) {
          const pairKey = `${leftIndex}:${leftPair}`;
          matched.add(pairKey);
          sessionState.current = markInteraction(sessionState.current, `practice:${leftIndex}:${leftPair}`);
          selected.left.classList.add('is-matched');
          selected.right.classList.add('is-matched');
          selected.left.disabled = true;
          selected.right.disabled = true;
          const totalPairs = new Set([...container.querySelectorAll('[data-practice-side="left"]')].map(item => item.dataset.practicePair.split(':')[1])).size;
          const completedPairs = matched.size;
          if (completedPairs >= totalPairs) {
            sessionState.current = markInteraction(sessionState.current, `practice:${leftIndex}:match`);
            if (feedback) feedback.textContent = `全部 ${totalPairs} 对都配好了，可以继续。`;
          } else if (feedback) feedback.textContent = `配对成功！还剩 ${totalPairs - completedPairs} 对。`;
          setStatus('配对成功。', 'success');
          saveSession(sessionState.current);
          refreshCompletion();
        } else {
          const wrongLeft = selected.left;
          const wrongRight = selected.right;
          wrongLeft.classList.add('is-wrong');
          wrongRight.classList.add('is-wrong');
          if (feedback) feedback.textContent = '这两个不是一对，再找找线索。';
          setStatus('再试一次。', 'warning');
          window.setTimeout(() => {
            wrongLeft.classList.remove('is-wrong', 'is-selected');
            wrongRight.classList.remove('is-wrong', 'is-selected');
          }, 500);
        }
        selected.left = null;
        selected.right = null;
      });
    });
    container.querySelectorAll('[data-trace-pad]').forEach(canvas => {
      const context = canvas.getContext?.('2d');
      let drawing = false;
      const point = event => {
        const rect = canvas.getBoundingClientRect();
        return { x: ((event.clientX - rect.left) / rect.width) * canvas.width, y: ((event.clientY - rect.top) / rect.height) * canvas.height };
      };
      canvas.addEventListener('pointerdown', event => {
        if (!context) return;
        drawing = true;
        canvas.setPointerCapture?.(event.pointerId);
        const current = point(event);
        context.beginPath();
        context.moveTo(current.x, current.y);
        canvas.dataset.hasStroke = 'true';
      });
      canvas.addEventListener('pointermove', event => {
        if (!drawing || !context) return;
        const current = point(event);
        context.lineTo(current.x, current.y);
        context.strokeStyle = '#3469a5';
        context.lineWidth = 8;
        context.lineCap = 'round';
        context.stroke();
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => canvas.addEventListener(type, () => { drawing = false; }));
    });
    container.querySelectorAll('[data-practice-trace]').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.practiceTrace);
        const canvas = container.querySelector(`[data-trace-pad="${index}"]`);
        const feedback = container.querySelector('[data-practice-feedback]');
        if (canvas?.dataset.hasStroke !== 'true') {
          if (feedback) feedback.textContent = '先在框里画一画，再点击完成。';
          setStatus('先画一画再继续。', 'warning');
          return;
        }
        sessionState.current = markInteraction(sessionState.current, `practice:${index}:trace`);
        saveSession(sessionState.current);
        if (feedback) feedback.textContent = '描字完成，可以继续。';
        setStatus('描字完成。', 'success');
        refreshCompletion();
      });
    });
    container.querySelectorAll('[data-practice-observe]').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.practiceObserve);
        sessionState.current = markInteraction(sessionState.current, `practice:${index}`);
        saveSession(sessionState.current);
        setStatus('动手练习已记录。', 'success');
        refreshCompletion();
      });
    });
  }

  function playLocalAudio(button) {
    const src = button.dataset.audioSrc;
    if (!src || typeof Audio === 'undefined') {
      speak(readText(config.steps[sessionState.current.currentIndex]));
      return;
    }
    const audio = new Audio(src);
    button.disabled = true;
    button.textContent = '正在播放…';
    setStatus('正在播放本页音频。');
    audio.onended = () => { button.disabled = false; button.textContent = '播放本页音频'; setStatus('音频播放完成。', 'success'); };
    audio.onerror = () => { button.disabled = false; button.textContent = '播放本页音频'; setStatus('本地音频不可用，改用离线朗读。', 'warning'); speak(readText(config.steps[sessionState.current.currentIndex])); };
    audio.play().catch(() => { audio.onerror(); });
  }

  function speak(text) {
    const value = String(text || '').trim();
    if (!value) return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setStatus('当前浏览器没有离线朗读能力，可以直接阅读文字。', 'warning');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = /[\u4e00-\u9fff]/.test(value) ? 'zh-CN' : 'en-US';
    utterance.rate = 0.9;
    utterance.onstart = () => setStatus('正在朗读，听完后可以继续。');
    utterance.onend = () => setStatus('朗读完成。', 'success');
    utterance.onerror = () => setStatus('朗读暂时不可用，可以继续阅读文字。', 'warning');
    window.speechSynthesis.speak(utterance);
  }

  previous.addEventListener('click', () => {
    sessionState.current = visitStep(sessionState.current, sessionState.current.currentIndex - 1);
    saveSession(sessionState.current);
    render();
    setStatus('已回到上一页。');
  });

  next.addEventListener('click', () => {
    const state = getCompletionState(sessionState.current);
    if (state.completed) {
      sessionState.current = createInitialSession(config);
      saveSession(sessionState.current);
      render();
      setStatus('已重新开始，可以再读一遍。');
      return;
    }
    if (sessionState.current.currentIndex === config.steps.length - 1) {
      const missing = (config.requiredInteractions || []).filter(key => !sessionState.current.interactions.includes(key));
      if (missing.length) {
        setStatus('先完成当前页的小练习或记录，再完成整本内容。', 'warning');
        return;
      }
    }
    const currentIndex = sessionState.current.currentIndex;
    const requiredForCurrent = (config.requiredInteractions || []).filter(key => interactionBelongsToStep(key, currentIndex));
    const missingCurrent = requiredForCurrent.filter(key => !sessionState.current.interactions.includes(key));
    if (missingCurrent.length) {
      setStatus('先完成这一页的小练习，再进入下一页。', 'warning');
      return;
    }
    sessionState.current = visitStep(sessionState.current, sessionState.current.currentIndex + 1);
    saveSession(sessionState.current);
    render();
    setStatus('已进入下一步。');
  });

  app.querySelector('#cw-read-aloud').addEventListener('click', () => {
    const audioButton = stage.querySelector('[data-audio-src]');
    if (audioButton) playLocalAudio(audioButton);
    else speak(readText(config.steps[sessionState.current.currentIndex]));
  });
  app.querySelector('#cw-reset').addEventListener('click', () => {
    sessionState.current = createInitialSession(config);
    saveSession(sessionState.current);
    render();
    setStatus('进度已重置。');
  });
  render();
  globalThis.CoursewareRuntime = { getSession: () => sessionState.current, speak, reset: () => app.querySelector('#cw-reset').click() };
}

if (typeof document !== 'undefined' && document.querySelector?.('#courseware-app')) {
  try {
    boot(getConfig());
  } catch (error) {
    console.error('[CoursewareRuntime] boot failed', error);
    const message = document.querySelector('#cw-status');
    if (message) message.textContent = '课件暂时无法打开，请返回书架后重试。';
  }
}
