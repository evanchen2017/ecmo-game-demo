// pages/intraop/intraop.js
const app = getApp();

Page({
  data: {
    // 固定指令序列
    commands: [
      { text: "准备肝素盐水冲洗管路", correctItem: "heparin_saline", isCombination: false },
      { text: "递送5-0 prolene缝线", correctItem: "suture", isCombination: false },
      { text: "无菌剪刀，准备剪线", correctItem: "scissors", isCombination: false },
      { text: "推注肝素 3000单位", correctItem: "heparin_ampoule", isCombination: true, requirePre: "syringe" }, // 需先选中注射器再点安瓿
      { text: "报告当前平均动脉压", correctItem: "map_click", isCombination: false }
    ],
    currentCommandIndex: 0,
    currentCommand: { text: "", correctItem: "", isCombination: false },
    cardColor: "#1E3A8A", // 正常深蓝，正确时闪绿，错误时闪红
    commandTimeLeft: 10,    // 当前指令剩余秒数
    commandProgress: 100,   // 进度条百分比
    globalTime: 90,         // 整体剩余秒数
    vitals: {
      bp: "82/50",
      hr: 118,
      spo2: 94,
      map: 62
    },
    selectedItem: null,     // 用于组合操作（注射器高亮）
    score: 100,             // 基础分100，每错一次扣10，提示扣5
    errorCount: 0,
    hintUsed: false,
    gameActive: true,       // 是否允许操作（未完成/未失败）
    // 计时器ID
    commandTimer: null,
    globalTimer: null
  },

  onLoad() {
    
    // 获取系统状态栏高度，用于自定义导航栏适配
    const systemInfo = wx.getWindowInfo();
    console.log('状态栏高度', systemInfo.statusBarHeight); // 调试
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight + 50
    });
    this.initLevel();
  },

  initLevel() {
    // 重置索引
    this.setData({
      currentCommandIndex: 0,
      commandTimeLeft: 10,
      commandProgress: 100,
      globalTime: 90,
      vitals: {
        bp: "82/50",
        hr: 118,
        spo2: 94,
        map: 62
      },
      selectedItem: null,
      score: 100,
      errorCount: 0,
      hintUsed: false,
      gameActive: true,
      cardColor: "#1E3A8A"
    });
    // 加载第一条指令
    this.loadCommand(0);
    // 启动整体计时器
    this.startGlobalTimer();
  },

  loadCommand(index) {
    // 清除当前指令的倒计时
    if (this.data.commandTimer) clearInterval(this.data.commandTimer);
    const cmd = this.data.commands[index];
    if (!cmd) {
      // 所有指令完成
      this.completeLevel();
      return;
    }
    this.setData({
      currentCommand: cmd,
      commandTimeLeft: 10,
      commandProgress: 100,
      selectedItem: null,   // 重置选中状态
      cardColor: "#1E3A8A"
    });
    // 启动指令倒计时
    this.startCommandTimer();
  },

  startCommandTimer() {
    if (this.data.commandTimer) clearInterval(this.data.commandTimer);
    const startTime = Date.now();
    const totalTime = 10;
    const timer = setInterval(() => {
      if (!this.data.gameActive) return;
      const elapsed = (Date.now() - startTime) / 1000;
      let remaining = totalTime - elapsed;
      if (remaining <= 0) {
        // 超时
        clearInterval(timer);
        this.setData({ commandTimer: null });
        this.onCommandTimeout();
      } else {
        const percent = (remaining / totalTime) * 100;
        this.setData({
          commandTimeLeft: remaining.toFixed(1),
          commandProgress: percent
        });
      }
    }, 100);
    this.setData({ commandTimer: timer });
  },

  onCommandTimeout() {
    if (!this.data.gameActive) return;
    // 记录错误
    this.recordError("超时");
    // 闪红卡片
    this.setData({ cardColor: "#B91C1C" });
    // 震动
    wx.vibrateShort({ type: "medium" });
    // 延时进入下一条
    setTimeout(() => {
      this.nextCommand();
    }, 1000);
  },

  // 处理物品点击
  onItemTap(e) {
    if (!this.data.gameActive) return;
    const item = e.currentTarget.dataset.item;
    const cmd = this.data.currentCommand;

    // 指令4组合处理
    if (cmd.isCombination && cmd.correctItem === "heparin_ampoule") {
      if (item === "syringe") {
        // 选中注射器
        this.setData({ selectedItem: "syringe" });
        return;
      } else if (item === "heparin_ampoule") {
        if (this.data.selectedItem === "syringe") {
          // 正确组合
          this.handleCorrect();
        } else {
          // 未先选中注射器
          this.wrongAction("请先用注射器抽取肝素");
        }
        // 无论正确错误，清除选中状态
        this.setData({ selectedItem: null });
        return;
      } else {
        // 其他物品错误
        this.wrongAction(`错误！需要先选注射器再点肝素安瓿`);
        this.setData({ selectedItem: null });
        return;
      }
    }

    // 指令5特殊：MAP点击（在wxml中绑定单独事件）
    if (cmd.correctItem === "map_click") {
      // 本函数不处理，由 onMapClick 处理
      return;
    }

    // 普通指令匹配
    if (item === cmd.correctItem) {
      this.handleCorrect();
    } else {
      this.wrongAction(`错误！需要：${this.getItemName(cmd.correctItem)}`);
    }
  },

  // 点击MAP数值区域
  onMapClick() {
    if (!this.data.gameActive) return;
    const cmd = this.data.currentCommand;
    if (cmd.correctItem === "map_click") {
      this.handleCorrect();
    } else {
      this.wrongAction("当前指令不需要报告MAP");
    }
  },

  handleCorrect() {
    // 停止指令计时器
    if (this.data.commandTimer) {
      clearInterval(this.data.commandTimer);
      this.setData({ commandTimer: null });
    }
    // 正确反馈：卡片闪绿、震动（轻）
    this.setData({ cardColor: "#15803D" });
    wx.vibrateShort({ type: "light" });
    // 更新生命体征：MAP +2，HR -3（限制范围）
    let newMap = this.data.vitals.map + 2;
    let newHr = this.data.vitals.hr - 3;
    newMap = Math.min(75, newMap);
    newHr = Math.max(90, newHr);
    this.setData({
      vitals: {
        ...this.data.vitals,
        map: newMap,
        hr: newHr
      }
    });
    // 延迟0.5秒进入下一条
    setTimeout(() => {
      this.nextCommand();
    }, 500);
  },

  wrongAction(msg) {
    // 记录错误
    this.recordError(msg);
    // 震动
    wx.vibrateShort({ type: "medium" });
    // 卡片闪红
    this.setData({ cardColor: "#B91C1C" });
    // 额外扣除整体时间2秒
    let newGlobal = Math.max(0, this.data.globalTime - 2);
    this.setData({ globalTime: newGlobal });
    // 生命体征恶化：MAP-2，HR+5
    let newMap = this.data.vitals.map - 2;
    let newHr = this.data.vitals.hr + 5;
    newMap = Math.max(40, newMap);
    newHr = Math.min(160, newHr);
    this.setData({
      vitals: {
        ...this.data.vitals,
        map: newMap,
        hr: newHr
      }
    });
    // 显示toast提示
    wx.showToast({ title: msg, icon: "none", duration: 1000 });
    // 停止当前指令计时器
    if (this.data.commandTimer) {
      clearInterval(this.data.commandTimer);
      this.setData({ commandTimer: null });
    }
    // 1秒后进入下一条
    setTimeout(() => {
      this.nextCommand();
    }, 1000);
  },

  recordError(reason) {
    const newErrorCount = this.data.errorCount + 1;
    const newScore = Math.max(0, this.data.score - 10);
    this.setData({
      errorCount: newErrorCount,
      score: newScore
    });
    console.log(`错误: ${reason}, 当前错误数: ${newErrorCount}`);
  },

  nextCommand() {
    const nextIndex = this.data.currentCommandIndex + 1;
    if (nextIndex >= this.data.commands.length) {
      // 所有指令已完成，但尚未调用 completeLevel（loadCommand里会触发）
      this.completeLevel();
      return;
    }
    this.setData({ currentCommandIndex: nextIndex });
    this.loadCommand(nextIndex);
  },

  startGlobalTimer() {
    if (this.data.globalTimer) clearInterval(this.data.globalTimer);
    const timer = setInterval(() => {
      if (!this.data.gameActive) return;
      let remaining = this.data.globalTime - 1;
      if (remaining <= 0) {
        clearInterval(timer);
        this.setData({ globalTimer: null, globalTime: 0, gameActive: false });
        this.onGlobalTimeout();
      } else {
        this.setData({ globalTime: remaining });
      }
    }, 1000);
    this.setData({ globalTimer: timer });
  },

  onGlobalTimeout() {
    // 停用指令计时器
    if (this.data.commandTimer) {
      clearInterval(this.data.commandTimer);
      this.setData({ commandTimer: null });
    }
    wx.showModal({
      title: "术中延误",
      content: "整体时间已耗尽，请重试",
      showCancel: false,
      success: () => {
        this.resetLevel();
      }
    });
  },

  completeLevel() {
    if (!this.data.gameActive) return;
    // 停止所有计时器
    if (this.data.commandTimer) clearInterval(this.data.commandTimer);
    if (this.data.globalTimer) clearInterval(this.data.globalTimer);
    this.setData({ gameActive: false });
    // 最终得分计算（基础分已扣错）
    let finalScore = this.data.score;
    if (this.data.hintUsed) finalScore -= 5;
    finalScore = Math.max(0, finalScore);
    // 存储得分到全局
    const app = getApp();
    if (!app.globalData) app.globalData = {};
    app.globalData.level3Score = finalScore;
    app.globalData.level3Errors = this.data.errorCount;

    wx.showModal({
      title: "手术配合完成",
      content: `得分: ${finalScore}\n错误次数: ${this.data.errorCount}`,
      showCancel: false,
      success: () => {
        const app = getApp();
        app.setLevelData('level3', {
          score: finalScore,
          wrongCommands: this.data.wrongCommandIndices, // 记录错误指令索引
          timeouts: this.data.timeoutCount
        });
        setTimeout(() => {
          wx.navigateTo({
            url: "/pages/postop/postop",
            fail: () => {
              wx.showToast({ title: "第四关未开放", icon: "none" });
            }
          });
        }, 500);
      }
    });
  },

  showHint() {
    if (!this.data.gameActive) return;
    if (this.data.hintUsed) {
      wx.showToast({ title: "提示已使用过", icon: "none" });
      return;
    }
    const cmd = this.data.currentCommand;
    let correctName = "";
    if (cmd.correctItem === "heparin_saline") correctName = "肝素盐水";
    else if (cmd.correctItem === "suture") correctName = "缝线";
    else if (cmd.correctItem === "scissors") correctName = "无菌剪刀";
    else if (cmd.correctItem === "heparin_ampoule") correctName = "肝素安瓿（需先选中注射器）";
    else if (cmd.correctItem === "map_click") correctName = "生命体征面板中的MAP数值";
    wx.showModal({
      title: "提示",
      content: `当前需要：${correctName}`,
      showCancel: false
    });
    this.setData({ hintUsed: true });
    // 扣分已在最终计算时处理
  },

  resetLevel() {
    // 重置所有计时器
    if (this.data.commandTimer) clearInterval(this.data.commandTimer);
    if (this.data.globalTimer) clearInterval(this.data.globalTimer);
    this.setData({
      commandTimer: null,
      globalTimer: null
    });
    this.initLevel();
  },

  getItemName(itemId) {
    const map = {
      heparin_saline: "肝素盐水",
      suture: "缝线",
      scissors: "无菌剪刀",
      syringe: "注射器",
      heparin_ampoule: "肝素安瓿",
      gauze: "纱布",
      map_click: "MAP数值"
    };
    return map[itemId] || "未知物品";
  },

  onUnload() {
    // 清除所有计时器
    if (this.data.commandTimer) clearInterval(this.data.commandTimer);
    if (this.data.globalTimer) clearInterval(this.data.globalTimer);
  }
});