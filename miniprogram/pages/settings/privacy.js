// pages/settings/privacy.js
Page({
  data: {
    paragraphs: []
  },

  onLoad () {
    // 简化版隐私政策要点，非法律文本 — 可替换为正式条款
    const paragraphs = [
      { type: 'h1', text: '隐私政策' },
      { type: 'p', text: '感谢你选择微习惯实验室。我们非常重视你的隐私与数据安全。' },
      { type: 'p', text: '我们仅收集为实现应用功能所必需的最小数据，例如用于打卡统计的行为数据、用于订阅的授权信息和用于支付的必要凭证。' },
      { type: 'p', text: '所有个人数据仅用于提供服务，不会出售给第三方。我们会采取合理的安全措施保护数据。' },
      { type: 'p', text: '如果对隐私政策有疑问，请通过应用内反馈或项目维护邮箱与我们联系。' }
    ];

    this.setData({ paragraphs });
  },

  goBack () {
    wx.navigateBack();
  }
});
