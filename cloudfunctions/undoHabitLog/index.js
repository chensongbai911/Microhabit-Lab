const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
// 优先本地 response，缺失时回退到 utils，再兜底内置
let response;
try {
  response = require('./response');
} catch (e1) {
  try {
    response = require('../utils/response');
  } catch (e2) {
    response = {
      CODES: { PARAM_ERROR: 400, NOT_FOUND: 404, FORBIDDEN: 403 },
      success: (data = {}, message = 'ok') => ({ code: 0, message, data }),
      businessError: (code = 400, message = '请求错误', data = null) => ({ code, message, data }),
      systemError: (message = '系统错误', error = null) => ({ code: 500, message, error: error ? String(error) : undefined })
    };
  }
}

/**
 * 撤销今日打卡（今日次数 -1，最低为0；若为0则删除当日记录）
 * @param {String} user_habit_id 习惯ID
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { user_habit_id } = event;

  try {
    if (!user_habit_id) {
      return response.businessError(response.CODES.PARAM_ERROR, '习惯ID不能为空');
    }

    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 查询习惯，确保属于当前用户
    const { data: habits } = await db.collection('user_habits')
      .where({ _id: user_habit_id, _openid: openid })
      .limit(1)
      .get();

    if (!habits || habits.length === 0) {
      return response.businessError(response.CODES.NOT_FOUND, '习惯不存在');
    }

    // 查询今日打卡记录（仅当前用户、最新一条），优先用 created_at >= 当日 00:00，兼容老数据再按 date 字符串
    let logsRes = await db.collection('habit_logs')
      .where({ user_habit_id, _openid: openid, created_at: _.gte(startOfDay) })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (!logsRes.data || logsRes.data.length === 0) {
      logsRes = await db.collection('habit_logs')
        .where({ user_habit_id, _openid: openid, date: today })
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();
    }

    if (!logsRes.data || logsRes.data.length === 0) {
      // 没有今日记录时，直接视为已撤销成功，避免前端报错
      return response.success({ undone: false, times: 0 }, '今天没有打卡记录，无需撤销');
    }

    const log = logsRes.data[0];
    // 若 times 缺失，视为 1 次，撤销后直接删除
    const currentTimes = typeof log.times === 'number' && log.times > 0 ? log.times : 1;
    const newTimes = Math.max(0, currentTimes - 1);

    if (newTimes === 0) {
      await db.collection('habit_logs').doc(log._id).remove();
    } else {
      await db.collection('habit_logs').doc(log._id).update({
        data: { times: newTimes, updated_at: new Date() }
      });
    }

    return response.success({ undone_log_id: log._id, times: newTimes }, '撤销成功');
  } catch (error) {
    console.error('undoHabitLog error:', error);
    return response.systemError('撤销失败', error);
  }
};
