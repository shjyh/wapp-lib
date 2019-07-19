// 模拟浏览器websocket

import EventEmit from '../EventEmitter';

export type WebSocketEventType = 'close'|'error'|'message'|'open';

export default class WebSocket extends EventEmit<WebSocketEventType> {
    private _URL: string;
    private _PROTOCOL: string|string[];
    private _READY_STATE: number;
    private _SOCKET_TASK: wx.SocketTask;

    constructor(url: string, protocols?: string | string[]){
        super();
        this._URL = url;
        this._PROTOCOL = protocols;
        this._READY_STATE = 0;

        const options = { url } as wx.ConnectSocketOption;
        if(protocols){
            if(typeof protocols === 'string') options.protocols = [protocols];
            else options.protocols = protocols;
        }

        const socketTask = wx.connectSocket(options);
        this._SOCKET_TASK = socketTask;

        const openCallback: wx.OnOpenCallback = res=>{
            this._READY_STATE = 1;
            this.trigger('open');
        };
        const errorCallback: wx.SocketTaskOnErrorCallback = res=>{
            this._READY_STATE = 3;
            this.trigger('error');
        };
        const messageCallback: wx.SocketTaskOnMessageCallback = res=>{
            this.trigger('message', {
                type: 'message',
                data: res.data
            });
        };
        const closeCallback: wx.OnCloseCallback = res=>{
            this._READY_STATE = 3;
            this.trigger('close');
        };

        socketTask?socketTask.onOpen(openCallback):wx.onSocketOpen(openCallback);
        socketTask?socketTask.onError(errorCallback):wx.onSocketError(errorCallback);
        socketTask?socketTask.onMessage(messageCallback):wx.onSocketMessage(messageCallback);
        socketTask?socketTask.onClose(closeCallback):wx.onSocketClose(closeCallback);
    }

    send(d: string|ArrayBuffer){
        this._SOCKET_TASK?this._SOCKET_TASK.send({
            data: d
        }):wx.sendSocketMessage({
            data: d
        });
    }

    close(code = 1000, reason = ''){
        this._READY_STATE = 2;
        this._SOCKET_TASK?this._SOCKET_TASK.close({
            code,
            reason
        }):wx.closeSocket({
            code,
            reason
        });
    }
    get url(){
        return this._URL;
    }
    get protocol(){
        return this._PROTOCOL;
    }
    get readyState(){
        return this._READY_STATE;
    }
}