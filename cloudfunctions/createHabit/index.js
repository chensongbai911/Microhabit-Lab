const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 响应工具函数
const response = {
  CODES: {
    PARAM_ERROR: 1001,
    NOT_FOUND: 1002,
    EXCEED_LIMIT: 1003
  },
  success (data = null, message = '操作成功') {
    return {
      success: true,
      code: 0,
      message,
      data
    };
  },
  systemError (message = '系统错误，请稍后重试', error = null) {
    return {
      success: false,
      code: -1,
      message,
      error: error?.message || error
    };
  },
  businessError (code = 1000, message = '请求错误', data = null) {
    return {
      success: false,
      code: Math.max(1001, code),
      message,
      data
    };
  }
};

/**
 * 创建习惯
 * @param {String} name 习惯名称
 * @param {String} trigger 触发器
 * @param {Number} target_times_per_day 每天目标次数
 * @param {String} template_id 模板ID(可选)
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  let { name, trigger, target_times_per_day = 1, template_id = null, reminder = null } = event;

  try {
    // 参数校验
    if (!name || !trigger) {
      return response.businessError(
        response.CODES.PARAM_ERROR,
        '习惯名称和触发器不能为空'
      );
    }

    if (name.length > 30) {
      return response.businessError(
        response.CODES.PARAM_ERROR,
        '习惯名称不能超过30个字'
      );
    }

    // 检查用户会员状态
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .get();

    if (users.length === 0) {
      return response.businessError(
        response.CODES.NOT_FOUND,
        '用户不存在'
      );
    }

    const user = users[0];
    const isMember = user.member_status === 1;

    // 非会员强制降级：target_times_per_day 最多为 1
    if (!isMember && target_times_per_day > 1) {
      console.log(`[createHabit] Non-member downgrade: ${target_times_per_day} -> 1`);
      target_times_per_day = 1;
    }

    // 检查进行中的习惯数量
    const { total: inProgressCount } = await db.collection('user_habits')
      .where({
        _openid: openid,
        status: 'in_progress'
      })
      .count();

    const limit = isMember ? 20 : 3;

    if (inProgressCount >= limit) {
      return response.businessError(
        response.CODES.EXCEED_LIMIT,
        isMember ? '已达到习惯数量上限' : '免费用户最多同时进行3个习惯',
        {
          current: inProgressCount,
          limit: limit,
          is_member: isMember
        }
      );
    }

    // 创建习惯
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // 准备习惯数据
    const habitData = {
      _openid: openid,
      template_id: template_id,
      name: name,
      trigger: trigger,
      target_times_per_day: target_times_per_day,
      start_date: today,
      cycle_days: 21,
      status: 'in_progress',
      note: '',
      streak: 0,
      last_done_date: null,
      created_at: now,
      updated_at: now
    };

    // 如果有提醒配置，添加到数据中
    if (reminder && typeof reminder === 'object') {
      habitData.reminder = {
        enabled: reminder.enabled !== false,
        time: reminder.time || '09:00',
        timeRange: reminder.timeRange || 'morning',
        category: reminder.category || 'anytime'
      };
    }

    const result = await db.collection('user_habits').add({
      data: habitData
    });

    return response.success(
      {
        user_habit_id: result._id,   // 统一使用 user_habit_id
        habit_id: result._id,        // 保持兼容性
        _id: result._id,
        name: name
      },
      '创建成功'
    );
  } catch (error) {
    console.error('createHabit error:', error);
    return response.systemError('创建失败', error);
  }
};
