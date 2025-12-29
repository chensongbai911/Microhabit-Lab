/**
 * 首卡/分层反馈文案与震动策略
 */
const COPY_MAP = {
  regular: {
    emoji: '✅',
    text: '已完成！30秒就成就一次积极反馈',
    vibrate: 'short'
  },
  day3: {
    emoji: '⭐',
    text: '坚持第3天，势头正好，继续！',
    vibrate: 'short'
  },
  day7: {
    emoji: '🏆',
    text: '首周达成！你值得一个小小庆祝',
    vibrate: 'pulse'
  },
  recovery: {
    emoji: '💪',
    text: '欢迎回来！重新开始也算数',
    vibrate: 'long'
  }
};

function getCopyForTier (tier) {
  return COPY_MAP[tier] || COPY_MAP.regular;
}

module.exports = {
  getCopyForTier
};
