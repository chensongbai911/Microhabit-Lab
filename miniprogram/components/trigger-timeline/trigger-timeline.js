/**
 * 触发器时间线组件
 * 显示一天内的时间段和对应的触发器
 */

Component({
  properties: {
    triggerOptions: {
      type: Object,
      value: {}
    },
    selectedValue: {
      type: String,
      value: ''
    }
  },

  data: {
    timelineData: []
  },

  lifetimes: {
    attached () {
      this.generateTimeline();
    }
  },

  methods: {
    /**
     * 生成时间线数据
     */
    generateTimeline () {
      const timeline = [
        {
          time: '06:00',
          icon: '🌅',
          label: '早晨',
          description: '新的一天开始'
        },
        {
          time: '12:00',
          icon: '🍽️',
          label: '午餐',
          description: '中午休息'
        },
        {
          time: '18:00',
          icon: '🏠',
          label: '下班',
          description: '回到家'
        },
        {
          time: '22:00',
          icon: '🌙',
          label: '晚间',
          description: '睡前时间'
        }
      ];

      this.setData({ timelineData: timeline });
    },

    /**
     * 触发器选择
     */
    onTriggerSelect (e) {
      const { value } = e.currentTarget.dataset;
      this.triggerchange({
        detail: { value }
      });
    }
  }
});
