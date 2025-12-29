/**
 * 鼓励语文案池
 */

const encouragementTexts = [
  '今天,只需要完成这些小小的动作,就足够了。',
  '小小的30秒,也在一点点改变未来。',
  '不求完美,坚持一点点就好。',
  '每一个微小的行动,都是在为自己投资。',
  '今天的你,又向目标迈进了一小步。',
  '不要小看这些小动作,它们会带来大改变。',
  '做一点点,总比什么都不做要好。',
  '保持简单,保持轻松,保持前进。',
  '你已经开始了,这就是最大的成功。',
  '一天一点点,习惯就会慢慢形成。'
];

/**
 * 触发器选项 - 按时间分类(含完成率数据)
 */
const triggerOptions = {
  morning: [
    { label: '刷牙后', value: '刷牙后', time: '07:00-08:00', icon: '🚿', completionRate: 94, usageCount: 1250 },
    { label: '早餐后', value: '早餐后', time: '08:00-09:00', icon: '🍴', completionRate: 92, usageCount: 980 },
    { label: '出门前', value: '出门前', time: '08:30-09:00', icon: '🚪', completionRate: 88, usageCount: 650 }
  ],
  work: [
    { label: '上班路上', value: '上班路上', time: '09:00-10:00', icon: '🚕', completionRate: 85, usageCount: 850 },
    { label: '到办公室后', value: '到办公室后', time: '09:30-10:00', icon: '💼', completionRate: 82, usageCount: 720 },
    { label: '午饭前', value: '午饭前', time: '12:00-12:30', icon: '🍽️', completionRate: 78, usageCount: 580 },
    { label: '午饭后', value: '午饭后', time: '13:00-13:30', icon: '🍜', completionRate: 75, usageCount: 540 },
    { label: '下班前', value: '下班前', time: '17:30-18:00', icon: '⏰', completionRate: 72, usageCount: 420 }
  ],
  evening: [
    { label: '下班到家后', value: '下班到家后', time: '18:00-19:00', icon: '🏠', completionRate: 70, usageCount: 380 },
    { label: '晚餐后', value: '晚餐后', time: '19:00-20:00', icon: '🍲', completionRate: 68, usageCount: 450 },
    { label: '睡前', value: '睡前', time: '22:00-23:00', icon: '🛌', completionRate: 65, usageCount: 320 }
  ],
  anytime: [
    { label: '有空时', value: '有空时', time: '全天', icon: '⏳', completionRate: 62, usageCount: 280 },
    { label: '每个整点', value: '每个整点', time: '全天', icon: '🔔', completionRate: 60, usageCount: 150 },
    { label: '自定义', value: 'other', time: '自己设定', icon: '✏️', completionRate: 0, usageCount: 0 }
  ]
};

/**
 * 触发器分类定义
 */
const triggerCategories = {
  morning: { label: '晨间', icon: '🌅', order: 1 },
  work: { label: '工作', icon: '💼', order: 2 },
  evening: { label: '晚间', icon: '🌙', order: 3 },
  anytime: { label: '全天', icon: '⏳', order: 4 }
};

/**
 * 习惯分类
 */
const habitCategories = [
  { label: '全部', value: 'all' },
  { label: '健康', value: 'health' },
  { label: '学习', value: 'study' },
  { label: '情绪', value: 'emotion' },
  { label: '效率', value: 'efficiency' }
];

/**
 * 分类图标映射(可使用emoji或图片)
 */
const categoryIcons = {
  health: '💚',
  study: '📚',
  emotion: '😊',
  efficiency: '⚡'
};

/**
 * 分类名称映射
 */
const categoryNames = {
  health: '健康',
  study: '学习',
  emotion: '情绪',
  efficiency: '效率'
};

/**
 * 会员权益列表
 */
const memberBenefits = [
  '无限创建习惯(最多20个同时进行)',
  '解锁全部精选微习惯模板',
  '查看完整21天打卡记录',
  '获得详细数据分析与建议',
  '添加个人实验备注'
];

/**
 * 打卡成功文案池
 */
const checkInSuccessTexts = [
  '已记录,做得很好!',
  '太棒了,又完成一次!',
  '继续保持,你很棒!',
  '做得很好,坚持下去!',
  '又打卡了,真不错!'
];

module.exports = {
  encouragementTexts,
  triggerOptions,
  triggerCategories,
  habitCategories,
  categoryIcons,
  categoryNames,
  memberBenefits,
  checkInSuccessTexts
};
