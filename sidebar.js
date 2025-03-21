// 默认设置
let settings = {
  reminderInterval: 30, // 默认30分钟提醒一次
  breakDuration: 5      // 默认建议休息5分钟
};

// 状态变量
let state = {
  sittingStartTime: null,  // 本次久坐开始时间
  nextBreakTime: null,     // 下次休息时间
  standCount: 0,           // 今日已起立次数
  isOnBreak: false         // 是否正在休息
};

// DOM元素
let sittingTimeEl, nextBreakEl, standCountEl, standUpBtn, settingsBtn, 
    settingsPanel, reminderIntervalInput, breakDurationInput, saveSettingsBtn;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  sittingTimeEl = document.getElementById('sitting-time');
  nextBreakEl = document.getElementById('next-break');
  standCountEl = document.getElementById('stand-count');
  standUpBtn = document.getElementById('stand-up-btn');
  settingsBtn = document.getElementById('settings-btn');
  settingsPanel = document.getElementById('settings-panel');
  reminderIntervalInput = document.getElementById('reminder-interval');
  breakDurationInput = document.getElementById('break-duration');
  saveSettingsBtn = document.getElementById('save-settings');
  
  // 设置事件监听器
  setupEventListeners();
  
  // 快速显示上次的状态（如果有）
  chrome.storage.local.get(['state'], (data) => {
    if (data.state) {
      // 临时更新UI，稍后会被完整初始化覆盖
      state = data.state;
      updateUI();
    }
  });
  
  // 完整初始化
  initialize();
});

// 设置事件监听器
function setupEventListeners() {
  // 处理"我已起立走动"按钮点击
  standUpBtn.addEventListener('click', () => {
    standUpBtn.disabled = true; // 防止重复点击
    
    if (state.isOnBreak) {
      // 结束休息，开始新的工作周期
      state.isOnBreak = false;
      state.sittingStartTime = new Date();
      updateNextBreakTime();
    } else {
      // 开始休息
      state.isOnBreak = true;
      state.standCount++;
    }
    
    updateUI();
    saveState();
    standUpBtn.disabled = false;
  });

  // 设置按钮点击处理
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // 保存设置
  saveSettingsBtn.addEventListener('click', () => {
    saveSettingsBtn.disabled = true; // 防止重复点击
    
    settings.reminderInterval = parseInt(reminderIntervalInput.value) || 30;
    settings.breakDuration = parseInt(breakDurationInput.value) || 5;
    
    saveSettings();
    updateNextBreakTime();
    settingsPanel.classList.add('hidden');
    saveSettingsBtn.disabled = false;
  });
}

// 初始化
function initialize() {
  // 从存储中加载设置和状态
  chrome.storage.local.get(['settings', 'state'], (data) => {
    if (data.settings) {
      settings = data.settings;
      reminderIntervalInput.value = settings.reminderInterval;
      breakDurationInput.value = settings.breakDuration;
    }
    
    if (data.state) {
      // 只恢复今日的数据
      const today = new Date().toDateString();
      if (data.state.date === today) {
        state.standCount = data.state.standCount || 0;
        state.isOnBreak = data.state.isOnBreak || false;
      } else {
        // 新的一天，重置计数
        state.standCount = 0;
        state.isOnBreak = false;
        saveState();
      }
      
      // 恢复计时器状态
      if (data.state.sittingStartTime) {
        state.sittingStartTime = new Date(data.state.sittingStartTime);
      } else {
        state.sittingStartTime = new Date();
      }
      
      if (data.state.nextBreakTime) {
        state.nextBreakTime = new Date(data.state.nextBreakTime);
      } else {
        updateNextBreakTime();
      }
    } else {
      // 首次使用，初始化状态
      state.sittingStartTime = new Date();
      updateNextBreakTime();
      saveState();
    }
    
    // 更新UI
    updateUI();
    
    // 启动计时器，使用requestAnimationFrame优化性能
    let lastUpdateTime = 0;
    function updateTimersLoop(timestamp) {
      // 每秒更新一次
      if (timestamp - lastUpdateTime >= 1000) {
        lastUpdateTime = timestamp;
        updateTimers();
      }
      
      requestAnimationFrame(updateTimersLoop);
    }
    
    // 启动更新循环
    requestAnimationFrame(updateTimersLoop);
  });
}

// 保存状态到存储
function saveState() {
  const stateToSave = {
    ...state,
    date: new Date().toDateString()
  };
  chrome.storage.local.set({ state: stateToSave });
}

// 保存设置到存储
function saveSettings() {
  chrome.storage.local.set({ settings });
}

// 更新下次休息时间
function updateNextBreakTime() {
  state.nextBreakTime = new Date(
    state.sittingStartTime.getTime() + settings.reminderInterval * 60 * 1000
  );
  saveState();
}

// 更新UI显示
function updateUI() {
  // 更新已起立次数
  standCountEl.textContent = state.standCount;
  
  // 更新按钮状态
  if (state.isOnBreak) {
    standUpBtn.textContent = '继续工作';
  } else {
    standUpBtn.textContent = '我已起立走动';
  }
}

// 更新计时器
function updateTimers() {
  const now = new Date();
  
  // 更新久坐时间
  const sittingDuration = now - state.sittingStartTime;
  sittingTimeEl.textContent = formatTime(sittingDuration);
  
  // 更新下次休息倒计时
  if (state.nextBreakTime) {
    const timeUntilBreak = state.nextBreakTime - now;
    
    if (timeUntilBreak <= 0 && !state.isOnBreak) {
      // 提醒休息
      notifyBreakTime();
    } else if (timeUntilBreak > 0) {
      nextBreakEl.textContent = formatTime(timeUntilBreak);
    }
  }
}

// 提醒休息时间
function notifyBreakTime() {
  state.isOnBreak = true;
  updateUI();
  nextBreakEl.textContent = "现在！";
  
  // 发送通知
  chrome.runtime.sendMessage({
    action: 'showNotification',
    title: '该起来活动一下了！',
    message: `您已久坐${settings.reminderInterval}分钟，建议站起来走动${settings.breakDuration}分钟。`
  });
}

// 格式化时间为 HH:MM:SS
function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  return [h, m, s]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
} 