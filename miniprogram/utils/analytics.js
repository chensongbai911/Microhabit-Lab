/**
 * 轻量埋点工具
 * 使用微信小程序内置 wx.reportAnalytics，如不可用则降级为 console.log
 */
function track (eventName, data = {}) {
  try {
    if (typeof wx.reportAnalytics === 'function') {
      // wx.reportAnalytics 要求第二参数为纯对象，值为基础类型
      wx.reportAnalytics(eventName, data);
    } else {
      console.log('[analytics]', eventName, data);
    }
  } catch (e) {
    console.log('[analytics:error]', eventName, e);
  }
}

function firstCheckinDisplay (habitId, tier) {
  track('first_checkin_display', { habit_id: String(habitId || ''), tier: String(tier || 'regular') });
}

function firstCheckinCompleted (habitId, tier) {
  track('first_checkin_completed', { habit_id: String(habitId || ''), tier: String(tier || 'regular') });
}

module.exports = {
  track,
  firstCheckinDisplay,
  firstCheckinCompleted
};
