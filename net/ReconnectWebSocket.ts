import EventEmitter from '../EventEmitter';
import WebSocket from './WebSocket';
import net from './net';
import { JSONStringify as stringify } from '../utils';

const eventCollection = ['open','close','error','message'];

type EventType = 'open'|'close'|'error'|'message'|'reconnect'|'reconnected'|'online'|'offline';

function transSendData(d: string|ArrayBuffer|Object): string|ArrayBuffer{
    if(
        typeof d!=='string' &&
        (typeof ArrayBuffer !== 'undefined' && !(d instanceof ArrayBuffer))
    ){
        return stringify(d);
    }
    return <string|ArrayBuffer>d;
}

export default class ReconnectWebSocket extends EventEmitter<EventType>{
    private closed = false
    private reopen = false;
    private reconnect_t = 0;

    private wsUrl: string|(()=>string) = ''
    private wsProtocol: string|string[] = ''
    private isPause = false
    private sendList: (string|ArrayBuffer|Object)[] = []

    private ws: WebSocket = null

    private createWebSocket(){
        const realUrl = typeof this.wsUrl === 'string' ? this.wsUrl : this.wsUrl();
        if(this.wsProtocol){
            this.ws = new WebSocket(realUrl, this.wsProtocol);
        }else{
            this.ws = new WebSocket(realUrl);
        }
        
    }
    private $reconnect(){
        this.trigger('reconnect');
        for(let e of eventCollection){
            this.ws.removeEventListener(e, this);
        }
        this.createWebSocket();
        for(let e of eventCollection){
            this.ws.addEventListener(e, this);
        }
    }
    private reconnect(now: boolean = false): boolean{
        if(
            net.onLine&&!this.closed&&
            ([2,3].includes(this.ws.readyState))
        ){
            clearTimeout(this.reconnect_t);
            this.reconnect_t = 0;
            if(now){
                this.$reconnect();
            }else{
                this.reconnect_t = setTimeout(()=>{
                    this.$reconnect();
                }, 2000);
            }
            return true;
        }
        return false;
    }

    pauseSend(){
        this.isPause = true;
    }
    resumeSend(){
        this.isPause = false;
        this.sendCachedMessage();
    }

    private sendCachedMessage(){
        const sendList = this.sendList;
        this.sendList = [];
        for(let d of sendList){
            this.send(d);
        }
    }


    constructor(url: string|(()=>string), protocol: string|string[] = ''){
        super();
        if(!url) throw new TypeError('need url argument');

        this.wsUrl = url;
        this.wsProtocol = protocol;

        this.createWebSocket();

        for(let e of eventCollection){
            this.ws.addEventListener(e, this);
        }

        net.addEventListener('online', this);
        net.addEventListener('offline', this);
    }

    /**
     * @returns 是否处理地本次发送
     */
    send(d: string|ArrayBuffer|Object): boolean{
        if(this.closed){
            console.error('ReconnectWebSocket:websocket closed');
            return false;
        }

        switch(this.ws.readyState){
            case 0: // connecting
                this.sendList.push(d);
                return true;
            case 1: // open(normal)
                if(this.isPause) this.sendList.push(d);
                else this.ws.send(transSendData(d));
                return true;
            case 2:
            case 3:
                if(this.reconnect(true)){
                    this.sendList.push(d);
                    return true;
                }else{
                    return false;
                }
        }
        return false;
    }

    close(code = 1000, reason = ''){
        if(!this.closed){
            this.closed = true;

            net.removeEventListener('online', this);
            net.removeEventListener('offline', this);
            for(let e of eventCollection){
                this.ws.removeEventListener(e, this);
            }

            this.ws.close(code, reason);
            this.destory();
        }
    }

    get readyState(){
        return this.ws.readyState;
    }
    get url(){
        return this.ws.url;
    }
    get protocol(){
        return this.ws.protocol;
    }

    isOnline(){
        return net.onLine;
    }

    /**
     * @description 内部处理事件函数，外部不可调用
     * @private
     */
    handleEvent(event: {type: string}){
        switch(event.type){
            case 'open':
                if(this.reopen) this.trigger('reconnected', event);
                else{
                    this.trigger('open', event);
                    this.reopen = true;
                }
                if(!this.isPause) this.sendCachedMessage();
                break;
            case 'error':
                this.trigger('error', event);
                break;
            case 'close':
                if(this.closed) this.trigger('close', event);
                else if(this.sendList.length){
                    this.reconnect();
                }
                break;
            case 'message':
                this.trigger('message', { data: JSON.parse(
                    (event as {type: 'message', data: string}).data
                )});
                break;
            case 'online':
                this.trigger('online', event);
                this.reconnect(true);
                break;
            case 'offline':
                this.ws.close();
                this.trigger('offline', event);
                break;
        }
    }
}