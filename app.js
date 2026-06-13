// app.js
App({
  globalData: {
    // 第一关：病例接收
    level1: {
      score: 0,        // 得分（0-100）
      errors: []       // 错误记录（如未完整阅读等，预留）
    },
    // 第二关：管路预充
    level2: {
      score: 0,
      orderErrors: 0,   // 顺序错误次数
      resetUsed: false  // 是否使用过重置
    },
    // 第三关：术中配合
    level3: {
      score: 0,
      wrongCommands: [], // 错误指令索引数组（如 [2,4]）
      timeouts: 0        // 超时次数
    },
    // 第四关：术后观察
    level4: {
      score: 0,
      wrongHotspots: []  // 错误点击的热点索引（0-5）
    },
    // 第五关：外出检查
    level5: {
      score: 0,
      prepareScore: 0,    // 准备阶段得分（0-50）
      transportErrors: 0, // 转运阶段错误次数
      returnChecklist: false // 返回阶段核查是否完整（true/false）
    },
    // 全局用户信息（可选）
    userInfo: null
  },

  onLaunch(options) {
    // 初始化本地缓存（可选）
    this.loadFromStorage();
    console.log('App Launch', options);
  },

  onShow(options) {
    console.log('App Show', options);
  },

  // 从本地缓存读取已保存的关卡数据（若需要持久化）
  loadFromStorage() {
    try {
      const saved = wx.getStorageSync('ecmo_game_data');
      if (saved) {
        // 合并缓存数据到 globalData
        for (let key in saved) {
          if (this.globalData.hasOwnProperty(key)) {
            Object.assign(this.globalData[key], saved[key]);
          }
        }
      }
    } catch (e) {
      console.error('读取缓存失败', e);
    }
  },

  // 保存所有关卡数据到本地缓存（可在每次更新后调用）
  saveToStorage() {
    try {
      const dataToSave = {
        level1: this.globalData.level1,
        level2: this.globalData.level2,
        level3: this.globalData.level3,
        level4: this.globalData.level4,
        level5: this.globalData.level5
      };
      wx.setStorageSync('ecmo_game_data', dataToSave);
    } catch (e) {
      console.error('保存缓存失败', e);
    }
  },

  // 便捷方法：更新某一关卡的数据
  setLevelData(level, data) {
    if (this.globalData[level]) {
      Object.assign(this.globalData[level], data);
      this.saveToStorage(); // 每次更新后自动保存
    } else {
      console.warn(`Invalid level: ${level}`);
    }
  },

  // 重置某一关卡的数据（重新挑战时调用）
  resetLevelData(level) {
    const defaultData = {
      level1: { score: 0, errors: [] },
      level2: { score: 0, orderErrors: 0, resetUsed: false },
      level3: { score: 0, wrongCommands: [], timeouts: 0 },
      level4: { score: 0, wrongHotspots: [] },
      level5: { score: 0, prepareScore: 0, transportErrors: 0, returnChecklist: false }
    };
    if (defaultData[level]) {
      this.globalData[level] = JSON.parse(JSON.stringify(defaultData[level]));
      this.saveToStorage();
    }
  }
});