// pages/prepare/prepare.js
Page({
  data: {
    components: [
      { name: '检查管路', icon: '🔍', placed: false },
      { name: '离心泵头', icon: '🔵', placed: false },
      { name: '氧合器', icon: '🟠', placed: false },
      { name: '预充袋', icon: '🟢', placed: false },
      { name: '排气阀', icon: '🔴', placed: false }
    ],
    steps: [
      { name: '检查管路', icon: '🔍', placed: false },
      { name: '离心泵头', icon: '🔵', placed: false },
      { name: '氧合器', icon: '🟠', placed: false },
      { name: '预充袋', icon: '🟢', placed: false },
      { name: '排气阀', icon: '🔴', placed: false }
    ],
    dragging: false,
    dragX: 0,
    dragY: 0,
    dragIndex: -1,
    dragName: '',
    dragIcon: '',
    animationActive: false,
    progressPercent: 0,
    animationText: '等待预充',
    allStepsFilled: false
  },

  onLoad() {
    
    // 获取系统状态栏高度，用于自定义导航栏适配
    const systemInfo = wx.getWindowInfo();
    console.log('状态栏高度', systemInfo.statusBarHeight); // 调试
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight + 50
    });
  },

  onTouchStart(e) {
    const { index, name, icon } = e.currentTarget.dataset;
    if (this.data.components[index].placed) return;
    const touch = e.touches[0];
    this.setData({
      dragging: true,
      dragIndex: index,
      dragName: name,
      dragIcon: icon,
      dragX: touch.clientX - 40,
      dragY: touch.clientY - 40
    });
  },

  onTouchMove(e) {
    if (!this.data.dragging) return;
    const touch = e.touches[0];
    this.setData({
      dragX: touch.clientX - 40,
      dragY: touch.clientY - 40
    });
  },

  onTouchEnd(e) {
    if (!this.data.dragging) return;
    const { dragIndex, dragName, dragIcon } = this.data;
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;

    // 使用唯一id查询每个步骤槽位
    const query = this.createSelectorQuery();
    for (let i = 0; i < this.data.steps.length; i++) {
      query.select(`#step-slot-${i}`).boundingClientRect();
    }
    query.exec((res) => {
      // 立即隐藏拖拽浮层
      this.setData({ dragging: false });
      
      let targetStepIndex = -1;
      for (let i = 0; i < res.length; i++) {
        const rect = res[i];
        if (rect && endX >= rect.left && endX <= rect.right && endY >= rect.top && endY <= rect.bottom) {
          targetStepIndex = i;
          break;
        }
      }
      
      console.log('触摸点:', endX, endY);
      console.log('步骤槽位矩形:', res);
      console.log('命中索引:', targetStepIndex);
      
      this.handleDrop(dragIndex, dragName, dragIcon, targetStepIndex);
    });
  },

  handleDrop(dragIndex, dragName, dragIcon, targetStepIndex) {
    if (targetStepIndex === -1) {
      this.wrongDrop('请将部件拖拽到步骤空位内');
      return;
    }

    const step = this.data.steps[targetStepIndex];
    if (step.placed) {
      this.wrongDrop('该步骤已放置部件，不能重复');
      return;
    }

    if (dragName !== step.name) {
      const correctOrder = this.data.steps.map(s => s.name).join(' → ');
      this.wrongDrop(`顺序错误，正确顺序应为：${correctOrder}`);
      return;
    }

    // 成功放置
    const newComponents = [...this.data.components];
    newComponents[dragIndex].placed = true;
    const newSteps = [...this.data.steps];
    newSteps[targetStepIndex].placed = true;
    this.setData({
      components: newComponents,
      steps: newSteps
    });
    wx.showToast({ title: '放置正确', icon: 'success', duration: 500 });

    const allFilled = newSteps.every(s => s.placed === true);
    if (allFilled) {
      this.setData({ allStepsFilled: true });
      this.startPreFillAnimation();
    }
  },

  wrongDrop(message) {
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  resetGame() {
    if (this.animationInterval) clearInterval(this.animationInterval);
    const newComponents = this.data.components.map(c => ({ ...c, placed: false }));
    const newSteps = this.data.steps.map(s => ({ ...s, placed: false }));
    this.setData({
      components: newComponents,
      steps: newSteps,
      allStepsFilled: false,
      animationActive: false,
      progressPercent: 0,
      animationText: '等待预充'
    });
    wx.showToast({ title: '已重置', icon: 'none' });
  },

  startPreFillAnimation() {
    if (this.animationInterval) return;
    this.setData({
      animationActive: true,
      progressPercent: 0,
      animationText: '预充中... 0%'
    });
    let percent = 0;
    const duration = 5000;
    const interval = 50;
    const stepPercent = (interval / duration) * 100;
    this.animationInterval = setInterval(() => {
      percent += stepPercent;
      if (percent >= 100) {
        percent = 100;
        clearInterval(this.animationInterval);
        this.animationInterval = null;
        this.setData({
          progressPercent: 100,
          animationText: '预充完成！排气已完成 ✅'
        });
      } else {
        this.setData({
          progressPercent: percent,
          animationText: `预充中... ${Math.floor(percent)}%`
        });
      }
    }, interval);
  },

  confirmComplete() {
    if (!this.data.allStepsFilled) return;
    wx.showToast({
      title: '预充完成，进入下一关',
      icon: 'success',
      duration: 800
    });
    const app = getApp();
    app.setLevelData('level2', {
      score: this.data.totalScore,      // 最终得分
      orderErrors: this.data.errorCount, // 顺序错误次数
      resetUsed: this.data.resetUsed     // 是否点过重置（需在resetGame中记录）
    });
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/intraop/intraop',
        fail: () => {
          wx.showToast({ title: '第三关暂未开放', icon: 'none' });
        }
      });
    }, 500);
  },

  onUnload() {
    if (this.animationInterval) clearInterval(this.animationInterval);
  }
});