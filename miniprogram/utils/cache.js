/**
 * 简易本地缓存封装，支持TTL
 */
function set (key, value, ttlMs = 0) {
  const payload = { value, expireAt: ttlMs > 0 ? Date.now() + ttlMs : 0 };
  try {
    wx.setStorageSync(key, payload);
  } catch (e) { }
}

function get (key, defaultValue = null) {
  try {
    const payload = wx.getStorageSync(key);
    if (!payload) return defaultValue;
    if (payload.expireAt && payload.expireAt > 0 && Date.now() > payload.expireAt) {
      wx.removeStorageSync(key);
      return defaultValue;
    }
    return payload.value;
  } catch (e) {
    return defaultValue;
  }
}

function remove (key) {
  try { wx.removeStorageSync(key); } catch (e) { }
}

module.exports = {
  set,
  get,
  remove
};
