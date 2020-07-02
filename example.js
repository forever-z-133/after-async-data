/// 运行 node example.js 这样用
/// 如果是 vue-cli 等环境，则可用 import 引入而不需要 default
const AfterAsyncData = require('./index');
const waitQueue = new AfterAsyncData.default.getInstance();

// 伪·业务代码
const getToken = (uid, next) => setTimeout(() => next("token"), 500);
var ajax = (params, success, fail) => setTimeout(() => success(params), 500);
const getUserInfo = (callback) => ajax(null, callback);
const getIndexData = (callback) => ajax(null, callback);

// 先注册前置函数
waitQueue.add("get token before ajax", getToken, 'uid');
// 包装原方法，把原逻辑置于获取结果之后
const _ajax = ajax;
var ajax = (params, success, fail) => {
  waitQueue.get("get token before ajax", (token, isCache) => {
    console.log(token, isCache);
    _ajax(params, success, fail);
  });
}

// 再调用业务代码时，会等到获取 token 后才运行
getUserInfo(() => console.log('userInfo'));
getIndexData(() => console.log('indexData'));