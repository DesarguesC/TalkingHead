// 添加日志的补丁代码
const addLogsToTalkingHead = () => {
  // 获取原始的animate方法
  const originalAnimate = TalkingHead.prototype.animate;
  
  // 重写animate方法，添加日志
  TalkingHead.prototype.animate = function(t) {
    // 调用原始方法
    const result = originalAnimate.call(this, t);
    
    // 添加日志
    if (this.isListening) {
      console.log(`音量信息: 当前=${this.listeningVolume.toFixed(2)}, 静音阈值=${this.listeningSilenceThresholdLevel}, 活动阈值=${this.listeningActiveThresholdLevel}`);
      console.log(`计时器: ${this.listeningActive ? '活动' : '非活动'}状态, 计时=${this.listeningTimer.toFixed(2)}ms, 总计时=${this.listeningTimerTotal.toFixed(2)}ms`);
      
      if (!this.listeningActive && this.listeningTimerTotal > this.listeningSilenceDurationMax * 0.8) {
        console.warn(`警告: 接近最大静音时间 ${this.listeningTimerTotal.toFixed(2)}/${this.listeningSilenceDurationMax}ms`);
      }
    }
    
    return result;
  };
  
  // 重写startListening方法，修改默认参数
  const originalStartListening = TalkingHead.prototype.startListening;
  TalkingHead.prototype.startListening = function(analyzer, opt = {}, onchange = null) {
    // 修改默认参数
    if (!opt.hasOwnProperty('listeningSilenceDurationMax')) {
      opt.listeningSilenceDurationMax = 500; // 将最大静音时间从10秒增加到30秒
    }
    if (!opt.hasOwnProperty('listeningSilenceThresholdLevel')) {
      opt.listeningSilenceThresholdLevel = 30; // 降低静音阈值，使系统更容易检测到声音
    }
    if (!opt.hasOwnProperty('listeningActiveThresholdLevel')) {
      opt.listeningActiveThresholdLevel = 60; // 降低活动阈值，使系统更容易检测到语音活动
    }
    
    // 包装onchange回调，添加日志
    const wrappedOnchange = (status, ...args) => {
      console.log(`语音活动状态变化: ${status}, 时间: ${new Date().toLocaleTimeString()}`);
      console.log(`当前音量信息: 活动=${this.listeningActive}, 音量=${this.listeningVolume.toFixed(2)}, 计时器=${this.listeningTimer.toFixed(2)}, 总计时=${this.listeningTimerTotal.toFixed(2)}`);
      
      if (onchange) {
        onchange(status, ...args);
      }
    };
    
    // 调用原始方法
    return originalStartListening.call(this, analyzer, opt, wrappedOnchange);
  };
  
  console.log('已添加TalkingHead日志补丁');
};

// 在页面加载完成后执行
window.addEventListener('load', () => {
  setTimeout(addLogsToTalkingHead, 2000); // 延迟2秒执行，确保TalkingHead已加载
}); 