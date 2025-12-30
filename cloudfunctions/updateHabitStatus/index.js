const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 更新习惯状态
 * @param {String} user_habit_id 习惯ID
 * @param {String} action continue继续/pause暂停/update更新
 * @param {Object} updates 更新的字段(action=update时使用)
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { user_habit_id, action, updates } = event;

  try {
    if (!user_habit_id || !action) {
      return {
        code: -1,
        message: '参数不完整'
      };
    }

    // 查询习惯
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

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (action) {
      case 'continue':
        // 继续新一轮
        await db.collection('user_habits')
          .doc(user_habit_id)
          .update({
            data: {
              start_date: today,
              status: 'in_progress',
              updated_at: now
            }
          });
        return {
          code: 0,
          message: '已开启新一轮'
        };

      case 'pause':
        // 暂停习惯
        await db.collection('user_habits')
          .doc(user_habit_id)
          .update({
            data: {
              status: 'paused',
              updated_at: now
            }
          });
        return {
          code: 0,
          message: '已暂停'
        };

      case 'resume':
        // 恢复习惯（保留进度，重新开始）
        await db.collection('user_habits')
          .doc(user_habit_id)
          .update({
            data: {
              status: 'in_progress',
              updated_at: now
            }
          });
        return {
          code: 0,
          message: '已恢复'
        };

      case 'update':
        // 更新习惯信息
        if (!updates) {
          return {
            code: -1,
            message: '缺少更新内容'
          };
        }

        await db.collection('user_habits')
          .doc(user_habit_id)
          .update({
            data: {
              ...updates,
              updated_at: now
            }
          });
        return {
          code: 0,
          message: '更新成功'
        };

      default:
        return {
          code: -1,
          message: '未知操作'
        };
    }
  } catch (error) {
    console.error('updateHabitStatus error:', error);
    return {
      code: -1,
      message: '操作失败',
      error: error.message
    };
  }
};
