const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 优先本地 response，缺失时回退到 utils，再兜底内置，避免模块缺失
let response;
try {
  response = require('./response');
} catch (e1) {
  try {
    response = require('../utils/response');
  } catch (e2) {
    response = {
      CODES: { PARAM_ERROR: 400, NOT_FOUND: 404, FORBIDDEN: 403, INVALID_STATE: 409, ALREADY_DONE: 409 },
      success: (data = {}, message = 'ok') => ({ code: 0, message, data }),
      businessError: (code = 400, message = '请求错误', data = null) => ({ code, message, data }),
      systemError: (message = '系统错误', error = null) => ({ code: 500, message, error: error ? String(error) : undefined })
    };
  }
}

/**
 * 打卡
 * @param {String} user_habit_id 习惯ID
 * @param {Boolean} isFirstCheckin 是否首卡（可选，用于埋点）
 * @param {String} checkType 打卡类型（可选，first-checkin页传来）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { user_habit_id, isFirstCheckin = false, checkType = '' } = event;

  try {
    // 参数校验
    if (!user_habit_id) {
      return response.businessError(
        response.CODES.PARAM_ERROR,
        '习惯ID不能为空'
      );
    }

    // 查询习惯信息
    const { data: habits } = await db.collection('user_habits')
      .where({
        _id: user_habit_id,
        _openid: openid
      })
      .get();

    if (habits.length === 0) {
      return response.businessError(
        response.CODES.NOT_FOUND,
        '习惯不存在'
      );
    }

    const habit = habits[0];

    if (habit.status !== 'in_progress') {
      return response.businessError(
        response.CODES.INVALID_STATE,
        '该习惯已结束'
      );
    }

    // 获取今天日期
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // 查询今日打卡记录
    const { data: logs } = await db.collection('habit_logs')
      .where({
        user_habit_id: user_habit_id,
        date: today
      })
      .get();

    let doneTimesToday = 1;
    let isCompleted = false;

    if (logs.length === 0) {
      // 今天第一次打卡，创建记录
      await db.collection('habit_logs').add({
        data: {
          _openid: openid,
          user_habit_id: user_habit_id,
          date: today,
          times: 1,
          created_at: now,
          updated_at: now
        }
      });
      doneTimesToday = 1;
    } else {
      // 已有打卡记录，次数+1
      const log = logs[0];

      if (log.times >= habit.target_times_per_day) {
        return response.businessError(
          response.CODES.ALREADY_DONE,
          '今日已完成目标次数',
          {
            doneTimesToday: log.times,
            targetTimes: habit.target_times_per_day
          }
        );
      }

      doneTimesToday = log.times + 1;

      await db.collection('habit_logs')
        .doc(log._id)
        .update({
          data: {
            times: doneTimesToday,
            updated_at: now
          }
        });
    }

    isCompleted = doneTimesToday >= habit.target_times_per_day;

    // 计算 streak（新增）
    const streak = await calculateStreak(db, user_habit_id, habit, today);

    // 计算 feedbackTier（新增）
    const feedbackTier = calculateFeedbackTier(streak);

    // 更新习惯的 lastDoneDate（用于streak计算）
    if (isCompleted) {
      await db.collection('user_habits')
        .doc(user_habit_id)
        .update({
          data: {
            last_done_date: today,
            updated_at: now
          }
        });
    }

    return response.success(
      {
        streak: streak,
        doneTimesToday: doneTimesToday,
        targetTimes: habit.target_times_per_day,
        isCompleted: isCompleted,
        feedbackTier: feedbackTier
      },
      '打卡成功'
    );
  } catch (error) {
    console.error('logHabit error:', error);
    return response.systemError('打卡失败', error);
  }
};

/**
 * 计算 streak（连续天数）
 */
async function calculateStreak (db, habitId, habit, today) {
  try {
    // 查询该习惯的所有打卡记录（按日期倒序）
    const { data: logs } = await db.collection('habit_logs')
      .where({
        user_habit_id: habitId
      })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    if (logs.length === 0) return 0;

    let streak = 0;
    let lastDate = null;

    for (let log of logs) {
      const logDate = log.date;

      if (lastDate === null) {
        // 第一条记录
        lastDate = logDate;
        const daysBack = daysBetween(logDate, today);
        if (daysBack <= 0) {
          // 今天或昨天有打卡
          streak = 1;
        } else {
          // 打卡在更早的日期，说明今天没完成，streak断开
          streak = 0;
          break;
        }
      } else {
        // 检查与上一条记录是否相邻
        const daysDiff = daysBetween(logDate, lastDate);
        if (daysDiff === 1) {
          // 连续
          streak++;
          lastDate = logDate;
        } else {
          // 断开，结束计数
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

/**
 * 计算反馈层级
 */
function calculateFeedbackTier (streak) {
  if (streak === 0) return 'regular';
  if (streak >= 7) return 'day7';
  if (streak >= 3) return 'day3';
  return 'regular';
}

/**
 * 计算两个日期之间的天数差（date1 - date2）
 */
function daysBetween (date1Str, date2Str) {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
}

