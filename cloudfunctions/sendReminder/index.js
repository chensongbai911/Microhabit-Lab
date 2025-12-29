// cloudfunctions/sendReminder/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 发送每日提醒（定时触发器）
 * 该函数通过云函数定时触发器自动调用
 */
exports.main = async (event, context) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    console.log(`开始发送提醒，当前时间: ${currentTime}`);

    // 获取所有开启了提醒的用户
    const usersResult = await db.collection('users')
      .where({
        'reminder_settings.enabled': true
      })
      .get();

    if (usersResult.data.length === 0) {
      console.log('没有需要发送提醒的用户');
      return { success: true, count: 0 };
    }

    let sentCount = 0;
    const sendPromises = [];

    for (const user of usersResult.data) {
      const settings = user.reminder_settings;
      const time1 = settings.time1 || '08:00';
      const time2 = settings.time2 || '20:00';

      // 检查是否匹配提醒时间（允许5分钟误差）
      const shouldSend = isTimeMatch(currentTime, time1) || isTimeMatch(currentTime, time2);

      if (shouldSend) {
        // 获取用户今日待完成的习惯
        const habitStats = await getTodayHabitStats(user._openid);

        if (habitStats.total > 0) {
          sendPromises.push(
            sendSubscribeMessage(user._openid, habitStats)
              .then(() => sentCount++)
              .catch(err => console.error(`发送给 ${user._openid} 失败:`, err))
          );
        }
      }
    }

    // 批量发送
    await Promise.all(sendPromises);

    console.log(`提醒发送完成，共发送 ${sentCount} 条`);
    return {
      success: true,
      count: sentCount,
      time: currentTime
    };

  } catch (error) {
    console.error('发送提醒失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 检查时间是否匹配（允许5分钟误差）
 */
function isTimeMatch (current, target) {
  const [currentH, currentM] = current.split(':').map(Number);
  const [targetH, targetM] = target.split(':').map(Number);

  const currentMinutes = currentH * 60 + currentM;
  const targetMinutes = targetH * 60 + targetM;

  return Math.abs(currentMinutes - targetMinutes) <= 5;
}

/**
 * 获取用户今日习惯统计
 */
async function getTodayHabitStats (openid) {
  try {
    // 获取今日日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 获取用户的活跃习惯
    const habitsResult = await db.collection('habits')
      .where({
        _openid: openid,
        status: 'active'
      })
      .get();

    const habits = habitsResult.data;
    let completedCount = 0;

    // 检查今日打卡情况
    for (const habit of habits) {
      const logsResult = await db.collection('habit_logs')
        .where({
          habit_id: habit._id,
          log_date: todayStr
        })
        .count();

      if (logsResult.total > 0) {
        completedCount++;
      }
    }

    return {
      total: habits.length,
      completed: completedCount,
      remaining: habits.length - completedCount
    };

  } catch (error) {
    console.error('获取习惯统计失败:', error);
    return { total: 0, completed: 0, remaining: 0 };
  }
}

/**
 * 发送订阅消息
 */
async function sendSubscribeMessage (openid, stats) {
  try {
    // 构建消息内容
    const messageData = {
      thing1: {
        value: `今日待完成: ${stats.remaining}个习惯`
      },
      thing2: {
        value: `已完成: ${stats.completed}/${stats.total}`
      },
      date3: {
        value: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      thing4: {
        value: stats.remaining > 0 ? '还有习惯未完成，加油！' : '今日习惯全部完成！'
      }
    };

    // 发送订阅消息
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: 'FU13oXF--gvie10WCk7CQ9odtVTHNOjg16j_g65XKOI', // 需要替换为实际的模板ID
      page: 'pages/home/home',
      data: messageData,
      miniprogramState: 'formal'
    });

    console.log(`成功发送提醒给 ${openid}`);
    return true;

  } catch (error) {
    console.error('发送订阅消息失败:', error);
    throw error;
  }
}
