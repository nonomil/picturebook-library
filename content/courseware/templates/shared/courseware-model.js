export const TEMPLATE_IDS = Object.freeze([
  'adventure-story',
  'interactive-classroom',
  'activity-studio'
]);

function assertSession(session) {
  if (!session || !TEMPLATE_IDS.includes(session.template)) throw new Error('invalid courseware session');
  if (!Array.isArray(session.steps) || !Array.isArray(session.visited)) throw new Error('courseware session steps are invalid');
}

export function createSession({ id, template, steps, requiredInteractions = [] }) {
  if (!String(id || '').trim()) throw new Error('courseware id is required');
  if (!TEMPLATE_IDS.includes(template)) throw new Error(`unsupported courseware template: ${template}`);
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('courseware steps are required');
  return {
    id: String(id),
    template,
    steps: steps.map(step => ({ ...step })),
    requiredInteractions: [...new Set(requiredInteractions.map(String))],
    currentIndex: 0,
    visited: steps.map(() => false),
    interactions: [],
    startedAt: Date.now()
  };
}

export function startSession(options) {
  return visitStep(createSession(options), 0);
}

export function visitStep(session, index) {
  assertSession(session);
  const nextIndex = Number(index);
  if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= session.steps.length) return session;
  const visited = [...session.visited];
  visited[nextIndex] = true;
  return { ...session, currentIndex: nextIndex, visited };
}

export function markInteraction(session, key) {
  assertSession(session);
  const value = String(key || '').trim();
  if (!value || session.interactions.includes(value)) return session;
  return { ...session, interactions: [...session.interactions, value] };
}

export function getProgress(session) {
  assertSession(session);
  const visited = session.visited.filter(Boolean).length;
  return Math.round((visited / session.steps.length) * 100);
}

export function getCompletionState(session) {
  assertSession(session);
  const allStepsVisited = session.visited.length > 0 && session.visited.every(Boolean);
  const requiredDone = session.requiredInteractions.every(key => session.interactions.includes(key));
  const completed = allStepsVisited && requiredDone;
  return {
    completed,
    completionId: completed ? `${session.id}:${session.startedAt}` : '',
    progress: getProgress(session)
  };
}
