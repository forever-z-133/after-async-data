/// 等待队列项的约定
interface AfterAsyncDataWaitItem {
  type: string;
  callback?: AfterAjaxCallback;
}

/// 前置函数的出入参约定
type AjaxMethod = (params: any, finish: AfterAjaxCallback) => any;

/// 前置函数获取到数据后的回调
type AfterAjaxCallback = (result: any, isCache: boolean) => any;

/**
 * 在获得某结果前进行排队，等获取结果后再运行
 *
 * 比如，同时调取多个接口，那么在写公共请求时直接全部函数前加上 getToken(token => {}) 即可在拿到 token 后才运行那些接口
 * 再比如，有个需要预加载的资源，但资源加载完成和使用资源的时机不太好把握，也可用此方法，等加载完后自然会走回调
 *
 * 但需注意，如果你的请求类把成功失败回调分开了，那最好加上 _removeQueue(type);
 * 也因为本程序只有一个回调出口的问题，外层 showLoading 可能走向错误回调而忘记被关闭。
 */
export default class AfterAsyncData {
  ajaxMap: any = {};
  queueList: AfterAsyncDataWaitItem[] = [];
  dataMap: any = {};
  loadingMap: any = {};

  private static instance: AfterAsyncData = new AfterAsyncData();
  static getInstance() {
    return this.instance;
  }

  add(type: string, func: AjaxMethod) {
    this.ajaxMap[type] = func;
  }

  remove(type: string, onlyRemoveCache = false) {
    delete this.dataMap[type];
    delete this.loadingMap[type];
    this._removeQueue(type, false);
    if (!onlyRemoveCache) {
      delete this.ajaxMap[type];
    }
  }

  get(type: string, callback?: AfterAjaxCallback, params?: any) {
    // 若已获得数据，则返回
    const cache: any = this.dataMap[type];
    if (cache !== undefined) {
      callback && callback(cache, true);
      return;
    }
    // 若未获得数据，但正在请求中，则加入队列等待请求结束
    const loading: boolean = this.loadingMap[type];
    if (loading) {
      this.queueList.push({ type, callback });
      return;
    }
    // 若既没有数据，也没有等待中，即需要请求数据咯
    this.loadingMap[type] = true;
    this.queueList.push({ type, callback });
    this._ajax(
      type,
      (result: any) => {
        this._ajaxFinish(type, result);
      },
      params
    );
  }

  // 请求数据的集中管道
  _ajax(type: string, finish: AfterAjaxCallback, params?: any) {
    const func: AjaxMethod = this.ajaxMap[type];
    func(params, finish);
  }

  // 某个数据类完成的回调
  _ajaxFinish(type: string, result: any) {
    this.loadingMap[type] = false;
    // 情况并运行掉相应队列项
    this._removeQueue(type, true, result);
  }

  // 清掉某数据类的相关队列
  _removeQueue(type: string, trigger = false, result?: any) {
    this.queueList = this.queueList.filter((item: AfterAsyncDataWaitItem) => {
      if (item.type === type && trigger) {
        this._triggerQueueItem(type, item, result);
      } else true;
    });
  }

  // 运行某个等待项，且写入缓存
  _triggerQueueItem(type: string, item: AfterAsyncDataWaitItem, result?: any) {
    const isCache: boolean = type in this.dataMap;
    const callback: AfterAjaxCallback = item.callback;
    callback && callback(result, isCache);
    if (!isCache) this.dataMap[type] = result;
  }
}
