(function (global) {
  function targets(value) {
    if (typeof value === 'string') return [...document.querySelectorAll(value)];
    if (value && typeof value.length === 'number' && !value.nodeType) return [...value];
    return value ? [value] : [];
  }

  function toArray(value) {
    return targets(value);
  }

  function apply(value, vars) {
    for (const node of targets(value)) {
      for (const [key, setting] of Object.entries(vars || {})) {
        if (['duration', 'delay', 'ease', 'onComplete', 'onUpdate', 'repeat', 'yoyo', 'stagger'].includes(key)) continue;
        if (key === 'scale') node.style.transform = `scale(${setting})`;
        else if (key === 'x') node.style.transform = `translateX(${setting}px)`;
        else if (key === 'y') node.style.transform = `translateY(${setting}px)`;
        else node.style[key] = setting;
      }
    }
  }

  function finish(vars) {
    if (typeof vars?.onComplete === 'function') vars.onComplete();
  }

  function to(value, vars) {
    apply(value, vars);
    finish(vars);
    return { kill() {} };
  }

  function fromTo(value, fromVars, toVars) {
    apply(value, fromVars);
    return to(value, toVars);
  }

  function from(value, vars) {
    return to(value, vars);
  }

  function timeline() {
    return {
      to(value, vars) { to(value, vars); return this; },
      from(value, vars) { from(value, vars); return this; },
      fromTo(value, fromVars, toVars) { fromTo(value, fromVars, toVars); return this; },
      set(value, vars) { apply(value, vars); return this; },
      play() { return this; },
      kill() {}
    };
  }

  global.gsap = { to, from, fromTo, timeline, set: apply, utils: { toArray }, registerPlugin() {} };
  global.ScrollTrigger = { refresh() {} };
})(window);
