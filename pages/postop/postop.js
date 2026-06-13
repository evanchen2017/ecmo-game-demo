// pages/postop/postop.js
const app = getApp();

Page({
  data: {
    hotspotStatus: [false, false, false, false, false, false],
    hotspotFlash: [true, true, true, true, true, true],
    remainingRisk: 6,
    score: 100,
    errorsPerHotspot: [0, 0, 0, 0, 0, 0],
    modalVisible: false,
    modalTitle: "",
    modalQuestion: "",
    modalOptions: [],
    correctOptionIndex: -1,
    currentHotspotIndex: -1,
    modalTimeLeft: 20,
    modalProgress: 100,
    modalTimer: null,
    flashInterval: null,
    clickedInfo: "点击异常区域",
    hintUsed: false,
    sceneHeight: 400
  },

  hotspotData: [
    { title: "ECMO管路气泡", 
      question: "你注意到ECMO氧合器入口有气泡，最合适的处理是？",
      options: ["A. 增加血流量冲走气泡", "B. 夹闭管路，呼叫医生，准备排气注射器", "C. 加入消泡剂", "D. 无需处理"],
      correct: 1 },
    { title: "左下肢缺血", 
      question: "患者左下肢皮肤苍白、皮温低，最合适的处理是？",
      options: ["A. 立即按摩左下肢", "B. 测量下肢周径，通知医生，准备多普勒超声", "C. 抬高左下肢30度", "D. 给予肝素抗凝"],
      correct: 1 },
    { title: "腹股沟插管处出血", 
      question: "敷料可见新鲜血液渗出，最合适的处理是？",
      options: ["A. 直接更换敷料", "B. 加压包扎，备血，遵医嘱输注血小板", "C. 拔出插管", "D. 局部冷敷"],
      correct: 1 },
    { title: "尿袋溶血", 
      question: "尿液呈淡红色，怀疑溶血，最合适的处理是？",
      options: ["A. 大量补液", "B. 使用利尿剂", "C. 查血气+游离血红蛋白，通知医生调整转速", "D. 停止ECMO"],
      correct: 2 },
    { title: "心包填塞", 
      question: "患者突然血压下降、中心静脉压升高，最合适的处理是？",
      options: ["A. 加快输液速度", "B. 紧急床旁超声，通知医生准备心包穿刺", "C. 增加血管活性药", "D. 行胸外按压"],
      correct: 1 },
    { title: "膜肺血栓", 
      question: "膜肺压力差明显升高，怀疑血栓形成，最合适的处理是？",
      options: ["A. 增加肝素剂量", "B. 查血气，准备更换膜肺", "C. 提高血流量冲刷", "D. 挤压膜肺"],
      correct: 1 }
  ],

  onLoad() {
    
    // 获取系统状态栏高度，用于自定义导航栏适配
    const systemInfo = wx.getWindowInfo();
    console.log('状态栏高度', systemInfo.statusBarHeight); // 调试
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight + 50
    });
    
    const windowInfo = wx.getWindowInfo();
    const sceneHeight = windowInfo.windowHeight * 0.6;
    this.setData({ sceneHeight });
    this.startFlashInterval();
  },

  startFlashInterval() {
    if (this.data.flashInterval) clearInterval(this.data.flashInterval);
    const interval = setInterval(() => {
      // 如果模态框打开，不更新闪烁状态，避免背景闪烁
      if (this.data.modalVisible) return;
      const newFlash = [...this.data.hotspotFlash];
      for (let i = 0; i < 6; i++) {
        if (!this.data.hotspotStatus[i]) {
          newFlash[i] = !newFlash[i];
        } else {
          newFlash[i] = false;
        }
      }
      this.setData({ hotspotFlash: newFlash });
    }, 1000);
    this.setData({ flashInterval: interval });
  },

  // 停止闪烁（弹窗时调用）
  stopFlashInterval() {
    if (this.data.flashInterval) {
      clearInterval(this.data.flashInterval);
      this.setData({ flashInterval: null });
    }
  },

  onHotspotTap(e) {
    const idx = e.currentTarget.dataset.index;
    if (this.data.hotspotStatus[idx]) {
      this.setData({ clickedInfo: "该风险点已处理" });
      return;
    }
    // 弹出模态框前，先停止闪烁
    this.stopFlashInterval();
    
    if (this.data.modalTimer) clearInterval(this.data.modalTimer);
    const data = this.hotspotData[idx];
    this.setData({
      modalVisible: true,
      modalTitle: data.title,
      modalQuestion: data.question,
      modalOptions: data.options,
      correctOptionIndex: data.correct,
      currentHotspotIndex: idx,
      modalTimeLeft: 20,
      modalProgress: 100,
      clickedInfo: `你点击了：${data.title}`
    });
    this.startModalTimer();
  },

  startModalTimer() {
    const startTime = Date.now();
    const total = 20;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      let remaining = total - elapsed;
      if (remaining <= 0) {
        clearInterval(timer);
        this.setData({ modalTimer: null });
        this.onModalTimeout();
      } else {
        const percent = (remaining / total) * 100;
        this.setData({
          modalTimeLeft: remaining.toFixed(1),
          modalProgress: percent
        });
      }
    }, 100);
    this.setData({ modalTimer: timer });
  },

  onModalTimeout() {
    const idx = this.data.currentHotspotIndex;
    const newErrors = [...this.data.errorsPerHotspot];
    newErrors[idx] += 1;
    let newScore = this.data.score - 5;
    if (newScore < 0) newScore = 0;
    this.setData({
      errorsPerHotspot: newErrors,
      score: newScore,
      modalVisible: false
    });
    wx.showToast({ title: "超时未处理", icon: "none" });
    if (this.data.modalTimer) clearInterval(this.data.modalTimer);
    // 关闭模态框后，如果有未解决的热区，重启闪烁
    this.resumeFlashIfNeeded();
  },

  selectOption(e) {
    const selectedIdx = e.currentTarget.dataset.optIndex;
    const correctIdx = this.data.correctOptionIndex;
    const hotspotIdx = this.data.currentHotspotIndex;
    if (selectedIdx === correctIdx) {
      if (this.data.modalTimer) clearInterval(this.data.modalTimer);
      const newStatus = [...this.data.hotspotStatus];
      newStatus[hotspotIdx] = true;
      const newRemaining = this.data.remainingRisk - 1;
      let newScore = this.data.score + 10;
      if (newScore > 100) newScore = 100;
      this.setData({
        hotspotStatus: newStatus,
        remainingRisk: newRemaining,
        score: newScore,
        modalVisible: false
      });
      wx.showToast({ title: "正确！", icon: "success" });
      if (newRemaining === 0) {
        this.completeLevel();
      } else {
        // 还有未解决风险点，重启闪烁
        this.resumeFlashIfNeeded();
      }
    } else {
      const newErrors = [...this.data.errorsPerHotspot];
      newErrors[hotspotIdx] += 1;
      let newScore = this.data.score - 5;
      if (newScore < 0) newScore = 0;
      this.setData({
        errorsPerHotspot: newErrors,
        score: newScore
      });
      const correctText = this.data.modalOptions[correctIdx];
      wx.showModal({
        title: "错误",
        content: `正确措施是：${correctText}`,
        showCancel: false,
        success: () => {
          if (this.data.modalTimer) clearInterval(this.data.modalTimer);
          this.setData({ modalVisible: false });
          // 关闭错误提示后，重启闪烁
          this.resumeFlashIfNeeded();
        }
      });
    }
  },

  // 恢复闪烁（如果有未解决的热区）
  resumeFlashIfNeeded() {
    const anyUnresolved = this.data.hotspotStatus.some(v => !v);
    if (anyUnresolved && !this.data.flashInterval) {
      this.startFlashInterval();
    }
  },

  completeLevel() {
    if (!app.globalData) app.globalData = {};
    app.globalData.postopScore = this.data.score;
    const totalErrors = this.data.errorsPerHotspot.reduce((a, b) => a + b, 0);
    app.globalData.postopErrors = totalErrors;
    // 停止所有定时器
    if (this.data.flashInterval) clearInterval(this.data.flashInterval);
    if (this.data.modalTimer) clearInterval(this.data.modalTimer);
    wx.showModal({
      title: "术后观察完成",
      content: `最终得分: ${this.data.score}`,
      showCancel: false,
      success: () => {
        const app = getApp();
        app.setLevelData('level4', {
          score: this.data.score,
          wrongHotspots: this.data.wrongHotspotIndices   // 记录错误的热点索引
        });
        setTimeout(() => {
          wx.navigateTo({
            url: "/pages/transport/transport",
            fail: () => { wx.showToast({ title: "第五关未开放", icon: "none" }); }
          });
        }, 1000);
      }
    });
  },

  useHint() {
    if (this.data.hintUsed) {
      wx.showToast({ title: "提示仅可用一次", icon: "none" });
      return;
    }
    const unresolvedIdx = this.data.hotspotStatus.findIndex(v => v === false);
    if (unresolvedIdx === -1) return;
    const hintMsg = this.hotspotData[unresolvedIdx].title;
    wx.showModal({
      title: "提示",
      content: `请注意检查：${hintMsg}`,
      showCancel: false
    });
    this.setData({ hintUsed: true });
    let newScore = this.data.score - 5;
    if (newScore < 0) newScore = 0;
    this.setData({ score: newScore });
  },

  showAuxInfo() {
    wx.showModal({
      title: "辅助信息",
      content: "ACT: 180s\n乳酸: 3.2 mmol/L\n游离血红蛋白: 45 mg/dL",
      showCancel: false
    });
  },

  closeModal() {
    if (this.data.modalVisible) {
      if (this.data.modalTimer) clearInterval(this.data.modalTimer);
      this.onModalTimeout();
    }
  },

  stopPropagation() {},

  onUnload() {
    if (this.data.flashInterval) clearInterval(this.data.flashInterval);
    if (this.data.modalTimer) clearInterval(this.data.modalTimer);
  }
});