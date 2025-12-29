/**
 * ============ 微习惯实验室 优化方案总结 ============
 * 基于现状分析与用户需求，制定 7 天改造计划
 */

// ============ 一、现状分析 ============

/**
 * 问题1: 云函数返回结构不统一
 *
 * 现象:
 *   - logHabit 返回: { code, message, data: { times, target, is_completed } }
 *   - getTodayHabits 返回: { code, message, data: { habits, ended_habits, today } }
 *   - createHabit 返回: { code, message, data: { _id, name } }
 *
 * 危害:
 *   - 前端需要适配多种格式，易出错
 *   - 添加字段时容易遗漏某个云函数
 *   - 难以统一错误处理
 *
 * 方案:
 *   ✅ 定义全局返回规范
 *   ✅ 所有云函数遵循此规范
 */

/**
 * 问题2: 打卡反馈不足
 *
 * 现象:
 *   - 乐观更新UI后，等待云函数返回才显示Toast
 *   - 没有成功打卡的庆祝文案池
 *   - 没有打卡失败的温和文案
 *   - 网络失败 = 给用户"感觉失败了"
 *
 * 危害:
 *   - 用户心理挫折感强
 *   - 容易放弃（尤其是前3天）
 *   - 没有积极强化
 *
 * 方案:
 *   ✅ 打卡后立即弹首卡页（不等后端）
 *   ✅ 首卡页展示礼花+文案
 *   ✅ 网络失败时友好提示，但不影响本地记录
 */

/**
 * 问题3: Home 页面逻辑过重
 *
 * 现象:
 *   - 负责渲染、计算、重试、模板创建、动画
 *   - data 字段太多（habits, completedCount, recommendedHabits, editingId...）
 *   - 自己算 completionRate（=计算逻辑下沉到前端）
 *
 * 危害:
 *   - 容易出现数据不一致（e.g., 乐观更新后刷新覆盖）
 *   - 后端改字段名必须同步前端
 *   - 难以测试和维护
 *
 * 方案:
 *   ✅ Home data 只保留必须项：habitsToday, progress, completedCount
 *   ✅ 计算逻辑（如completionRate）全部后端返回
 *   ✅ 打卡后通知首页刷新，而非主动计算
 */

/**
 * 问题4: Streak 逻辑分散
 *
 * 现象:
 *   - logHabit 返回 is_completed，但不涉及 streak
 *   - getHabitDetail 才计算 streak（在详情页）
 *   - 打卡成功后没有即时反馈 streak
 *
 * 危害:
 *   - 用户打卡 3 天后，不知道"连续3天"的成就感
 *   - 首卡页需要 streak 来判断是否显示 day3/day7 动效，但需要额外调用
 *   - 统计页面重复计算 streak，浪费流量和时间
 *
 * 方案:
 *   ✅ logHabit 返回 streak（后端计算）
 *   ✅ getTodayHabits 返回 streak（后端计算）
 *   ✅ 打卡成功直接显示"连续第X天"
 */

/**
 * 问题5: 模板库门槛
 *
 * 现象:
 *   - 20条模板中，部分默认 targetTimes > 1
 *   - 免费用户最多3个，容易被卡住
 *   - 首次体验自动创建，若选到难的模板就容易放弃
 *
 * 危害:
 *   - 用户坚持不到7天（首卡→Day3→Day7 的漏斗）
 *   - "微习惯"产品定位被破坏
 *
 * 方案:
 *   ✅ 所有模板默认 targetTimes = 1, frequency = daily
 *   ✅ createHabit 云函数强制降级：若 targetTimes > 1 且非会员，则改为 1
 *   ✅ 首次自动创建优先选择"极简"模板（喝口水、站一分钟）
 */

/**
 * 问题6: 防放弃机制缺失
 *
 * 现象:
 *   - 打卡失败或错过一天，就显示"0天"
 *   - 没有"重新开始"的心理支撑
 *   - 用户会看错后端数据（如"连续失败3天"） → 心理崩溃
 *
 * 危害:
 *   - Day 3/5/7 是高流失点
 *   - 数据库存"负面信息"，易激发算法对用户的"坏脾气"
 *
 * 方案:
 *   ✅ 后端只存 lastDoneDate、streak（永不归零）
 *   ✅ streak 断开后重新开始 = 1（不是 0）
 *   ✅ 文案：streak=1 时显示"重新开始也很棒"，不说"失败"
 *   ✅ 统计页面强调"改进"，不强调"失败"
 */

/**
 * 问题7: Stats 页面信息过载
 *
 * 现象:
 *   - 返回详细 logs 列表，前端自己聚合
 *   - 显示 raw 数据，用户看不懂
 *   - 没有"结论"，只有"数据"
 *
 * 危害:
 *   - 用户 3 秒看不懂页面，就关掉
 *   - 没有心理激励
 *
 * 方案:
 *   ✅ getStats 返回：{ weeklyRate, bestHabit, improved, advice }
 *   ✅ Stats 页面文案优先：大标题"本周完成率 85%"，图表次之
 *   ✅ 强调"进度"而不是"失败"
 */

// ============ 二、数据结构规范 ============

/**
 * 全局云函数返回规范
 *
 * {
 *   success: boolean,           // 是否成功
 *   code: number,               // 业务码：0=成功, -1=系统错误, 1001+=业务错误
 *   message: string,            // 用户友好提示
 *   data: object,               // 业务数据，成功才返回
 *   error?: string              // 技术错误日志，仅内部调试
 * }
 *
 * 业务码定义:
 *   0     : 成功
 *   -1    : 系统错误（参数校验、DB异常等）
 *   1001  : 超出限制（习惯数、权限等）
 *   1002  : 重复操作（今日已完成目标）
 *   1003  : 无效状态（习惯已结束）
 */

/**
 * logHabit 返回示例
 * {
 *   success: true,
 *   code: 0,
 *   message: "打卡成功",
 *   data: {
 *     streak: 3,                  // 🆕 连续天数
 *     doneTimesToday: 1,          // 今天已完成次数
 *     targetTimes: 1,             // 每天目标次数
 *     isCompleted: true,          // 今日是否完成
 *     feedbackTier: "day3"        // 🆕 反馈层级：regular/day3/day7/recovery
 *   }
 * }
 *
 * 1002 重复操作示例
 * {
 *   success: false,
 *   code: 1002,
 *   message: "今日已完成目标次数",
 *   data: {
 *     doneTimesToday: 1,
 *     targetTimes: 1
 *   }
 * }
 */

/**
 * getTodayHabits 返回示例
 * {
 *   success: true,
 *   code: 0,
 *   message: "获取成功",
 *   data: {
 *     habits: [
 *       {
 *         habitId: "xxx",
 *         name: "喝一口水",
 *         isCompleted: false,
 *         doneTimesToday: 0,
 *         targetTimes: 1,
 *         streak: 5,              // 🆕
 *         progressCurrent: 3,
 *         progressTotal: 21
 *       }
 *     ],
 *     completedCount: 2,          // 🆕 直接返回，不让前端算
 *     totalCount: 5,              // 🆕
 *     progress: 40,               // 🆕 完成率百分比
 *     endedHabits: []
 *   }
 * }
 */

// ============ 三、打卡流程优化 ============

/**
 * 当前流程（问题）：
 *   1. 用户点打卡
 *   2. 乐观更新 UI（habit.is_completed = true）
 *   3. 等待 logHabit 云函数返回（可能 1-3秒）
 *   4. 显示 Toast（成功/失败）
 *   5. 若失败则 rollback
 *
 * 优化后（方案）：
 *   1. 用户点打卡
 *   2. 乐观更新 UI（habit.is_completed = true）
 *   3. 异步调用 logHabit + 记录本地（200ms UI反馈）
 *   4. 打卡成功 → 立即跳首卡页（不等后端）
 *   5. 首卡页根据本地 streak 判断动效
 *   6. 首卡页同步调用 getHabitDetail 确认 streak（精确值）
 *   7. 网络失败时本地记录仍有效，下次刷新时同步
 *
 * 核心改变：
 *   ✅ 打卡成功不再显示 Toast，直接跳首卡激励页
 *   ✅ 网络失败时仍跳首卡页，但显示"网络异常"提示
 *   ✅ 首卡页才是真正的"庆祝反馈"中心
 */

// ============ 四、7 天改造计划 ============

/**
 * Day 1-2: 云函数返回结构统一
 *
 * 涉及文件:
 *   - cloudfunctions/logHabit/index.js
 *   - cloudfunctions/getTodayHabits/index.js
 *   - cloudfunctions/createHabit/index.js
 *   - cloudfunctions/getHabitDetail/index.js
 *   - cloudfunctions/getStats/index.js
 *
 * 具体改动:
 *   ✅ 定义统一的返回格式包装函数
 *   ✅ logHabit 补充 streak、feedbackTier 返回
 *   ✅ getTodayHabits 返回 completedCount、totalCount、progress
 *   ✅ 所有错误统一使用业务码
 */

/**
 * Day 3: Home 打卡体验优化
 *
 * 涉及文件:
 *   - pages/home/home.js
 *   - pages/onboarding/first-checkin/first-checkin.js
 *
 * 具体改动:
 *   ✅ handleCheckIn 打卡成功立即跳首卡页
 *   ✅ 首卡页接收 streak、feedbackTier 参数
 *   ✅ 网络失败时友好提示，但不阻止跳转
 *   ✅ Home 回到时自动刷新列表（页面栈重新加载）
 */

/**
 * Day 4: Streak 逻辑后端化
 *
 * 涉及文件:
 *   - cloudfunctions/logHabit/index.js （核心）
 *   - cloudfunctions/getTodayHabits/index.js
 *
 * 具体改动:
 *   ✅ logHabit 计算 streak（基于 lastDoneDate）
 *   ✅ getTodayHabits 返回每个习惯的 streak
 *   ✅ 定义 feedbackTier 映射：streak=1→regular, 3→day3, 7→day7, 断开后→recovery
 */

/**
 * Day 5: 模板库极简化
 *
 * 涉及文件:
 *   - cloudfunctions/initTemplates/index.js （重新导入数据）
 *   - cloudfunctions/createHabit/index.js （强制降级）
 *   - pages/home/home.js （优先选择极简模板）
 *
 * 具体改动:
 *   ✅ 所有模板 targetTimes = 1，frequency = "daily"
 *   ✅ createHabit 加防护：targetTimes > 1 且非会员时改为 1
 *   ✅ autoStartWithTemplate 优先选择"喝水""站立"等极简模板
 */

/**
 * Day 6: Stats 结论优先
 *
 * 涉及文件:
 *   - cloudfunctions/getStats/index.js
 *   - pages/stats/stats.js
 *   - pages/stats/stats.wxml
 *
 * 具体改动:
 *   ✅ getStats 返回：weeklyRate, bestHabit, improved, adviceText
 *   ✅ Stats 页面大字标题显示主结论
 *   ✅ 去掉"失败天数"等负面文案
 *   ✅ 强调"对比上周进度"
 */

/**
 * Day 7: 全流程手测
 *
 * 测试场景:
 *   ✅ 新用户首进 → 自动创建模板 → 打卡 → 首卡激励 → 返回 Home 刷新
 *   ✅ 网络断开时打卡 → 本地记录成功 → 恢复网络后自动同步
 *   ✅ 重复点打卡按钮 → 提示"已完成"，不重复打卡
 *   ✅ Day 3/7 时打卡 → 首卡页显示对应动效与文案
 *   ✅ 断卡后重新打卡 → 显示"recovery"动效，文案为"欢迎回来"
 */

module.exports = {
  version: "v2.0-optimized",
  priority: "Day1-2 > Day3 > Day4 > Day5 > Day6-7",
  criticalPath: [
    "统一返回结构",
    "打卡直达首卡",
    "Streak后端计算",
    "模板极简化"
  ]
};
