/**
 * GPT Sprite Loader
 * 从 assets-manifest.json 加载精灵图索引，提供按分类/ID查询的 API。
 * 用法：
 *   SpriteLoader.init().then(function() {
 *     var pigFrames = SpriteLoader.getFrames('animals', 'pig');
 *     var buildings = SpriteLoader.getGroups('buildings');
 *   });
 */
(function() {
  var MANIFEST_PATH = 'assets/gpt-sprites/assets-manifest.json';
  var BASE_PATH = 'assets/gpt-sprites/';
  var manifest = null;
  var ready = false;

  var Loader = {
    /**
     * 加载 manifest，返回 Promise
     */
    init: function() {
      if (ready) return Promise.resolve();
      return fetch(MANIFEST_PATH)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          manifest = data;
          BASE_PATH = data.base_path || BASE_PATH;
          ready = true;
          console.log('[SpriteLoader] Loaded:', data.total_files, 'files,', Object.keys(data.categories).length, 'categories');
        })
        .catch(function(e) {
          console.warn('[SpriteLoader] Failed to load manifest:', e);
          manifest = null;
          ready = false;
        });
    },

    isReady: function() { return ready; },

    /**
     * 获取分类的所有 groups
     * @param {string} category - 如 'animals', 'buildings'
     * @returns {Array} groups 数组
     */
    getGroups: function(category) {
      if (!manifest || !manifest.categories[category]) return [];
      return manifest.categories[category].groups || [];
    },

    /**
     * 获取指定分类+ID的 frames
     * @param {string} category - 分类名
     * @param {string} id - group id，如 'pig', 'stories'
     * @returns {Array} 帧路径数组
     */
    getFrames: function(category, id) {
      var groups = this.getGroups(category);
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].id === id) return groups[i].frames || [];
      }
      return [];
    },

    /**
     * 获取指定分类+ID的 label
     */
    getLabel: function(category, id) {
      var groups = this.getGroups(category);
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].id === id) return groups[i].label || id;
      }
      return id;
    },

    /**
     * 获取完整 URL（相对当前页面的路径）
     * @param {string} relativePath - manifest 中的相对路径
     * @returns {string} 完整可用的 URL
     */
    url: function(relativePath) {
      return BASE_PATH + relativePath;
    },

    /**
     * 生成 <img> 标签 HTML
     * @param {string} category
     * @param {string} id
     * @param {number} frameIndex - 帧索引，默认 0
     * @param {object} opts - { width, height, cls, alt, style }
     * @returns {string} HTML string
     */
    imgTag: function(category, id, frameIndex, opts) {
      frameIndex = frameIndex || 0;
      opts = opts || {};
      var frames = this.getFrames(category, id);
      if (!frames.length) return '';
      var src = this.url(frames[frameIndex % frames.length]);
      var w = opts.width || 48;
      var h = opts.height || 48;
      var cls = opts.cls ? ' class="' + opts.cls + '"' : '';
      var alt = opts.alt || id;
      var style = opts.style || 'image-rendering:pixelated;';
      return '<img src="' + src + '" alt="' + alt + '" width="' + w + '" height="' + h + '"' + cls + ' style="' + style + '" loading="lazy">';
    },

    /**
     * 获取所有分类名
     */
    getCategories: function() {
      if (!manifest) return [];
      return Object.keys(manifest.categories);
    },

    /**
     * 获取 manifest 中的元数据
     */
    getMeta: function() {
      if (!manifest) return {};
      return {
        version: manifest.version,
        generated_at: manifest.generated_at,
        total_files: manifest.total_files
      };
    }
  };

  window.SpriteLoader = Loader;
})();
