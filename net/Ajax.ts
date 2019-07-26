import {Loading, Toast} from '../ui';

import { HttpErrorHandlers, fireErrorHandler, mergeErrorHandlers } from './ErrorHandler'

interface AajxHookEventMap{
    before: (url: string, data: any, headers: Object) => boolean
    success: (url: string, req: any) => void
    error: (url: string, err: Object) => void
    complete: (url: string) => void
}

export type AjaxHookType = keyof AajxHookEventMap

export interface AjaxConfig {
    loading?: Loading|false
    loadingText?: string
    toast?: Toast|false
    errorHandler?: HttpErrorHandlers
    timeout?: number
    lock?: boolean
}

export interface AjaxOptions extends AjaxConfig {
    headers?: {[key: string]: string}
    lockToken?: string
}

export function Curl(API: string){
    return function curl(url: string, {
        method = 'POST', headers = {}, data, timeout = 0
    }: {
        method?:'POST'|'GET', headers?: {[key:string]: string}, data?: any, timeout?:number
    } = {}): Promise<wx.RequestSuccessCallbackResult>{
        if(API&&!url.startsWith('http')){
            url = API + url;
        }

        return new Promise((r, j)=>{
            const token = Date.now() + '_' + Math.round(Math.random()*10000);
            const timeoutError = new Error('timeout');

            if(timeout) setTimeout(j, timeout, timeoutError);

            console.warn('token:', token, 'request:', url, 'methods:', method, 'data:', data);
            wx.request({
                url, method, header: headers, dataType: 'json', data,
                success(res){
                    console.warn('token:', token, 'request success:', url, res);
                    r(res);
                },
                fail(res){
                    console.warn('token:', token, 'request fail:', url, res);

                    if(res.errMsg.includes('time')||res.errMsg.includes('超时')){
                        j(timeoutError);
                    }else{
                        j(new Error(res.errMsg));
                    }
                }
            })
        });
    }
}


export default function Ajax(API: string){
    const globalOptions: AjaxConfig = {
        loading: false,
        loadingText: '加载中...',
        toast: false,
        timeout: 8000,
        lock: false,
        errorHandler: {
            net:'网络错误<br>请检查您的网络连接或稍候重试',
            logic:{},
            http:{
                'default':'网络错误'
            },
            timeout:'网络质量不佳<br>请稍候重试'
        }
    }

    const hooks: {[key in AjaxHookType]: AajxHookEventMap[key][]} = {
        before: [],
        complete: [],
        success: [],
        error: []
    };

    function config({
        loading, loadingText, toast, errorHandler, timeout, lock
    }: AjaxConfig) {
        if(loading!==undefined) globalOptions.loading = loading;
        if(loadingText!==undefined) globalOptions.loadingText = loadingText;
        if(toast!==undefined) globalOptions.toast = toast;
        if(timeout!==undefined) globalOptions.timeout = timeout;
        if(lock!==undefined) globalOptions.lock = lock;
        if(errorHandler) globalOptions.errorHandler = mergeErrorHandlers(
            globalOptions.errorHandler, errorHandler
        );
    }

    function addHook<K extends AjaxHookType>(type: K, hook: AajxHookEventMap[K]|AajxHookEventMap[K][]): void
    function addHook(type: AjaxHookType, hook){
        if(Array.isArray(hook)){
            hooks[type].push(...hook);
        }else{
            hooks[type].push(hook);
        }
    }

    function use(obj: {
        config?:AjaxConfig, 
        hooks?: {[key in AjaxHookType]?: AajxHookEventMap[key]|AajxHookEventMap[key][]}
    }){
        if(obj.config) config(obj.config);
        if(obj.hooks){
            if(obj.hooks.before) addHook('before', obj.hooks.before);
            if(obj.hooks.complete) addHook('complete', obj.hooks.complete);
            if(obj.hooks.success) addHook('success', obj.hooks.success);
            if(obj.hooks.before) addHook('before', obj.hooks.before);
        }
    }

    const curl = Curl(API);

    const lockSet: {[key: string]: boolean} = {};

    function post<T extends { code: number } = { code: number }>(url: string, data: any = {}, opt: AjaxOptions = {}): Promise<T>{
        const errorHandler = mergeErrorHandlers(globalOptions.errorHandler, opt.errorHandler);
        opt = Object.assign({}, globalOptions, opt);
        if(!opt.lockToken) opt.lockToken = url;
        if(!opt.headers) opt.headers = {};

        let hasSideEffect = false;
        //重置清空异步效果
        function resetSideEffect() {
            if (hasSideEffect){
                opt.lock && delete lockSet[opt.lockToken];
                opt.loading && opt.loading.close();
                hasSideEffect = false;
            }
        }
        //初始化异步效果
        function setSideEffect() {
            if (!hasSideEffect){
                hasSideEffect = true;
                opt.loading && opt.loading.open(opt.loadingText);
                opt.lock && (lockSet[opt.lockToken] = true);
            }
        }
        function fireError(e){
            for(let hook of hooks.error){
                hook(url, e);
            }
        }
        function fireComplete(){
            for(let hook of hooks.complete){
                hook(url);
            }
        }
        function fireSuccess(req){
            for(let hook of hooks.success){
                hook(url, req);
            }
        }

        if(opt.lock&&lockSet[opt.lockToken]){
            const err = {
                type: 'custom', detail: 'lock', url
            };
            fireError(err);
            fireComplete();
            return Promise.reject(err);
        }

        for(let hook of hooks.before){
            if(!hook(url, data, opt.headers)){
                const err = {
                    type: 'custom', url, hook,
                    detail: 'before hook return false'
                };
                fireError(err);
                fireComplete();
                return Promise.reject(err);
            }
        }

        setSideEffect();

        return curl(url, {
            data, timeout: opt.timeout,
            headers: Object.assign(opt.headers, {
                "Content-Type" : "application/JSON; charset=UTF-8" 
            })
        }).catch(e=>{
            if(e&&e.message==='timeout'){
                return Promise.reject({ type : 'timeout', url });
            }
            return Promise.reject({ type : 'net', url, error : e })
        }).then(response=>{
            if(response.statusCode>=200&&response.statusCode<300){
                return response.data;
            }
            return Promise.reject({
                type: 'http',
                status: response.statusCode,
                url
            });
        }).then<T>((json: T)=>{
            if('code' in json && json.code < 0) return Promise.reject({
                type: 'logic', url, code: json.code, detail: json
            });

            fireSuccess(json);
            fireComplete();
            resetSideEffect();
            return json;
        }).catch(e=>{
            resetSideEffect();
            fireError(e);
            fireComplete();

            switch(e.type){
                case 'http':
                    fireErrorHandler(errorHandler.http[e.status]||errorHandler.http.default, opt.toast, e);
                    break;
                case 'logic':
                    fireErrorHandler(errorHandler.logic[e.code]||errorHandler.logic.default, opt.toast, e);
                    break;
                default:
                    fireErrorHandler(errorHandler[e.type], opt.toast, e);
            }
            return Promise.reject(e);
        })
    }

    function postSilence<T extends { code: number } = { code: number }>(url: string, data: Object = {}, opt: AjaxOptions = {}): Promise<T>{
        return post<T>(url, data, Object.assign({
            lock: false,
            loading: false,
            toast: false
        }, opt));
    }

    return {
        post, postSilence, use, config, addHook
    }
}