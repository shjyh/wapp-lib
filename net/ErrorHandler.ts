import {Toast} from '../ui';

type ErrorHandlerFn = ((toast: Toast|false, ...args)=>void);

export type ErrorHandler = String|ErrorHandlerFn

export interface NetErrorHandlers {
    net?: ErrorHandler
    timeout?: ErrorHandler
    logic?: {
        [key: string]: ErrorHandler,
        default?: ErrorHandler
    }
}


export interface HttpErrorHandlers extends NetErrorHandlers {
    http?: {
        [key: string]: ErrorHandler,
        default?: ErrorHandler
    }
}


export function mergeErrorHandlers<T extends NetErrorHandlers = NetErrorHandlers>(
    ...handlersList: T[]
): T{
    const handlers: T = <T>{};

    for(let h of handlersList){
        if(!h) continue;
        const keys = Object.keys(h);
        for(let key of keys){
            switch(typeof h[key]){
                case 'object': 
                    handlers[key] = Object.assign(handlers[key]||{}, h[key]);
                    break;
                case 'string': 
                    handlers[key] = h[key];
                    break;
            }
        }
    }

    return handlers;
}

export function fireErrorHandler(
    handler: ErrorHandler, 
    toast: Toast|false = false,
    ...args
){
    if(!handler) return;
    
    if(typeof handler === 'string'){
        if(toast) toast.show(handler);
        return;
    }
    (<ErrorHandlerFn>handler)(toast, ...args);
}
