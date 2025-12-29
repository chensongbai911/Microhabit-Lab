const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const response = require('../utils/response');

/**
 * 获取统计数据 - 优化版（Day 6）
 * 重点：返回结论而非原始数据
 *
 * 返回结构:
 * {
 *   weeklyRate: 85,           // 本周完成率（百分比）
 *   bestHabit: "喝一口水",    // 本周最好的习惯
 *   improved: true,           // 是否比上周改进
 *   improvementPercent: 10,   // 改进百分比
 *   advice: "坚持得很好，再努力3天就是一个新的开始！",
 *   stats: {
 *     totalHabits: 5,
 *     inProgress: 5,
 *     completed: 2,
 *     maxStreak: 7
 *   }
 * }
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 读取用户的所有习惯
    const { data: habits } = await db.collection('user_habits')
      .where({ _openid: openid })
      .get();

    const inProgress = habits.filter(h => h.status === 'in_progress').length;
    const completed = habits.filter(h => h.status === 'finished').length;
    const totalHabits = habits.length;

    // 计算本周完成率
    const today = getToday();
    const weekStart = addDays(today, -6);
    const weeklyData = await buildTrend(openid, habits, 7, today);
    const weeklyRate = weeklyData.avgRate;

    // 计算上周完成率（用于对比）
    const lastWeekEnd = addDays(today, -7);
    const lastWeekStart = addDays(lastWeekEnd, -6);
    const lastWeeklyData = await buildTrendForPeriod(openid, habits, lastWeekStart, lastWeekEnd);
    const lastWeekRate = lastWeeklyData.avgRate;

    // 判断是否改进
    const improved = weeklyRate >= lastWeekRate;
    const improvementPercent = Math.abs(weeklyRate - lastWeekRate);

    // 查找本周最好的习惯
    const bestHabit = await findBestHabit(openid, habits, weekStart, today);

    // 计算最长连续天数
    const maxStreak = await calculateMaxStreakAcrossHabits(habits, openid);

    // 生成建议文案
    const advice = generateAdvice(weeklyRate, improved, improvementPercent, maxStreak);

    return response.success(
      {
        weeklyRate: weeklyRate,
        bestHabit: bestHabit,
        improved: improved,
        improvementPercent: improvementPercent,
        advice: advice,
        stats: {
          totalHabits: totalHabits,
          inProgress: inProgress,
          completed: completed,
          maxStreak: maxStreak
        }
      },
      '获取统计成功'
    );
  } catch (error) {
    console.error('getStats error:', error);
    return response.systemError('获取统计失败', error);
  }
};

/**
 * 生成建议文案（心理驱动）
 */
function generateAdvice (weeklyRate, improved, improvementPercent, maxStreak) {
  if (weeklyRate >= 90) {
    return '🌟 完成率超棒！你的坚持值得庆祝，继续保持这个节奏。';
  }
  if (weeklyRate >= 70) {
    if (improved) {
      return `💪 进步 ${improvementPercent}%！你越来越稳定了，再加把劲。`;
    } else {
      return '👍 保持得不错，有些天可能有遗漏，调整一下触发时间试试。';
    }
  }
  if (maxStreak >= 3) {
    return '🔥 坚持到第 ' + maxStreak + ' 天，太棒了！前3天最关键，你已经过关。';
  }
  return '💡 每个开始都值得鼓励。选择一个更容易的时间点打卡，会更有节奏感。';
}

/**
 * 查找本周最好的习惯（完成次数最多）
 */
async function findBestHabit (openid, habits, startDate, endDate) {
  try {
    const { data: logs } = await db.collection('habit_logs')
      .where({
        _openid: openid,
        date: _.gte(startDate).and(_.lte(endDate))
      })
      .get();

    const habitCompletionMap = {};
    logs.forEach(log => {
      if (!habitCompletionMap[log.user_habit_id]) {
        habitCompletionMap[log.user_habit_id] = 0;
      }
      habitCompletionMap[log.user_habit_id]++;
    });

    let bestHabitId = null;
    let maxCount = 0;
    for (const habitId in habitCompletionMap) {
      if (habitCompletionMap[habitId] > maxCount) {
        maxCount = habitCompletionMap[habitId];
        bestHabitId = habitId;
      }
    }

    if (bestHabitId) {
      const bestHabit = habits.find(h => h._id === bestHabitId);
      return bestHabit?.name || '微习惯';
    }
    return '微习惯';
  } catch (e) {
    return '微习惯';
  }
}

function getToday () {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays (dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isActiveOnDate (habit, dateStr) {
  if (habit.status !== 'in_progress') return false;
  const cycleDays = habit.cycle_days || 21;
  const endDate = addDays(habit.start_date, cycleDays - 1);
  return habit.start_date <= dateStr && dateStr <= endDate;
}

async function buildTrend (openid, habits, rangeDays, todayStr) {
  const startDate = addDays(todayStr, -(rangeDays - 1));
  return buildTrendForPeriod(openid, habits, startDate, todayStr);
}

async function buildTrendForPeriod (openid, habits, startDateStr, endDateStr) {
  // 拉取时间范围内的打卡记录
  const { data: logs } = await db.collection('habit_logs')
    .where({
      _openid: openid,
      date: _.gte(startDateStr).and(_.lte(endDateStr))
    })
    .get();

  const logsList = logs || [];
  const rangeDays = Math.floor((new Date(endDateStr) - new Date(startDateStr)) / (1000 * 60 * 60 * 24)) + 1;
  const data = [];

  for (let i = 0; i < rangeDays; i++) {
    const date = addDays(startDateStr, i);
    const activeCount = habits.filter(h => isActiveOnDate(h, date)).length;
    const completedSet = new Set(logsList.filter(l => l.date === date && l.times >= 1).map(l => l.user_habit_id));
    const completed = completedSet.size;
    const rate = activeCount > 0 ? Math.round((completed / activeCount) * 100) : 0;

    data.push({ date, completed, active: activeCount, rate });
  }

  const avgRate = data.length ? Math.round(data.reduce((sum, d) => sum + d.rate, 0) / data.length) : 0;
  return { avgRate, data };
}

async function calculateMaxStreakAcrossHabits (habits, openid) {
  let maxStreak = 0;

  for (const habit of habits) {
    const cycleDays = habit.cycle_days || 21;
    const endDate = addDays(habit.start_date, cycleDays - 1);

    const { data: logs } = await db.collection('habit_logs')
      .where({
        _openid: openid,
        user_habit_id: habit._id,
        date: _.gte(habit.start_date).and(_.lte(endDate))
      })
      .orderBy('date', 'asc')
      .get();

    const streak = calculateMaxStreak(logs, habit.start_date, cycleDays, habit.target_times_per_day || 1);
    maxStreak = Math.max(maxStreak, streak);
  }

  return maxStreak;
}

function calculateMaxStreak (logs, startDate, days, targetTimes) {
  const dates = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const completionMap = {};
  logs.forEach(log => {
    completionMap[log.date] = log.times >= targetTimes;
  });

  let maxStreak = 0;
  let currentStreak = 0;

  dates.forEach(date => {
    if (completionMap[date]) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return maxStreak;
}
