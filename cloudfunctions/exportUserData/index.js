// 云函数: 导出用户数据为JSON格式
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();

exports.main = async (event, context) => {
  const { user_id } = event;

  if (!user_id) {
    return {
      code: -1,
      message: '参数不完整: 需要 user_id'
    };
  }

  try {
    // 获取用户的所有习惯
    const habitsRes = await db.collection('user_habits')
      .where({ user_id: user_id })
      .limit(1000)
      .get();

    const habits = habitsRes.data || [];

    // 获取用户统计数据
    const statsRes = await db.collection('user_stats')
      .where({ user_id: user_id })
      .limit(1)
      .get();

    const stats = statsRes.data && statsRes.data.length > 0 ? statsRes.data[0] : null;

    // 构建导出数据
    const exportData = {
      export_time: new Date().toISOString(),
      user_id: user_id,
      data: {
        habits: habits.map(h => ({
          id: h._id,
          name: h.name,
          trigger: h.trigger,
          target_times_per_day: h.target_times_per_day,
          status: h.status,
          created_at: h.created_at,
          current_day: h.current_day,
          completed_days: h.completed_days,
          total_days: h.total_days,
          last_completed_at: h.last_completed_at
        })),
        statistics: stats ? {
          total_habits: stats.total_habits,
          active_habits: stats.active_habits,
          completed_habits: stats.completed_habits,
          total_completions: stats.total_completions
        } : null
      }
    };

    // 生成 CSV 格式的习惯列表
    const csvHeader = 'ID,名称,触发器,每日次数,状态,创建时间,进行天数,完成天数,总天数\n';
    const csvRows = habits.map(h =>
      `"${h._id}","${h.name}","${h.trigger}","${h.target_times_per_day}","${h.status}","${h.created_at}","${h.current_day}","${h.completed_days}","${h.total_days}"`
    ).join('\n');
    const csvContent = csvHeader + csvRows;

    return {
      code: 0,
      message: '导出成功',
      data: {
        json: exportData,
        csv: csvContent,
        total_habits: habits.length
      }
    };
  } catch (error) {
    console.error('导出数据失败:', error);
    return {
      code: -1,
      message: '导出失败: ' + error.message
    };
  }
};
