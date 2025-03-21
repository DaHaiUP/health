// 默认设置
const DEFAULT_SETTINGS = {
  reminderInterval: 30, // 默认30分钟提醒一次
  breakDuration: 5      // 默认建议休息5分钟
};

// 设置基本的错误处理
console.error = function(error) {
  console.log('健康小助手错误:', error);
};

// 初始化 - 异步处理减少阻塞
chrome.runtime.onInstalled.addListener(() => {
  console.log('健康小助手已安装/更新');
  // 延迟初始化，减少启动时的阻塞
  setTimeout(initializeExtension, 1000);
});

// 主要初始化函数
function initializeExtension() {
  // 初始化存储
  chrome.storage.local.get(['settings', 'state'], (data) => {
    try {
      // 如果没有设置，使用默认设置
      if (!data.settings) {
        chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      }
      
      // 如果没有状态或者是新的一天，初始化状态
      const today = new Date().toDateString();
      if (!data.state || data.state.date !== today) {
        const now = new Date();
        const state = {
          sittingStartTime: now.toString(),
          nextBreakTime: new Date(now.getTime() + DEFAULT_SETTINGS.reminderInterval * 60 * 1000).toString(),
          standCount: 0,
          isOnBreak: false,
          date: today
        };
        chrome.storage.local.set({ state });
      }
      
      // 创建提醒检查的定时任务
      setupReminderAlarm();
    } catch (e) {
      console.error('初始化错误: ' + e.message);
    }
  });
}

// 设置提醒检查的定时任务
function setupReminderAlarm() {
  // 删除旧的定时任务（如果有）
  chrome.alarms.clear('reminderCheck', () => {
    // 每分钟检查一次
    chrome.alarms.create('reminderCheck', {
      periodInMinutes: 1
    });
  });
}

// 监听定时任务
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reminderCheck') {
    checkReminder();
  }
});

// 检查是否需要提醒
function checkReminder() {
  chrome.storage.local.get(['state', 'settings'], (data) => {
    try {
      if (!data.state || !data.state.nextBreakTime) return;
      
      const now = new Date();
      const nextBreakTime = new Date(data.state.nextBreakTime);
      
      // 如果已到提醒时间且不在休息状态
      if (now >= nextBreakTime && !data.state.isOnBreak) {
        showNotification(data.settings);
      }
    } catch (e) {
      console.error('检查提醒错误: ' + e.message);
    }
  });
}

// 显示通知
function showNotification(settings) {
  const reminderInterval = settings?.reminderInterval || DEFAULT_SETTINGS.reminderInterval;
  const breakDuration = settings?.breakDuration || DEFAULT_SETTINGS.breakDuration;
  
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      title: '该起来活动一下了！',
      message: `您已久坐${reminderInterval}分钟，建议站起来走动${breakDuration}分钟。`,
      buttons: [
        { title: '我已起立' },
        { title: '稍后提醒' }
      ],
      priority: 2
    });
  } catch (e) {
    console.error('创建通知错误: ' + e.message);
    // 使用更简单的通知
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        title: '该起来活动一下了！',
        message: `您已久坐${reminderInterval}分钟，建议站起来走动。`,
        priority: 2
      });
    } catch (innerError) {
      console.error('创建简单通知错误: ' + innerError.message);
    }
  }
}

// 监听通知按钮点击
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // 用户点击"我已起立"
    handleStandUp();
  } else {
    // 用户点击"稍后提醒"
    snoozeReminder();
  }
  
  // 关闭通知
  chrome.notifications.clear(notificationId);
});

// 处理用户起立
function handleStandUp() {
  chrome.storage.local.get(['state'], (data) => {
    try {
      const state = data.state || {};
      
      // 更新状态
      state.isOnBreak = true;
      state.standCount = (state.standCount || 0) + 1;
      
      chrome.storage.local.set({ state });
    } catch (e) {
      console.error('处理起立错误: ' + e.message);
    }
  });
}

// 稍后提醒
function snoozeReminder() {
  chrome.storage.local.get(['state'], (data) => {
    try {
      const state = data.state || {};
      const now = new Date();
      
      // 5分钟后再次提醒
      state.nextBreakTime = new Date(now.getTime() + 5 * 60 * 1000).toString();
      
      chrome.storage.local.set({ state });
    } catch (e) {
      console.error('稍后提醒错误: ' + e.message);
    }
  });
}

// 监听来自内容脚本或弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理打开侧边栏的请求
  if (message.action === 'openSidebar') {
    try {
      if (chrome.sidePanel) {
        chrome.sidePanel.open();
      }
      sendResponse({ success: true });
    } catch (e) {
      console.error('打开侧边栏错误: ' + e.message);
      sendResponse({ success: false, error: e.message });
    }
    return true; // 保持消息通道打开
  }
  
  // 处理显示通知的请求
  if (message.action === 'showNotification') {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        title: message.title || '健康小助手提醒',
        message: message.message || '该起来活动一下了！',
        buttons: [
          { title: '我已起立' },
          { title: '稍后提醒' }
        ],
        priority: 2
      });
      sendResponse({ success: true });
    } catch (e) {
      console.error('显示通知错误: ' + e.message);
      
      try {
        // 尝试更简单的通知
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          title: message.title || '健康小助手提醒',
          message: message.message || '该起来活动一下了！',
          priority: 2
        });
        sendResponse({ success: true });
      } catch (innerError) {
        console.error('显示简单通知错误: ' + innerError.message);
        sendResponse({ success: false, error: innerError.message });
      }
    }
    return true; // 保持消息通道打开
  }
  
  // 对于其他消息，返回false
  return false;
}); 