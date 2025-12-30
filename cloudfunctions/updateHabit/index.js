const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 通用习惯更新函数 - P0优化
 * 支持更新: target_times_per_day(每日目标次数), trigger(提醒时间), status(状态)等
 * @param {String} user_habit_id 习惯ID
 * @param {Object} updates 更新的字段对象
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { user_habit_id, updates } = event;

  try {
    if (!user_habit_id || !updates || Object.keys(updates).length === 0) {
      return {
        code: -1,
        message: '参数不完整或无更新字段'
      };
    }

    // 验证习惯所有权
    const { data: habits } = await db.collection('user_habits')
      .where({
        _id: user_habit_id,
        _openid: openid
      })
      .get();

    if (habits.length === 0) {
      return {
        code: -1,
        message: '习惯不存在或无权限修改'
      };
    }

    // 允许更新的字段白名单
    const allowedFields = [
      'target_times_per_day',  // 每日目标次数
      'trigger',               // 提醒时间/触发条件
      'status',                // 状态: active/paused
      'name',                  // 习惯名称
      'category',              // 分类
      'description',           // 描述
      'default_trigger'        // 默认触发器
    ];

    // 过滤并验证更新字段
    const updateData = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // 特殊验证
        if (key === 'target_times_per_day' && (value < 1 || value > 10)) {
          return {
            code: -1,
            message: '每日目标次数应在1-10之间'
          };
        }
        if (key === 'status' && !['active', 'paused', 'completed', 'deleted'].includes(value)) {
          return {
            code: -1,
            message: '无效的状态值'
          };
        }
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return {
        code: -1,
        message: '没有有效的更新字段'
      };
    }

    // 执行更新
    const updateResult = await db.collection('user_habits')
      .doc(user_habit_id)
      .update({
        data: updateData
      });

    // 记录变更历史（如果是关键字段更改）
    if (updates.target_times_per_day || updates.trigger || updates.status) {
      const changedFields = {};
      if (updates.target_times_per_day) {
        changedFields.target_times_per_day = {
          old: habits[0].target_times_per_day,
          new: updates.target_times_per_day
        };
      }
      if (updates.trigger) {
        changedFields.trigger = {
          old: habits[0].trigger || habits[0].default_trigger,
          new: updates.trigger
        };
      }
      if (updates.status) {
        changedFields.status = {
          old: habits[0].status,
          new: updates.status
        };
      }

      // 记录到变更历史表
      try {
        await db.collection('habit_changes').add({
          data: {
            _openid: openid,
            user_habit_id: user_habit_id,
            habit_name: habits[0].name,
            changed_fields: changedFields,
            change_type: 'update',
            timestamp: db.serverDate()
          }
        });
      } catch (error) {
        console.error('记录变更历史失败:', error);
        // 不中断主流程
      }
    }

    return {
      code: 0,
      message: '更新成功',
      data: {
        user_habit_id: user_habit_id,
        updated_fields: Object.keys(updateData)
      }
    };

  } catch (error) {
    console.error('更新习惯失败:', error);
    return {
      code: -1,
      message: '服务器错误，请稍后重试',
      error: error.message
    };
  }
};
