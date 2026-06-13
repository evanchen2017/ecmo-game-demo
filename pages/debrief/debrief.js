// pages/debrief/debrief.js
const app = getApp();

Page({
  data: {
    currentTab: 0,
    totalScore: 0,
    ratingText: '',
    levelScores: [0, 0, 0, 0, 0],
    suggestions: [],
    sbarText: '',
    certVisible: false,
    canvasWidth: 300,
    canvasHeight: 400
  },

  onLoad() {
    
    // 获取系统状态栏高度，用于自定义导航栏适配
    const systemInfo = wx.getWindowInfo();
    console.log('状态栏高度', systemInfo.statusBarHeight); // 调试
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight + 50
    });
    this.initGlobalData();
    this.computeScores();
    this.generateSuggestions();
    this.generateSBAR();
  },

  initGlobalData() {
    if (!app.globalData) app.globalData = {};
    const gd = app.globalData;
    const defaultLevels = {
      level1: { score: 0, errors: [], completed: false },
      level2: { score: 0, orderErrors: 0, resetUsed: false, completed: false },
      level3: { score: 0, wrongCommands: [], timeouts: 0, completed: false },
      level4: { score: 0, wrongHotspots: [], completed: false },
      level5: { score: 0, prepareScore: 0, transportErrors: 0, returnChecklist: false, completed: false }
    };
    for (let [key, def] of Object.entries(defaultLevels)) {
      if (!gd[key]) gd[key] = { ...def };
      let hasActivity = false;
      if (key === 'level1') hasActivity = gd[key].errors && gd[key].errors.length > 0;
      if (key === 'level2') hasActivity = (gd[key].orderErrors > 0) || (gd[key].resetUsed === true);
      if (key === 'level3') hasActivity = (gd[key].wrongCommands && gd[key].wrongCommands.length > 0) || (gd[key].timeouts > 0);
      if (key === 'level4') hasActivity = (gd[key].wrongHotspots && gd[key].wrongHotspots.length > 0);
      if (key === 'level5') hasActivity = (gd[key].transportErrors > 0) || (gd[key].prepareScore > 0);
      gd[key].completed = (gd[key].score > 0) || hasActivity;
      if (!gd[key].completed && gd[key].score === 0) {
        gd[key].score = 60;
      } else if (typeof gd[key].score !== 'number') {
        gd[key].score = 60;
      }
    }
  },

  computeScores() {
    const gd = app.globalData;
    const scores = [
      gd.level1.score,
      gd.level2.score,
      gd.level3.score,
      gd.level4.score,
      gd.level5.score
    ];
    const validScores = scores.map(s => typeof s === 'number' ? s : 60);
    const total = validScores.reduce((a,b) => a + b, 0);
    const avg = total / 5;
    this.setData({
      levelScores: validScores,
      totalScore: Math.round(avg)
    });
    let ratingText = '';
    if (avg >= 90) ratingText = '优秀 🌟🌟🌟';
    else if (avg >= 70) ratingText = '合格 🌟🌟';
    else ratingText = '待加强 🌟';
    this.setData({ ratingText });
  },

  generateSuggestions() {
    const gd = app.globalData;
    const suggestions = [];
    if (gd.level2.orderErrors > 0) {
      suggestions.push('⚠️ 预充顺序错误，请重点学习管路组装步骤（检查管路→泵头→氧合器→预充袋→排气）。');
    }
    if (gd.level2.resetUsed === true) {
      suggestions.push('⚠️ 预充阶段使用了重置功能，建议加强一次成功的操作练习。');
    }
    if (gd.level3.wrongCommands && gd.level3.wrongCommands.length > 0) {
      const wrongCmds = gd.level3.wrongCommands;
      if (wrongCmds.includes(2)) suggestions.push('⚠️ 术中未及时递送缝线，复习术中配合流程。');
      if (wrongCmds.includes(4)) suggestions.push('⚠️ 推注肝素操作顺序错误，需掌握注射器使用规范。');
      if (gd.level3.timeouts > 0) suggestions.push('⚠️ 术中指令响应超时，需要提高反应速度。');
    }
    if (gd.level4.wrongHotspots && gd.level4.wrongHotspots.length > 0) {
      const hotspots = gd.level4.wrongHotspots;
      if (hotspots.includes(1)) suggestions.push('⚠️ 左下肢缺血风险识别错误，请学习ECMO患者下肢缺血的早期识别与处理。');
      if (hotspots.includes(2)) suggestions.push('⚠️ 插管处出血处理不当，应掌握加压包扎和备血流程。');
      if (hotspots.includes(3)) suggestions.push('⚠️ 尿袋溶血判断错误，需复习溶血相关监测指标。');
      if (hotspots.includes(4)) suggestions.push('⚠️ 心包填塞应急措施错误，学习床旁超声快速评估。');
      if (hotspots.includes(5)) suggestions.push('⚠️ 膜肺血栓识别错误，需掌握膜肺压力监测及更换指征。');
    }
    if (gd.level5.transportErrors > 0) {
      suggestions.push('⚠️ 转运途中突发状况处理错误，复习ECMO患者转运应急预案。');
    }
    if (gd.level5.returnChecklist === false) {
      suggestions.push('⚠️ 返回前安全核查遗漏，务必确保三个项目全部勾选。');
    }
    if (suggestions.length === 0) {
      suggestions.push('🎉 恭喜！操作规范，无显著错误，请继续保持专业水准。');
    }
    this.setData({ suggestions });
  },

  generateSBAR() {
    const gd = app.globalData;
    const total = this.data.totalScore;
    const rating = this.data.ratingText;
    let situation = '患者张建国，55岁，VA-ECMO术后第2天，生命体征稳定。';
    let background = `诊断为急性心梗后心源性休克，IABP后仍恶化，行VA-ECMO。目前ECMO流量3.2L/min，转速3200rpm，膜肺压力45mmHg。`;
    let assessment = `模拟训练总评分${total}分，评价：${rating}。`;
    let recommendation = `明日计划：继续监测下肢血供，每日超声评估；注意管路固定，预防感染；加强ACT监测。`;
    if (gd.level4.wrongHotspots && gd.level4.wrongHotspots.includes(1)) {
      assessment += ' 患者曾出现下肢缺血征兆，已及时处理；';
    }
    if (gd.level5.transportErrors > 0) {
      assessment += ' 转运期间发生过电源报警，已更换备用电池；';
    }
    const sbarText = `【S】${situation}\n【B】${background}\n【A】${assessment}\n【R】${recommendation}`;
    this.setData({ sbarText });
  },

  copyReport() {
    wx.setClipboardData({
      data: this.data.sbarText,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  },

  showResetOptions() {
    const items = ['第一关 · 病例接收', '第二关 · 管路预充', '第三关 · 术中配合', '第四关 · 术后观察', '第五关 · 外出检查'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const levelIndex = res.tapIndex + 1;
        let url = '';
        switch (levelIndex) {
          case 1: url = '/pages/case_receive/case_receive'; break;
          case 2: url = '/pages/prepare/prepare'; break;
          case 3: url = '/pages/intraop/intraop'; break;
          case 4: url = '/pages/postop/postop'; break;
          case 5: url = '/pages/transport/transport'; break;
        }
        if (url) {
          wx.navigateTo({
            url: url + '?reset=true',
            success: () => {
              wx.showToast({ title: '重新挑战，加油！', icon: 'none' });
            }
          });
        }
      }
    });
  },

  finishGame() {
    this.setCanvasSize();
    this.setData({ certVisible: true });
    this.drawCertificate();
  },

  setCanvasSize() {
    const systemInfo = wx.getWindowInfo();
    const screenWidth = systemInfo.windowWidth;
    const displayWidthRpx = 600;
    const displayHeightRpx = 800;
    const pxWidth = (displayWidthRpx / 750) * screenWidth;
    const pxHeight = (displayHeightRpx / 750) * screenWidth;
    this.setData({
      canvasWidth: pxWidth,
      canvasHeight: pxHeight
    });
  },

  drawCertificate() {
    const ctx = wx.createCanvasContext('certCanvas');
    const w = this.data.canvasWidth;
    const h = this.data.canvasHeight;
    if (w === 0 || h === 0) return;

    ctx.setFillStyle('#FFF8F0');
    ctx.fillRect(0, 0, w, h);
    ctx.setStrokeStyle('#D4AF37');
    ctx.setLineWidth(4);
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.setFontSize(w / 15);
    ctx.setFillStyle('#B8860B');
    ctx.fillText('ECMO护理模拟培训', w / 2 - (w / 5), h / 10);
    ctx.setFontSize(w / 20);
    ctx.setFillStyle('#333');
    ctx.fillText('结 业 证 书', w / 2 - (w / 12), h / 6);
    ctx.setFontSize(w / 18);
    let userName = '护理学员';
    if (app.globalData && app.globalData.userName) {
      userName = app.globalData.userName + '同学';
    }
    ctx.fillText(userName, w/2 - (w/10), h/4);
    // ctx.fillText('张建国同学', w / 2 - (w / 10), h / 4);
    ctx.setFontSize(w / 20);
    ctx.fillText(`综合评分：${this.data.totalScore}分 (${this.data.ratingText})`, w / 2 - (w / 4), h / 3.2);
    ctx.fillText(`完成关卡数：5 / 5`, w / 2 - (w / 5), h / 2.6);
    ctx.fillText(`培训日期：${new Date().toLocaleDateString()}`, w / 2 - (w / 3.5), h / 2.2);
    ctx.setFontSize(w / 15);
    ctx.setFillStyle('#D4AF37');
    ctx.fillText('★ 核准 ★', w / 2 - (w / 8), h / 1.5);
    ctx.draw();
  },


  saveCert() {
    wx.canvasToTempFilePath({
      canvasId: 'certCanvas',
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({ title: '证书已保存到相册', icon: 'success' });
          },
          fail: () => {
            wx.showToast({ title: '请授权相册权限', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        console.error(err);
        wx.showToast({ title: '生成失败', icon: 'none' });
      }
    });
  },


  closeCert() {
    this.setData({ certVisible: false });
  },

  stopPropagation() {},

  onSwiperChange(e) {
    this.setData({ currentTab: e.detail.current });
  }
});