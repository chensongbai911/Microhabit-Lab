// pages/data-export/data-export.js
const util = require('../../utils/util.js');

Page({
  data: {
    exportData: null,
    exportFormat: 'json', // json | csv
    loading: false,
    exported: false
  },

  onLoad () {
    // 页面加载，还不导出数据
  },

  /**
   * 生成导出数据
   */
  async generateExport () {
    try {
      this.setData({ loading: true });

      const res = await wx.cloud.callFunction({
        name: 'exportUserData',
        data: { user_id: wx.getStorageSync('user_id') || '' }
      });

      if (res.result.code === 0) {
        const { json, csv, total_habits } = res.result.data;

        this.setData({
          exportData: {
            json: json,
            csv: csv,
            total_habits: total_habits
          },
          exported: true,
          loading: false
        });

        util.showToast('导出成功，可以复制数据');
      } else {
        util.showToast(res.result.message || '导出失败');
        this.setData({ loading: false });
      }
    } catch (error) {
      util.showToast('导出失败');
      this.setData({ loading: false });
      console.error('导出失败:', error);
    }
  },

  /**
   * 切换导出格式
   */
  handleFormatChange (e) {
    this.setData({ exportFormat: e.detail.value });
  },

  /**
   * 复制数据到剪贴板
   */
  copyData () {
    const format = this.data.exportFormat;
    const data = this.data.exportData;

    if (!data) {
      util.showToast('请先生成导出数据');
      return;
    }

    const content = format === 'json'
      ? JSON.stringify(data.json, null, 2)
      : data.csv;

    wx.setClipboardData({
      data: content,
      success: () => {
        util.showToast('已复制到剪贴板');
      },
      fail: () => {
        util.showToast('复制失败');
      }
    });
  },

  /**
   * 下载数据文件
   */
  downloadData () {
    const format = this.data.exportFormat;
    const data = this.data.exportData;

    if (!data) {
      util.showToast('请先生成导出数据');
      return;
    }

    const filename = `habits_${new Date().getTime()}.${format === 'json' ? 'json' : 'csv'}`;
    const content = format === 'json'
      ? JSON.stringify(data.json, null, 2)
      : data.csv;

    // 小程序中，通常需要通过服务器保存文件
    // 这里简化处理：提示用户
    wx.showModal({
      title: '下载数据',
      content: `文件名: ${filename}\n\n请使用"复制数据"功能，然后在电脑上粘贴保存为文件。\n\n或者让开发者实现服务端下载接口。`,
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});
