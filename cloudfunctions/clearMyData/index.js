const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 清空当前用户的习惯数据（仅供测试使用）
 * 会删除：用户的所有习惯 + 所有打卡记录
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    console.log(`开始清空用户 ${openid} 的数据...`);

    // 1. 获取该用户的所有习惯ID
    const { data: habits } = await db.collection('user_habits')
      .where({ _openid: openid })
      .field({ _id: true })
      .get();

    const habitIds = habits.map(h => h._id);
    console.log(`找到 ${habitIds.length} 个习惯`);

    // 2. 删除所有打卡记录
    if (habitIds.length > 0) {
      // 批量删除打卡记录（每次最多删除20条）
      const _ = db.command;
      const logsResult = await db.collection('habit_logs')
        .where({
          _openid: openid
        })
        .remove();

      console.log(`删除了 ${logsResult.stats.removed} 条打卡记录`);
    }

    // 3. 删除所有习惯
    if (habitIds.length > 0) {
      const habitsResult = await db.collection('user_habits')
        .where({ _openid: openid })
        .remove();

      console.log(`删除了 ${habitsResult.stats.removed} 个习惯`);
    }

    return {
      code: 0,
      message: '数据已清空',
      data: {
        deleted_habits: habitIds.length,
        openid: openid.substring(0, 8) + '***' // 只显示部分openid
      }
    };
  } catch (error) {
    console.error('清空数据失败:', error);
    return {
      code: -1,
      message: '清空失败',
      error: error.message
    };
  }
};
