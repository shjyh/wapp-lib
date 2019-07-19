export interface Toast {
    show(msg:string):void
}

export interface Loading {
    open(text:string):void
    close():void
}