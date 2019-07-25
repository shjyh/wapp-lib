export interface Toast {
    show(msg:string, timeout?: number): void;
    showLarge(msg: string, timeout?: number): void;
}

export interface Loading {
    open(text:string): void;
    close(): void;
}