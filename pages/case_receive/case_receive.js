// pages/case_receive/case_receive.js
Page({
  data: {
    statusBarHeight: 20, // 动态获取状态栏高度
    expanded: {
      basic: false,
      vitals: false,
      labs: false,
      treatment: false,
      indication: false
    },
    readStatus: {
      basic: false,
      vitals: false,
      labs: false,
      treatment: false,
      indication: false
    },
    allModulesRead: false,
    animationData: {} // 存储每个模块的动画实例
  },

  onLoad() {
    
    // 获取系统状态栏高度，用于自定义导航栏适配
    const systemInfo = wx.getWindowInfo();
    console.log('状态栏高度', systemInfo.statusBarHeight); // 调试
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight + 50
    });
    const app = getApp();
    if (!app.globalData.userName) {
    wx.showModal({
      title: '请输入您的姓名',
      editable: true,
      placeholderText: '例如：李护士',
      success: (res) => {
        if (res.confirm && res.content) {
          app.globalData.userName = res.content;
        } else {
          app.globalData.userName = '护理学员';
        }
      }
    });
  }
    // 初始化动画数据
    const initAnim = {};
    const modules = ['basic', 'vitals', 'labs', 'treatment', 'indication'];
    modules.forEach(module => {
      initAnim[module] = null;
    });
    this.setData({ animationData: initAnim });
  },

  // 切换模块折叠/展开
  toggleModule(e) {
    const module = e.currentTarget.dataset.module;
    const currentExpanded = this.data.expanded[module];
    const willExpand = !currentExpanded;

    // 更新展开状态
    const newExpanded = { ...this.data.expanded };
    newExpanded[module] = willExpand;
    this.setData({ expanded: newExpanded });

    // 如果是展开动作，且该模块尚未标记为已读
    if (willExpand && !this.data.readStatus[module]) {
      // 播放缩放动画
      this.playFlipAnimation(module);
      // 震动反馈（短震动）
      wx.vibrateShort({
        type: 'light',
        success: () => {},
        fail: () => console.log('震动失败（模拟器正常）')
      });
      // 标记为已读
      const newReadStatus = { ...this.data.readStatus };
      newReadStatus[module] = true;
      this.setData({ readStatus: newReadStatus });
      // 检查是否所有模块都已读
      this.checkAllRead();
    }
  },

  // 播放翻页动画（CSS scale 0.95 → 1）
  playFlipAnimation(module) {
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease-out'
    });
    animation.scale(0.95).step();
    animation.scale(1).step();
    const newAnimData = { ...this.data.animationData };
    newAnimData[module] = animation.export();
    this.setData({ animationData: newAnimData });
    // 动画结束后清除，避免重复播放时没有效果
    setTimeout(() => {
      const resetAnim = { ...this.data.animationData };
      resetAnim[module] = null;
      this.setData({ animationData: resetAnim });
    }, 250);
  },

  // 检查所有模块是否均已展开过
  checkAllRead() {
    const allRead = Object.values(this.data.readStatus).every(status => status === true);
    if (allRead !== this.data.allModulesRead) {
      this.setData({ allModulesRead: allRead });
      // 可选：震动一下提示按钮解锁
      if (allRead) {
        wx.vibrateShort({ type: 'light' });
      }
    }
  },

  // 确认接收
  confirmReceive() {
    if (!this.data.allModulesRead) {
      wx.showToast({
        title: '请先完整阅读病历所有部分',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showToast({
      title: '病历已确认',
      icon: 'success',
      duration: 800
    });

    const app = getApp();
    app.setLevelData('level1', {
      score: 100,          // 本关得分
      errors: []           // 若阅读不完整可记录错误
    });
    // 延迟跳转第二关
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/prepare/prepare', // 第二关页面路径，请确保已创建
        success: () => {},
        fail: () => {
          wx.showToast({ title: '第二关暂未开放', icon: 'none' });
        }
      });
    }, 500);
  }
});