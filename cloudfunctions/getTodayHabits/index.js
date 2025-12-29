const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const response = require('../utils/response');

/**
 * 获取今日习惯列表
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 获取今天日期 YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // 查询所有进行中的习惯
    const { data: habits } = await db.collection('user_habits')
      .where({
        _openid: openid,
        status: 'in_progress',
        start_date: _.lte(today)
      })
      .orderBy('created_at', 'asc')
      .get();

    // 检查哪些习惯周期已结束
    const endedHabits = [];
    const activeHabits = [];

    for (let habit of habits) {
      const endDate = calculateEndDate(habit.start_date, habit.cycle_days);

      if (today > endDate) {
        // 周期已结束
        endedHabits.push({
          ...habit,
          end_date: endDate,
          is_ended: true
        });
      } else {
        activeHabits.push(habit);
      }
    }

    // 为活跃习惯查询今日打卡记录和 streak
    let completedCount = 0;
    for (let habit of activeHabits) {
      const { data: logs } = await db.collection('habit_logs')
        .where({
          user_habit_id: habit._id,
          date: today
        })
        .get();

      const doneTimesToday = logs.length > 0 ? logs[0].times : 0;
      const isCompleted = doneTimesToday >= habit.target_times_per_day;

      // 计算 streak
      const streak = await calculateStreak(db, habit._id);

      // 计算周期进度
      const daysPassed = getDaysBetween(habit.start_date, today) + 1;

      habit.habitId = habit._id;  // 前端可能期望用 habitId
      habit.doneTimesToday = doneTimesToday;
      habit.isCompleted = isCompleted;
      habit.streak = streak;      // 新增
      habit.progressCurrent = daysPassed;
      habit.progressTotal = habit.cycle_days;

      if (isCompleted) {
        completedCount++;
      }
    }

    const totalCount = activeHabits.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return response.success(
      {
        habits: activeHabits,
        endedHabits: endedHabits,
        completedCount: completedCount,   // 新增：直接返回，不让前端算
        totalCount: totalCount,            // 新增
        progress: progress,                // 新增
        today: today
      },
      '获取成功'
    );
  } catch (error) {
    console.error('getTodayHabits error:', error);
    return response.systemError('获取失败', error);
  }
};

/**
 * 计算 streak（从最后一次打卡到今天）
 */
async function calculateStreak (db, habitId) {
  try {
    const { data: logs } = await db.collection('habit_logs')
      .where({
        user_habit_id: habitId
      })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    if (logs.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let lastDate = null;

    for (let log of logs) {
      const logDate = log.date;

      if (lastDate === null) {
        lastDate = logDate;
        const daysBack = Math.floor((new Date(today) - new Date(logDate)) / (1000 * 60 * 60 * 24));
        if (daysBack <= 0) {
          streak = 1;
        } else {
          streak = 0;
          break;
        }
      } else {
        const daysDiff = Math.floor((new Date(lastDate) - new Date(logDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          streak++;
          lastDate = logDate;
        } else {
          break;
        }
      }
    }

    return streak;
  } catch (e) {
    console.error('calculateStreak error:', e);
    return 0;
  }
}

// 辅助函数:计算结束日期
function calculateEndDate (startDate, cycleDays) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + cycleDays - 1);
  return date.toISOString().split('T')[0];
}

// 辅助函数:计算天数差
function getDaysBetween (startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

