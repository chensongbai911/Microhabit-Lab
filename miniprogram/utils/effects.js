/**
 * 分层动效配置：礼花粒子颜色/数量/形状/时长
 */
function getConfettiConfig (tier = 'regular', sys = {}) {
  const defaultColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#B983FF'];
  const perfClass = (sys.benchmarkLevel || 0) >= 10 ? 'high' : 'normal';
  const baseCount = perfClass === 'high' ? 60 : 36;

  const base = {
    colors: defaultColors,
    count: baseCount,
    durationMs: 1500,
    shape: 'circle' // circle | triangle | star
  };

  switch (tier) {
    case 'day3':
      return { ...base, colors: ['#FFD93D', '#4D96FF', '#6BCB77'], count: baseCount + 8, shape: 'triangle' };
    case 'day7':
      return { ...base, colors: ['#FFD93D', '#FF6B6B', '#B983FF'], count: baseCount + 20, durationMs: 2000, shape: 'star' };
    case 'recovery':
      return { ...base, colors: ['#6BCB77', '#4D96FF'], count: baseCount - 6, shape: 'circle' };
    default:
      return base;
  }
}

module.exports = {
  getConfettiConfig
};
