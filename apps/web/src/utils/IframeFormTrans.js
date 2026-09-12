/**
 * 引用模式iframe表单传输使用
 * wflow表单的引用模式需要与外部url表单进行双向交互
 */

// 生成唯一ID用于函数调用
const generateId = () => Math.random().toString(36).substring(2, 10);


export function createWflowFormTrans(options = {}) {
  const iframeTrans = createIframeTrans(options)
  //父页面向子页面设置值和权限，子页面实现这俩函数
  if (options.onChangeFormData) iframeTrans.registerFunction('onChangeFormData', options.onChangeFormData);
  if (options.onChangeFormPerm) iframeTrans.registerFunction('onChangeFormPerm', options.onChangeFormPerm);
  //上报表单数据，父页面实现
  if (options.onReportFormData) iframeTrans.registerFunction('reportFormData', options.onReportFormData);
  //注册回调表单校验和字段获取函数，父页面调用子页面
  if (!options.isParent) {
    if (!options.validate) throw new Error('请提供validate表单校验函数')
    if (!options.validate) throw new Error('请提供getFields字段获取函数')
    iframeTrans.registerFunction('validate', options.validate);
    iframeTrans.registerFunction('getFields', options.getFields);
  } else {
    iframeTrans.setFormData = (data) => iframeTrans.callRemoteFunction('onChangeFormData', data)
    iframeTrans.setFormPerm = (data) => iframeTrans.callRemoteFunction('onChangeFormPerm', data)
  }
  const reportFormData = (data) => iframeTrans.callRemoteFunction('reportFormData', data)
  iframeTrans.getFields = () => iframeTrans.callRemoteFunction('getFields')
  iframeTrans.validate = () => iframeTrans.callRemoteFunction('validate')
  return {iframeTrans, reportFormData}
}

/**
 * 创建iframe通信实例
 * @param {Object} options 配置选项
 * @param {boolean} [options.isParent=false] 是否为父页面
 * @param {HTMLIFrameElement|null|function} [options.el=null] iframe元素引用或获取函数
 * @param {string} [options.targetOrigin='*'] 目标源
 * @param {string[]} [options.allowedOrigins=['*']] 允许的来源
 * @param {function} [options.onData] 数据接收回调（非Vue项目使用）
 */
export function createIframeTrans(options = {}) {
  // 配置处理，设置默认值
  const {
    isParent = false,
    el = null,
    targetOrigin = '*',
    allowedOrigins = ['*'],
    onData = null
  } = options;
  // 存储接收到的数据
  let dataStore = {};
  // 存储可被调用的函数
  const functions = {};
  // 存储等待响应的函数调用
  const pendingCalls = {};
  // 数据变更监听器（用于Vue响应式）
  const dataListeners = new Set();
  // 验证消息来源是否允许
  const isOriginAllowed = (origin) => {
    if (allowedOrigins.includes('*')) return true;
    return allowedOrigins.includes(origin);
  };
  // 获取iframe元素（支持ref函数或直接引用）
  const getIframeElement = () => {
    if (typeof el === 'function') {
      return el();
    }
    return el;
  };
  // 基础发送消息方法
  const sendMessage = (message, target) => {
    try {
      // 确定目标窗口
      let targetWindow = target;
      if (isParent && !targetWindow) {
        const iframe = getIframeElement();
        targetWindow = iframe?.contentWindow || null;
      } else if (!isParent && !targetWindow) {
        targetWindow = window.parent;
      }
      if (!targetWindow) {
        console.warn('无法确定目标窗口，消息发送失败');
        return false;
      }
      // 添加发送方标识
      message.from = isParent ? 'parent' : 'child';
      // 发送消息
      targetWindow.postMessage(message, targetOrigin);
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  };
  // 发送数据
  const sendData = (key, value) => {
    const message = {
      type: 'data',
      key,
      value
    };
    return sendMessage(message);
  };

  // 注册可供调用的函数
  const registerFunction = (name, callback) => {
    if (typeof callback === 'function') {
      functions[name] = callback;
      return true;
    }
    console.error('注册的函数必须是一个函数');
    return false;
  };

  // 注销函数
  const unregisterFunction = (name) => {
    if (functions[name]) {
      delete functions[name];
      return true;
    }
    return false;
  };

  // 调用远程函数
  const callRemoteFunction = (functionName, ...args) => {
    return new Promise((resolve, reject) => {
      const id = generateId();
      // 存储等待响应的回调
      pendingCalls[id] = (result, error) => {
        delete pendingCalls[id];
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      };

      // 发送函数调用消息
      const message = {
        type: 'functionCall',
        id,
        functionName,
        args
      };

      const success = sendMessage(message);
      if (!success) {
        delete pendingCalls[id];
        reject(new Error('发送函数调用消息失败'));
        return;
      }

      // 设置超时
      setTimeout(() => {
        if (pendingCalls[id]) {
          const error = new Error(`调用 ${functionName} 超时`);
          pendingCalls[id](null, error);
        }
      }, 5000); // 5秒超时
    });
  };

  // 处理接收到的消息
  const handleMessage = async (event) => {
    // 验证来源
    if (!isOriginAllowed(event.origin)) {
      console.warn('收到来自未授权来源的消息:', event.origin);
      return;
    }
    const message = event.data;
    // 过滤掉自己发送的消息
    if (message.from === (isParent ? 'parent' : 'child')) {
      return;
    }
    switch (message.type) {
      case 'data':
        // 处理数据消息
        dataStore[message.key] = message.value;
        // 触发数据变更回调
        if (typeof onData === 'function') {
          onData(message.key, message.value, dataStore);
        }
        // 通知Vue响应式监听器
        dataListeners.forEach(listener => listener(message.key, message.value, dataStore));
        break;
      case 'functionCall':
        // 处理函数调用
        if (message.id) {
          try {
            const func = functions[message.functionName];
            if (func) {
              const result = await func(...(message.args || []));
              // 发送函数调用结果
              const response = {
                type: 'functionResponse',
                id: message.id,
                result
              };
              sendMessage(response, event.source);
            } else {
              // 函数不存在
              const response = {
                type: 'functionResponse',
                id: message.id,
                error: `函数 ${message.functionName} 不存在`
              };
              sendMessage(response, event.source);
            }
          } catch (error) {
            // 函数执行出错
            const response = {
              type: 'functionResponse',
              id: message.id,
              error: error instanceof Error ? error.message : String(error)
            };
            sendMessage(response, event.source);
          }
        }
        break;
      case 'functionResponse':
        // 处理函数调用响应
        if (message.id && pendingCalls[message.id]) {
          if (message.error) {
            pendingCalls[message.id](null, new Error(message.error));
          } else {
            pendingCalls[message.id](message.result);
          }
        }
        break;
    }
  };

  // 启动监听
  const start = () => {
    window.addEventListener('message', handleMessage);
  };

  // 停止监听
  const stop = () => {
    window.removeEventListener('message', handleMessage);
    // 清空 pending calls
    for (const id in pendingCalls) {
      pendingCalls[id](null, new Error('通信已停止'));
    }
    dataStore = {};
  };

  // 供Vue使用的响应式数据处理
  const watchData = (callback) => {
    dataListeners.add(callback);
    return () => {
      dataListeners.delete(callback);
    };
  };

  // 初始化时自动启动
  start();

  return {
    // 核心功能
    sendData,
    registerFunction,
    unregisterFunction,
    callRemoteFunction,
    start,
    stop,
    // 数据相关
    getData: (key) => key ? dataStore[key] : { ...dataStore },
    clearData: () => { dataStore = {}; },
    // 供Vue集成使用
    watchData
  };
}
