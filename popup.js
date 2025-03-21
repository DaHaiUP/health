// 缓存变量，避免频繁访问存储
let appState = null;
let timerInterval = null;
let tipsArray = [
  "每30-60分钟起立走动5分钟，对健康很有益处~",
  "适当拉伸可以缓解久坐带来的肌肉紧张哦~",
  "久坐会增加心脏病的风险，记得按时起来活动~",
  "多喝水，多走动，办公效率会更高呢~",
  "站立工作也是一种健康的选择哦~",
  "定时远眺可以缓解眼部疲劳，保护视力~",
  "坐姿端正也很重要，记得时刻保持良好坐姿~"
];
let characterMessages = {
  sitting: [
    "记得按时起来走走哦~",
    "工作辛苦了，别忘了休息~",
    "加油，注意保持姿势正确哦！",
    "时间过得真快呢，要记得休息~"
  ],
  standing: [
    "太棒了！活动一下很舒服吧~",
    "做得真好！休息一下更有效率~",
    "你真是健康达人！继续保持~",
    "今天的起立目标又完成一个！"
  ]
};

// 页面加载完成后立即执行
document.addEventListener('DOMContentLoaded', () => {
  // 设置事件监听
  setupEventListeners();
  
  // 随机显示一条健康小贴士
  showRandomTip();
  
  // 一次性获取所有数据
  loadDataAndInitialize();
});

// 设置按钮事件监听
function setupEventListeners() {
  // 站立按钮
  document.getElementById('stand-up-btn').addEventListener('click', handleStandButtonClick);
}

// 加载数据并初始化
function loadDataAndInitialize() {
  chrome.storage.local.get(['state', 'settings'], (data) => {
    if (!data.state) {
      // 首次使用，创建初始状态
      const now = new Date();
      const settings = data.settings || { reminderInterval: 30, breakDuration: 5 };
      
      appState = {
        sittingStartTime: now,
        nextBreakTime: new Date(now.getTime() + settings.reminderInterval * 60 * 1000),
        standCount: 0,
        isOnBreak: false,
        date: now.toDateString(),
        settings: settings
      };
      
      // 保存初始状态
      chrome.storage.local.set({ 
        state: {
          sittingStartTime: appState.sittingStartTime.toString(),
          nextBreakTime: appState.nextBreakTime.toString(),
          standCount: 0,
          isOnBreak: false,
          date: now.toDateString()
        } 
      });
    } else {
      // 转换日期字符串为Date对象
      appState = {
        sittingStartTime: new Date(data.state.sittingStartTime),
        nextBreakTime: data.state.nextBreakTime ? new Date(data.state.nextBreakTime) : null,
        standCount: data.state.standCount || 0,
        isOnBreak: data.state.isOnBreak || false,
        date: data.state.date,
        settings: data.settings || { reminderInterval: 30, breakDuration: 5 }
      };
    }
    
    // 更新UI
    updateUI();
    
    // 更新小人状态和消息
    updateCharacter();
    
    // 开始计时器
    startTimer();
  });
}

// 启动计时器
function startTimer() {
  // 清除已有计时器
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // 使用简单的setInterval，每秒更新一次
  timerInterval = setInterval(updateTimers, 1000);
  
  // 立即执行一次更新
  updateTimers();
}

// 更新计时器显示
function updateTimers() {
  if (!appState) return;
  
  const now = new Date();
  
  // 更新久坐时间
  const sittingDuration = now - appState.sittingStartTime;
  document.getElementById('sitting-time').textContent = formatTime(sittingDuration);
  
  // 更新下次休息倒计时
  if (appState.nextBreakTime) {
    const timeUntilBreak = appState.nextBreakTime - now;
    
    if (timeUntilBreak <= 0 && !appState.isOnBreak) {
      document.getElementById('next-break').textContent = "现在！";
      
      // 如果到了休息时间，更新角色状态显示提醒
      document.getElementById('character').innerHTML = "🏃‍♀️";
      document.getElementById('character-message').textContent = "该起来活动一下啦！";
    } else if (timeUntilBreak > 0) {
      document.getElementById('next-break').textContent = formatTime(timeUntilBreak);
    } else {
      document.getElementById('next-break').textContent = "00:00:00";
    }
  }
}

// 更新界面显示
function updateUI() {
  if (!appState) return;
  
  // 更新已起立次数
  document.getElementById('stand-count').textContent = appState.standCount;
  
  // 更新成就星星
  updateAchievementStars();
  
  // 更新按钮状态
  const standButton = document.getElementById('stand-up-btn');
  if (appState.isOnBreak) {
    standButton.textContent = '继续工作';
  } else {
    standButton.textContent = '我已起立走动';
  }
  
  // 确保按钮可点击
  standButton.disabled = false;
}

// 更新成就星星显示
function updateAchievementStars() {
  const starsContainer = document.getElementById('achievement-stars');
  starsContainer.innerHTML = '';
  
  // 计算应该显示多少星星 (每3次起立获得一颗星)
  const starCount = Math.floor(appState.standCount / 3);
  
  // 添加星星
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('span');
    star.textContent = '⭐';
    star.style.marginRight = '2px';
    starsContainer.appendChild(star);
  }
}

// 更新角色状态
function updateCharacter() {
  const character = document.getElementById('character');
  const message = document.getElementById('character-message');
  
  if (appState.isOnBreak) {
    character.className = 'character standing';
    character.innerHTML = '🚶‍♀️';
    
    // 随机选择一条站立消息
    const randomMessage = characterMessages.standing[Math.floor(Math.random() * characterMessages.standing.length)];
    message.textContent = randomMessage;
  } else {
    character.className = 'character sitting';
    character.innerHTML = '🧘‍♀️';
    
    // 随机选择一条坐着的消息
    const randomMessage = characterMessages.sitting[Math.floor(Math.random() * characterMessages.sitting.length)];
    message.textContent = randomMessage;
  }
}

// 随机显示一条健康小贴士
function showRandomTip() {
  const tipText = document.querySelector('.tip-text');
  const randomTip = tipsArray[Math.floor(Math.random() * tipsArray.length)];
  tipText.textContent = randomTip;
}

// 处理"我已起立走动"按钮点击
function handleStandButtonClick() {
  // 防止重复点击
  const button = document.getElementById('stand-up-btn');
  button.disabled = true;
  
  if (appState.isOnBreak) {
    // 结束休息，开始新的工作周期
    appState.isOnBreak = false;
    appState.sittingStartTime = new Date();
    appState.nextBreakTime = new Date(
      appState.sittingStartTime.getTime() + 
      appState.settings.reminderInterval * 60 * 1000
    );
  } else {
    // 开始休息
    appState.isOnBreak = true;
    appState.standCount++;
    
    // 创建撒花效果
    createConfetti();
  }
  
  // 更新UI
  updateUI();
  
  // 更新角色状态
  updateCharacter();
  
  // 保存状态
  chrome.storage.local.set({ 
    state: {
      sittingStartTime: appState.sittingStartTime.toString(),
      nextBreakTime: appState.nextBreakTime.toString(),
      standCount: appState.standCount,
      isOnBreak: appState.isOnBreak,
      date: appState.date
    } 
  });
  
  // 一段时间后恢复按钮
  setTimeout(() => {
    button.disabled = false;
  }, 300);
}

// 创建撒花效果
function createConfetti() {
  const confettiContainer = document.getElementById('confetti-container');
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
  
  // 清除之前的撒花
  confettiContainer.innerHTML = '';
  
  // 创建50个撒花元素
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // 随机位置
    const left = Math.random() * 100;
    
    // 随机颜色
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // 随机大小
    const size = Math.random() * 8 + 4;
    
    // 随机动画持续时间
    const duration = Math.random() * 2 + 1;
    
    // 随机形状 (圆形或正方形)
    const isSquare = Math.random() > 0.5;
    
    confetti.style.left = `${left}%`;
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    confetti.style.backgroundColor = color;
    confetti.style.borderRadius = isSquare ? '2px' : '50%';
    confetti.style.animationDuration = `${duration}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    
    confettiContainer.appendChild(confetti);
  }
  
  // 3秒后清除撒花元素
  setTimeout(() => {
    confettiContainer.innerHTML = '';
  }, 3000);
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

// 当页面关闭时清理资源
window.addEventListener('unload', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
}); 