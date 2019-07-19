
export type EventListener = (e:any) => void;

export interface EventHandler {
    handleEvent(e: any): void
}

export type EventCallback = EventListener|EventHandler;

function invokeEventCallback(callback: EventCallback, event: any){
    if((<EventHandler>callback).handleEvent) 
            (<EventHandler>callback).handleEvent(event);
        else (<EventListener>callback)(event)
}

interface EventCallbackDict {
    [key: string]: EventCallback[]
}

function insertHandler(collection: EventCallbackDict, type: string, listener: EventCallback){
    if(!collection[type]) collection[type] = [];

    const list = collection[type];

    if(!list.includes(listener)) list.push(listener);
}

function removeHandler(collection: EventCallbackDict, type: string, listener: EventCallback){
    const list = collection[type];
    if(list){
        const index = list.indexOf(listener);
        index!==-1 && list.splice(index, 1);
    }
}


function invokeHandler(collection: EventCallbackDict, type: string, event: any){
    if(!collection[type]) return;

    for(let handler of collection[type]){
        invokeEventCallback(handler, event);
    }
}


export default class EventEmitter<T extends string = string> {
    private handlers: EventCallbackDict = {};
    private onceHandlers: EventCallbackDict = {};
    /**@description 缓存的最后一次事件，用于后添加侦听器可以接收最后一次事件*/
    private cachedValue: {[key:string]: any} = {};
    /**@description 冒泡最后一个缓存事件 */
    private emitCachedEvent(type: string, handler: EventCallback){
        if(this.cachedValue[type]){
            invokeEventCallback(handler, this.cachedValue[type]);
        }
    }
    
    addEventListener(type: T, handler: EventCallback):void
    addEventListener(type: string, handler: EventCallback):void
    addEventListener(type: string, handler: EventCallback){
        this.emitCachedEvent(type.toString(), handler);
        insertHandler(this.handlers, type.toString(), handler);
    }

    removeEventListener(type: T, handler: EventCallback):void
    removeEventListener(type: string, handler: EventCallback):void
    removeEventListener(type: string, handler: EventCallback){
        removeHandler(this.handlers, type, handler);
        removeHandler(this.onceHandlers, type, handler);
    }

    once(type: T, handler: EventCallback):void
    once(type: string, handler: EventCallback):void
    once(type: string, handler: EventCallback){
        this.emitCachedEvent(type, handler);
        insertHandler(this.onceHandlers, type, handler);
    }

    on(type: T, handler: EventCallback):void
    on(type: string, handler: EventCallback):void
    on(type: string, handler: EventCallback){
        this.addEventListener(type, handler);
    }

    off(type: T, handler: EventCallback):void
    off(type: string, handler: EventCallback):void
    off(type: string, handler: EventCallback){
        this.removeEventListener(type, handler);
    }

    trigger(type: T, event?: any, cache?: boolean): void
    trigger(type: string, event?: any, cache?: boolean): void
    trigger(type: string, event: any = { type }, cache: boolean = false){
        if(cache){
            this.cachedValue[type] = event;
        }
        invokeHandler(this.handlers, type, event);
        invokeHandler(this.onceHandlers, type, event);
    }

    destory(){
        this.handlers = this.onceHandlers = this.cachedValue = null;
    }
}
