const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { user_habit_id } = event;

  try {
    if (!user_habit_id) {
      return {
        code: -1,
        message: '习惯ID不能为空'
      };
    }

    // 查询习惯信息
    const { data: habits } = await db.collection('user_habits')
      .where({
        _id: user_habit_id,
        _openid: openid
      })
      .get();

    if (habits.length === 0) {
      return {
        code: -1,
        message: '习惯不存在'
      };
    }

    const habit = habits[0];

    // 查询周期内的打卡记录
    const totalDays = habit.cycle_days || 21;
    const endDate = calculateEndDate(habit.start_date, totalDays);
    const { data: logs } = await db.collection('habit_logs')
      .where({
        user_habit_id: user_habit_id,
        date: _.gte(habit.start_date).and(_.lte(endDate))
      })
      .orderBy('date', 'asc')
      .get();

    // 计算统计信息
    const completion = calculateCompletion(logs, habit.start_date, totalDays, habit.target_times_per_day || 1);
    const calendar = buildCalendar(habit.start_date, totalDays, logs, habit.target_times_per_day || 1);
    const advice = generateAdvice(completion.completion_rate);

    return {
      code: 0,
      message: '获取成功',
      data: {
        habit,
        logs,
        calendar,
        stats: {
          completed_days: completion.completed_days,
          total_days: totalDays,
          completion_rate: completion.completion_rate,
          max_streak: completion.max_streak,
          progress: completion.progress
        },
        // 标准化字段: streakDays/isRecovery
        streakDays: completion.current_streak_today || 0,
        isRecovery: (completion.current_streak_today === 0 && completion.completed_days > 0),
        advice
      }
    };
  } catch (error) {
    console.error('getHabitDetail error:', error);
    return {
      code: -1,
      message: '获取失败',
      error: error.message
    };
  }
};

function calculateEndDate (startDate, cycleDays) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + cycleDays - 1);
  return date.toISOString().split('T')[0];
}

function generateDateArray (startDate, days) {
  const arr = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    arr.push(d.toISOString().split('T')[0]);
  }
  return arr;
}

function calculateCompletion (logs, startDate, totalDays, targetTimes) {
  const dates = generateDateArray(startDate, totalDays);
  const completionMap = {};
  logs.forEach(log => {
    completionMap[log.date] = log.times >= targetTimes;
  });

  let completed = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let currentStreakToday = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  dates.forEach(date => {
    if (completionMap[date]) {
      completed++;
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    if (date === todayStr) {
      currentStreakToday = currentStreak;
    }
  });

  const completionRate = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;

  // 进度: 今天是第几天
  const today = new Date();
  const start = new Date(startDate);
  const diff = Math.floor((today - start) / (24 * 60 * 60 * 1000)) + 1;
  const progressCurrent = Math.min(Math.max(diff, 1), totalDays);

  return {
    completed_days: completed,
    completion_rate: completionRate,
    max_streak: maxStreak,
    current_streak_today: currentStreakToday,
    progress: {
      current: progressCurrent,
      total: totalDays,
      percentage: Math.round((progressCurrent / totalDays) * 100)
    }
  };
}

function buildCalendar (startDate, totalDays, logs, targetTimes) {
  const dates = generateDateArray(startDate, totalDays);
  const logMap = {};
  logs.forEach(log => {
    logMap[log.date] = log;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return dates.map(date => {
    const log = logMap[date];
    const completed = log ? log.times >= targetTimes : false;
    return {
      date,
      day: date.split('-')[2],
      completed,
      times: log ? log.times : 0,
      isToday: date === todayStr
    };
  });
}

function generateAdvice (completionRate) {
  if (completionRate >= 80) {
    return '你做得非常棒!这个习惯已经初步建立,可以考虑轻微增加一点难度。';
  } else if (completionRate >= 50) {
    return '不错的开始!如果有些天容易忘记,可以调整触发器的时间。';
  } else {
    return '建议把动作再拆小一点,或者换一个更容易的触发时机。';
  }
}
