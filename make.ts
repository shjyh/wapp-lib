interface ComputedOptions<T> {
    get?(): T;
    set?(value: T): void;
    cache?: boolean;
}
type Prop<T> = { (): T } | { new(...args: any[]): T & object } | { new(...args: string[]): Function }
interface PropOptions<T=any> {
    type?: PropType<T>;
    required?: boolean;
    default?: T | null | undefined | (() => T | null | undefined);
    validator?(value: T): boolean;
}
type PropType<T> = Prop<T> | Prop<T>[];
type PropValidator<T> = PropOptions<T> | PropType<T>;
type DefaultData = object|(() => object);
type DefaultProps = Record<string, any>;
type DefaultMethods<V> = { [key: string]: (this: V, ...args: any[]) => any };
type DefaultComputed = { [key: string]: any };
type RecordPropsDefinition<T> = {
    [K in keyof T]: PropValidator<T[K]>
  }
type ArrayPropsDefinition<T> = (keyof T)[];
type PropsDefinition<T> = ArrayPropsDefinition<T> | RecordPropsDefinition<T>;
type Accessors<T> = {
    [K in keyof T]: (() => T[K]) | ComputedOptions<T[K]>
}
interface WatchOptions {
    deep?: boolean;
    immediate?: boolean;
}
interface WatchOptionsWithHandler<T> extends WatchOptions {
    handler: WatchHandler<T>;
}
type WatchHandler<T> = (val: T, oldVal: T) => void;

export interface ComponentOptions<
    Data = DefaultData,
    Methods = DefaultMethods<Component>,
    Computed = DefaultComputed,
    PropsDef = PropsDefinition<DefaultProps>> {
    data?: Data;
    props?: PropsDef;
    computed?: Accessors<Computed>;
    methods?: Methods;
    watch?: Record<string, WatchOptionsWithHandler<any> | WatchHandler<any> | string>;

    externalClasses?: string|string[];
    options?: Object;
    relations?: Object;

    onShareAppMessage?(
        options?: Page.IShareAppMessageOption,
    ): Page.ICustomShareContent;
    onInit?(): void;
    beforeLoad?(options: any): void;
    onLoad?(options: any): void
    onReady?(): void;
    onShow?(): void;
    onHide?(): void;
    onPullDownRefresh?(): void;
    onPageScroll?(): void;
    onUnload?(): void;
    onDestroy?(): void;

    created?(): void;
    attached?(): void;
    ready?(): void;
    moved?(): void;
    detached?(): void;
    onPageShow?(): void;
    onPageHide?(): void;

    mixins?: ComponentOptions[];
    excludes?: ComponentOptions[];
}

export interface Component {
    readonly $options: ComponentOptions;
    readonly $route: string;

    $setData(d): void;
    $isActive(): boolean;
    $getPage(): Page.PageInstance;
    $getComponent(): WxComponent

    $watch(
        expOrFn: string,
        callback: (this: this, n: any, o: any) => void,
        options?: WatchOptions
    ): (() => void);
    $watch<T>(
        expOrFn: (this: this) => T,
        callback: (this: this, n: T, o: T) => void,
        options?: WatchOptions
    ): (() => void);
    $emit(event: string, detail?: Object, options?: TriggerEventOption): void;
    triggerEvent(event: string, detail?: Object, options?: TriggerEventOption): void;
}

type DataDef<Data, Props> = Data | ((this: Readonly<Props> & Component) => Data)
type CombinedVueInstance<Data, Methods, Computed, Props> =  Data & Methods & Computed & Props & Component;
export type ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props, A = unknown, B = unknown, C = unknown, D = unknown, E = unknown, F = unknown> =
  object &
  ComponentOptions<DataDef<Data, Props>, Methods, Computed, RecordPropsDefinition<Props>>&
  ThisType<CombinedVueInstance<Data, Methods, Computed, Readonly<Props>>&A&B&C&D&E&F>;

export function wrapper<Data, Methods, Computed, Props>(options?: ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props>): Data & Methods & Computed & Readonly<Props> & Component
export function wrapper(opt) {
    return opt;
}

export function mixins<A>(opt1: A): <Data, Methods, Computed, Props>(options?: ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props, A>) => Data & Methods & Computed & Readonly<Props> & Component & A
export function mixins<A, B>(opt1: A): <Data, Methods, Computed, Props>(options?: ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props, A, B>) => Data & Methods & Computed & Readonly<Props> & Component & A & B
export function mixins<A, B, C>(opt1: A): <Data, Methods, Computed, Props>(options?: ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props, A, B, C>) => Data & Methods & Computed & Readonly<Props> & Component & A & B & C
export function mixins<A, B, C, D>(opt1: A): <Data, Methods, Computed, Props>(options?: ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props, A, B, C, D>) => Data & Methods & Computed & Readonly<Props> & Component & A & B & C & D
export function mixins<A, B, C, D, E>(opt1: A): <Data, Methods, Computed, Props>(options?: ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props, A, B, C, D, E>) => Data & Methods & Computed & Readonly<Props> & Component & A & B & C & D & E
export function mixins<A, B, C, D, E, F>(opt1: A): <Data, Methods, Computed, Props>(options?: ThisTypedComponentOptionsWithRecordProps<Data, Methods, Computed, Props, A, B, C, D, E, F>) => Data & Methods & Computed & Readonly<Props> & Component & A & B & C & D & F
export function mixins(...opts: any[]){
    return function(opt){
        return Object.assign({
            mixins: [...opts]
        }, opt);
    }
}

import Reactive from './observer/Reactive';

export default function make<T>(o: T): { value: T } {
    return new Reactive({
        data: {
            value: o
        }
    }) as any;
}