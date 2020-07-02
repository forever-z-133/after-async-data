(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    exports.__esModule = true;
    /**
     * 在获得某结果前进行排队，等获取结果后再运行
     *
     * 比如，同时调取多个接口，那么在写公共请求时直接全部函数前加上 getToken(token => {}) 即可在拿到 token 后才运行那些接口
     * 再比如，有个需要预加载的资源，但资源加载完成和使用资源的时机不太好把握，也可用此方法，等加载完后自然会走回调
     *
     * 但需注意，如果你的请求类把成功失败回调分开了，那最好加上 _removeQueue(type);
     * 也因为本程序只有一个回调出口的问题，外层 showLoading 可能走向错误回调而忘记被关闭。
     */
    var AfterAsyncData = /** @class */ (function () {
        function AfterAsyncData() {
            this.ajaxMap = {};
            this.queueList = [];
            this.dataMap = {};
            this.loadingMap = {};
        }
        AfterAsyncData.getInstance = function () {
            return this.instance;
        };
        AfterAsyncData.prototype.add = function (type, func) {
            this.ajaxMap[type] = func;
        };
        AfterAsyncData.prototype.remove = function (type, onlyRemoveCache) {
            if (onlyRemoveCache === void 0) { onlyRemoveCache = false; }
            delete this.dataMap[type];
            delete this.loadingMap[type];
            this._removeQueue(type, false);
            if (!onlyRemoveCache) {
                delete this.ajaxMap[type];
            }
        };
        AfterAsyncData.prototype.get = function (type, callback, params) {
            var _this = this;
            // 若已获得数据，则返回
            var cache = this.dataMap[type];
            if (cache !== undefined) {
                callback && callback(cache, true);
                return;
            }
            // 若未获得数据，但正在请求中，则加入队列等待请求结束
            var loading = this.loadingMap[type];
            if (loading) {
                this.queueList.push({ type: type, callback: callback });
                return;
            }
            // 若既没有数据，也没有等待中，即需要请求数据咯
            this.loadingMap[type] = true;
            this.queueList.push({ type: type, callback: callback });
            this._ajax(type, function (result) {
                _this._ajaxFinish(type, result);
            }, params);
        };
        // 请求数据的集中管道
        AfterAsyncData.prototype._ajax = function (type, finish, params) {
            var func = this.ajaxMap[type];
            func(params, finish);
        };
        // 某个数据类完成的回调
        AfterAsyncData.prototype._ajaxFinish = function (type, result) {
            this.loadingMap[type] = false;
            // 情况并运行掉相应队列项
            this._removeQueue(type, true, result);
        };
        // 清掉某数据类的相关队列
        AfterAsyncData.prototype._removeQueue = function (type, trigger, result) {
            var _this = this;
            if (trigger === void 0) { trigger = false; }
            this.queueList = this.queueList.filter(function (item) {
                if (item.type === type && trigger) {
                    _this._triggerQueueItem(type, item, result);
                }
                else
                    true;
            });
        };
        // 运行某个等待项，且写入缓存
        AfterAsyncData.prototype._triggerQueueItem = function (type, item, result) {
            var isCache = type in this.dataMap;
            var callback = item.callback;
            callback && callback(result, isCache);
            if (!isCache)
                this.dataMap[type] = result;
        };
        AfterAsyncData.instance = new AfterAsyncData();
        return AfterAsyncData;
    }());
    exports["default"] = AfterAsyncData;
});
