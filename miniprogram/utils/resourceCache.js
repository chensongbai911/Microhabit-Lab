/**
 * 资源预加载与缓存初始化
 * 在app.js启动时调用，预加载动效色板等资源到本地存储
 */
const cache = require('./cache.js');
const { getConfettiConfig } = require('./effects.js');

/**
 * 初始化动效资源缓存
 */
function initEffectsResources () {
  try {
    // 预加载不同tier的色板
    const configs = {
      regular: getConfettiConfig('regular'),
      day3: getConfettiConfig('day3'),
      day7: getConfettiConfig('day7'),
      recovery: getConfettiConfig('recovery')
    };

    // 缓存主色板（避免每次从effects.js重新计算）
    cache.set('confetti_colors_regular', configs.regular.colors);
    cache.set('confetti_colors_day3', configs.day3.colors);
    cache.set('confetti_colors_day7', configs.day7.colors);
    cache.set('confetti_colors_recovery', configs.recovery.colors);

    // 缓存全局效果开关（默认开启）
    if (!cache.get('effects_enabled')) {
      cache.set('effects_enabled', true);
    }

    // 缓存动效强度（1-3: 低/中/高，默认中）
    if (!cache.get('effects_intensity')) {
      cache.set('effects_intensity', 2);
    }

    console.log('[ResourceCache] Effects resources initialized');
  } catch (e) {
    console.error('[ResourceCache] Failed to init effects:', e);
  }
}

/**
 * 预热Canvas上下文（可选，提升首次绘制速度）
 */
function warmupCanvas () {
  try {
    // 微信小程序中 canvas 会在首次使用时自动初始化，此处为占位
    // 如果使用了离屏canvas或类似高级特性再做处理
  } catch (e) { }
}

/**
 * 获取当前效果强度（用于调整粒子数量、时长等）
 */
function getEffectsIntensity () {
  return cache.get('effects_intensity', 2);
}

/**
 * 更新效果开关
 */
function setEffectsEnabled (enabled) {
  cache.set('effects_enabled', !!enabled);
}

/**
 * 更新效果强度
 */
function setEffectsIntensity (level) {
  const intensity = Math.max(1, Math.min(3, level));
  cache.set('effects_intensity', intensity);
}

module.exports = {
  initEffectsResources,
  warmupCanvas,
  getEffectsIntensity,
  setEffectsEnabled,
  setEffectsIntensity
};
