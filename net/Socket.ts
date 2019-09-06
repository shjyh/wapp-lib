import {Loading, Toast} from '../ui';
import EventEmitter from '../EventEmitter';
import ReconnectWebSocket from './ReconnectWebSocket'
import { NetErrorHandlers, mergeErrorHandlers, fireErrorHandler } from './ErrorHandler';

export type SocketFrameType = 'publish'|'subscribe'|'response'|'request'|'cancel'

export interface SocketFrame {
    event: SocketFrameType
    channel?: string
    mid: string
    data?: any
    timestamp?: number
};

export interface WrapperSocketFrame {
    [key: string]: SocketFrame
}

function genMessageId(): string{
    return `${Date.now()}_${Math.round(Math.random()*10000)}`;
}

type EventType = 'reconnect'|'message'|'publish';

export interface SocketRequestOptions {
    timeout?: number
    loadingText?: string
    loading?: Loading|false
    toast?: Toast|false
    errorHandler?: NetErrorHandlers
}

export interface SocketOptions extends SocketRequestOptions {
    protocols?: string|string[]
    wrapper?: string
    cancelChannel?: string
}

type SocketDataCallback<T = any> = (data: T)=>void;

export default class Socket extends EventEmitter<EventType>{
    private options: SocketRequestOptions = {
        timeout: 8000,
        loading: false,
        loadingText:'加载中...',
        toast:false,
        errorHandler: {
            net:'网络错误<br>请检查您的网络连接或稍候重试',
            logic: {},
            timeout:'网络质量不佳<br>请稍候重试'
        }
    }

    private rws: ReconnectWebSocket
    private wrapperRequestKey: string
    private wrapperResponseKey: string
    private cancelChannel: string = ''

    /**
     * 记录channel和mid对应关系，一个channel只有最后一次mid有效
     * 在subscribe时可以unsubscribe上次subscribe
     * 在publish事件中校对mid，确保旧unsubscribe未成功时过滤
     */
    private midMap: {[key: string]: string} = {};
    private midCb: {[key: string]: SocketDataCallback} = {}

    /**@description 用于request的内部事件接收触发 */
    private requestEmitter = new EventEmitter();

    constructor(url: string|(()=>string), options: SocketOptions = {}){
        super();
        
        this.rws = new ReconnectWebSocket(url, options.protocols);
        if(options.errorHandler) 
            this.options.errorHandler = mergeErrorHandlers(this.options.errorHandler, options.errorHandler);
        if(options.wrapper){
            this.wrapperRequestKey = options.wrapper + 'Request';
            this.wrapperResponseKey = options.wrapper + 'Response';
        }
        this.cancelChannel = options.cancelChannel||'';

        delete options.protocols;
        delete options.errorHandler;
        delete options.wrapper;
        delete options.cancelChannel;
        Object.assign(this.options, options);

        this.rws.on('reconnect', ()=>{
            this.trigger('reconnect');
        });
        this.rws.on('message', (e: {data: SocketFrame|WrapperSocketFrame})=>{
            const frame = this.parseReceiveFrame(e.data);
            this.trigger('message', frame);
            switch(frame.event){
                case 'publish':
                    const cb = this.midCb[frame.mid];
                    cb&&cb(frame.data);

                    const channelMid = this.midMap[frame.channel];
                    // 若没有channelMid，则为后台主动推送消息，需要处理
                    if(channelMid&&channelMid!==frame.mid) return;
                    this.trigger('publish', frame);
                    this.trigger('publish.' + frame.channel, frame.data);
                    return;
                case 'response':
                    this.requestEmitter.trigger(`response.${frame.channel}.${frame.mid}`, frame.data);
                    return;
            }
        });
    }

    onSubscribe<T = any>(channel: string, cb: SocketDataCallback<T>){
        this.on('publish.' + channel, cb);
    }
    offSubscribe<T = any>(channel: string, cb: SocketDataCallback<T>){
        this.off('publish.' + channel, cb);
    }
    onceSubscribe<T = any>(channel: string, cb: SocketDataCallback<T>){
        this.once('publish.' + channel, cb);
    }

    private createSendFrame(frame: SocketFrame): WrapperSocketFrame|SocketFrame{
        if(this.wrapperRequestKey){
            return {
                [this.wrapperRequestKey]: frame
            }
        }
        return frame;
    }
    private parseReceiveFrame(frame: WrapperSocketFrame|SocketFrame): SocketFrame{
        if(this.wrapperResponseKey) 
            return (<WrapperSocketFrame>frame)[this.wrapperResponseKey];
        return <SocketFrame>frame;
    }
    close(code?: number, reason?: string){
        this.rws.close(code, reason);
        this.destory();
        this.requestEmitter.destory();
    }
    pauseSend(){
        this.rws.pauseSend();
    }
    resumeSend(){
        this.rws.resumeSend();
    }
    unsubscribe(channel: string){
        const mid = this.midMap[channel];
        if(mid){
            delete this.midCb[mid];
            delete this.midMap[channel];
            this.rws.send(
                this.createSendFrame({
                    event: 'cancel',
                    channel: this.cancelChannel||'cancel-message',
                    mid
                })
            );
        }
    }
    subscribe<T = any>(channel: string, data?: any, cb?: SocketDataCallback<T>){
        this.unsubscribe(channel);

        const mid = genMessageId();
        this.midMap[channel] = mid;
        if(cb) this.midCb[mid] = cb;

        this.rws.send(
            this.createSendFrame({
                event: 'subscribe',
                channel,
                data,
                mid
            })
        );
    }
    request<T = any>(channel: string, data?: any, options: SocketRequestOptions = {}): Promise<T>{
        const {
            loading, loadingText, toast, timeout
        } = Object.assign({}, this.options, options);
        const errorHandler = mergeErrorHandlers(this.options.errorHandler, options.errorHandler);

        const mid = genMessageId();

        if(this.rws.send(this.createSendFrame({
            event: 'request', channel, mid, data
        }))){
            loading&&loading.open(loadingText);
            const requestEmitter = this.requestEmitter;
            const rws = this.rws;

            return new Promise<T>((resolve, reject)=>{
                const responseEventType = `response.${channel}.${mid}`;
                // timeout token
                let t = 0;
                
                function responseHandler(data: T){
                    loading && loading.close();
                    clearHandler();
                    if(('code' in data) && (data as any).code<0) {
                        fireErrorHandler(
                            (errorHandler.logic[(data as any).code])||
                            (errorHandler.logic.default),
                            toast, data
                        )
                        reject({type:'logic', data});
                    }else resolve(data);
                }
                function offlineHandler(){
                    loading && loading.close();
                    clearHandler();
                    fireErrorHandler(errorHandler.net, toast);
                    reject({type:'net',code:-100,msg:'Network interruption'}) //网络中断
                }
                function clearHandler(){
                    requestEmitter.off(responseEventType, responseHandler);
                    rws.off('offline', offlineHandler)
                    clearTimeout(t);
                }

                requestEmitter.on(responseEventType, responseHandler);
                rws.on('offline', offlineHandler);

                if(timeout){
                    t = setTimeout(()=>{
                        loading&&loading.close();
                        clearHandler();
                        fireErrorHandler(errorHandler.timeout);
                        reject({type:'timeout'})
                    }, timeout)
                }
            });
        }else{
            //无网络
            fireErrorHandler(errorHandler.net, toast);
            return Promise.reject({
                type: 'net', code:-1, msg: 'network blocked'
            })
        }
    }
}
