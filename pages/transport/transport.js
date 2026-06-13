// pages/transport/transport.js
const app = getApp();

Page({
  data: {
    stage: 'prepare',
    stageName: '准备阶段',
    allItems: [
      { id: 0, name: '便携监护仪', icon: '📟', required: true, placed: false },
      { id: 1, name: '氧气瓶', icon: '🫧', required: true, placed: false },
      { id: 2, name: 'ECMO便携电源', icon: '🔋', required: true, placed: false },
      { id: 3, name: '手动复苏球囊', icon: '🫁', required: true, placed: false },
      { id: 4, name: '急救药物包', icon: '💊', required: true, placed: false },
      { id: 5, name: '吸痰管', icon: '🧴', required: false, placed: false },
      { id: 6, name: '约束带', icon: '⛓️', required: false, placed: false },
      { id: 7, name: 'CT输液架', icon: '🏥', required: false, placed: false }
    ],
    slots: [
      { filled: false, name: '', icon: '' },
      { filled: false, name: '', icon: '' },
      { filled: false, name: '', icon: '' },
      { filled: false, name: '', icon: '' },
      { filled: false, name: '', icon: '' }
    ],
    prepareComplete: false,
    prepareScore: 0,
    dragging: false,
    dragX: 0, dragY: 0,
    dragIndex: -1,
    dragName: '',
    dragIcon: '',
    dragRequired: false,
    transportTimer: 300,
    transportProgress: 0,
    eventsHandled: 0,
    totalEvents: 2,
    transportScore: 0,
    transportTimerInterval: null,
    eventModalVisible: false,
    currentEvent: null,
    eventTimeLeft: 15,
    eventProgressPercent: 100,
    eventTimer: null,
    checkFlow: false,
    checkOxygen: false,
    checkTube: false,
    returnReady: false,
    returnScore: 0,
    totalScore: 0
  },

  onLoad() {
    
    // 获取系统状态栏高度，用于自定义导航栏适配
    const systemInfo = wx.getWindowInfo();
    console.log('状态栏高度', systemInfo.statusBarHeight); // 调试
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight + 50
    });
    if (!app.globalData) app.globalData = {};
  },

  // ========== 准备阶段拖拽逻辑 ==========
  onTouchStart(e) {
    const { index, name, icon, required } = e.currentTarget.dataset;
    const item = this.data.allItems[index];
    if (item.placed) return;
    const touch = e.touches[0];
    this.setData({
      dragging: true,
      dragIndex: index,
      dragName: name,
      dragIcon: icon,
      dragRequired: required,
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
    const { dragIndex, dragName, dragIcon, dragRequired } = this.data;
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    this.setData({ dragging: false });

    const query = this.createSelectorQuery();
    for (let i = 0; i < 5; i++) {
      query.select(`#slot-${i}`).boundingClientRect();
    }
    query.exec((res) => {
      let targetSlot = -1;
      for (let i = 0; i < res.length; i++) {
        const rect = res[i];
        if (rect && endX >= rect.left && endX <= rect.right && endY >= rect.top && endY <= rect.bottom) {
          targetSlot = i;
          break;
        }
      }
      if (targetSlot === -1) return;
      if (this.data.slots[targetSlot].filled) {
        wx.showToast({ title: '插槽已被占用', icon: 'none' });
        return;
      }
      if (!dragRequired) {
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: '非必需物品，无需携带', icon: 'none' });
        return;
      }
      const newAllItems = [...this.data.allItems];
      newAllItems[dragIndex].placed = true;
      const newSlots = [...this.data.slots];
      newSlots[targetSlot] = { filled: true, name: dragName, icon: dragIcon };
      const newPrepareScore = this.data.prepareScore + 10;
      this.setData({
        allItems: newAllItems,
        slots: newSlots,
        prepareScore: newPrepareScore,
        totalScore: newPrepareScore
      });
      wx.showToast({ title: `已放置${dragName}`, icon: 'success' });
      const allRequiredPlaced = this.data.allItems.filter(i => i.required).every(i => i.placed);
      if (allRequiredPlaced) {
        this.setData({ prepareComplete: true });
      }
    });
  },

  resetPrepare() {
    const resetItems = this.data.allItems.map(i => ({ ...i, placed: false }));
    const resetSlots = this.data.slots.map(() => ({ filled: false, name: '', icon: '' }));
    this.setData({
      allItems: resetItems,
      slots: resetSlots,
      prepareComplete: false,
      prepareScore: 0,
      totalScore: 0
    });
    wx.showToast({ title: '已重置', icon: 'none' });
  },

  // ========== 开始转运 ==========
  startTransport() {
    if (!this.data.prepareComplete) return;
    this.setData({
      stage: 'transport',
      stageName: '转运阶段',
      transportTimer: 300,
      transportProgress: 0,
      eventsHandled: 0,
      transportScore: 0,
      totalScore: this.data.prepareScore
    });
    this.startTransportTimer();
    this.scheduleEventWithModal();
  },

  startTransportTimer() {
    const timer = setInterval(() => {
      let remaining = this.data.transportTimer - 1;
      if (remaining <= 0) {
        clearInterval(timer);
        this.setData({ transportTimer: 0, transportTimerInterval: null });
        this.forceCompleteTransport();
      } else {
        this.setData({ transportTimer: remaining });
      }
    }, 1000);
    this.setData({ transportTimerInterval: timer });
  },

  scheduleEventWithModal() {
    const events = [
      {
        title: 'ECMO电源报警',
        content: '便携电源电量不足，ECMO转速下降。你该怎么办？',
        options: ['立即返回病房', '快速更换备用电池组', '忽略报警继续前行'],
        correct: 1
      },
      {
        title: '管路打折',
        content: 'ECMO流量突然下降，检查发现管路打折。你该怎么办？',
        options: ['立即解除打折并报告医生', '增大血流量冲开', '停止ECMO转运'],
        correct: 0
      }
    ];
    const showNextEvent = () => {
      if (this.data.stage !== 'transport') return;
      if (this.data.eventsHandled >= this.data.totalEvents) {
        this.endTransport();
        return;
      }
      const event = events[this.data.eventsHandled];
      this.showEventModal(event);
    };
    setTimeout(showNextEvent, 5000);
    const scheduleNext = () => {
      if (this.data.stage !== 'transport') return;
      if (this.data.eventsHandled >= this.data.totalEvents) return;
      const delay = Math.floor(Math.random() * (20000 - 10000 + 1) + 10000);
      setTimeout(() => {
        if (this.data.stage === 'transport' && this.data.eventsHandled < this.data.totalEvents) {
          showNextEvent();
          scheduleNext();
        }
      }, delay);
    };
    scheduleNext();
  },

  showEventModal(event) {
    if (this.data.eventTimer) clearInterval(this.data.eventTimer);
    this.setData({
      eventModalVisible: true,
      currentEvent: event,
      eventTimeLeft: 15,
      eventProgressPercent: 100
    });
    const startTime = Date.now();
    const total = 15;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      let remaining = total - elapsed;
      if (remaining <= 0) {
        clearInterval(timer);
        this.setData({ eventTimer: null, eventModalVisible: false });
        this.handleEventResult(false, this.data.currentEvent.options[this.data.currentEvent.correct]);
      } else {
        const percent = (remaining / total) * 100;
        this.setData({
          eventTimeLeft: remaining.toFixed(1),
          eventProgressPercent: percent
        });
      }
    }, 100);
    this.setData({ eventTimer: timer });
  },

  selectEventOption(e) {
    if (!this.data.eventModalVisible) return;
    const selectedIdx = e.currentTarget.dataset.optIndex;
    const isCorrect = (selectedIdx === this.data.currentEvent.correct);
    if (this.data.eventTimer) clearInterval(this.data.eventTimer);
    this.setData({ eventModalVisible: false, eventTimer: null });
    if (isCorrect) {
      this.handleEventResult(true);
    } else {
      const correctOption = this.data.currentEvent.options[this.data.currentEvent.correct];
      this.handleEventResult(false, correctOption);
    }
  },

  closeEventModal() {
    if (this.data.eventModalVisible) {
      if (this.data.eventTimer) clearInterval(this.data.eventTimer);
      this.setData({ eventModalVisible: false, eventTimer: null });
      const correctOption = this.data.currentEvent.options[this.data.currentEvent.correct];
      this.handleEventResult(false, correctOption);
    }
  },

  stopPropagation() {},

  handleEventResult(isCorrect, correctHint = '') {
    if (this.data.stage !== 'transport') return;
    let newScore = this.data.transportScore;
    if (isCorrect) {
      newScore += 20;
      wx.showToast({ title: '处理正确 +20', icon: 'success' });
    } else {
      newScore -= 10;
      wx.vibrateShort({ type: 'medium' });
      wx.showModal({
        title: '处理错误',
        content: correctHint ? `正确做法：${correctHint}` : '处理错误',
        showCancel: false
      });
    }
    const newEventsHandled = this.data.eventsHandled + 1;
    const newProgress = (newEventsHandled / this.data.totalEvents) * 100;
    this.setData({
      transportScore: newScore,
      totalScore: this.data.prepareScore + newScore,
      eventsHandled: newEventsHandled,
      transportProgress: newProgress
    });
    if (newEventsHandled >= this.data.totalEvents) {
      this.endTransport();
    }
  },

  forceCompleteTransport() {
    if (this.data.stage !== 'transport') return;
    if (this.data.eventsHandled < this.data.totalEvents) {
      const missing = this.data.totalEvents - this.data.eventsHandled;
      const penalty = missing * 15;
      let newScore = this.data.transportScore - penalty;
      this.setData({
        transportScore: newScore,
        totalScore: this.data.prepareScore + newScore,
        eventsHandled: this.data.totalEvents,
        transportProgress: 100
      });
      wx.showToast({ title: `时间到！未处理事件扣${penalty}分`, icon: 'none' });
    }
    this.endTransport();
  },

  endTransport() {
    if (this.data.transportTimerInterval) {
      clearInterval(this.data.transportTimerInterval);
      this.setData({ transportTimerInterval: null });
    }
    this.setData({
      stage: 'return',
      stageName: '返回阶段'
    });
  },

  // ========== 返回阶段 ==========
  onCheckChange(e) {
    const key = e.currentTarget.dataset.check;
    const value = e.detail.value.length > 0;
    if (key === 'flow') this.setData({ checkFlow: value });
    if (key === 'oxygen') this.setData({ checkOxygen: value });
    if (key === 'tube') this.setData({ checkTube: value });
    const allChecked = this.data.checkFlow && this.data.checkOxygen && this.data.checkTube;
    this.setData({ returnReady: allChecked });
  },

  confirmReturn() {
    if (!this.data.returnReady) return;
    let returnScore = 20;
    if (!this.data.checkFlow) returnScore -= 10;
    if (!this.data.checkOxygen) returnScore -= 10;
    if (!this.data.checkTube) returnScore -= 10;
    if (returnScore < 0) returnScore = 0;
    const total = this.data.prepareScore + this.data.transportScore + returnScore;
    this.setData({ returnScore, totalScore: total });
    app.globalData.transportScore = total;
    wx.showModal({
      title: '转运完成',
      content: `准备阶段: ${this.data.prepareScore}\n转运阶段: ${this.data.transportScore}\n返回核查: ${returnScore}\n总分: ${total}`,
      showCancel: false,
      success: () => {
        const app = getApp();
        app.setLevelData('level5', {
          score: total,
          prepareScore: this.data.prepareScore,
          transportErrors: this.data.transportErrors,
          returnChecklist: this.data.returnReady
        });
        setTimeout(() => {
          wx.reLaunch ({
            url: '/pages/debrief/debrief',
            fail: () => { wx.showToast({ title: '第六关未开放', icon: 'none' }); }
          });
        }, 500);
      }
    });
  },

  onUnload() {
    if (this.data.transportTimerInterval) clearInterval(this.data.transportTimerInterval);
    if (this.data.eventTimer) clearInterval(this.data.eventTimer);
  }
});