import Reactive from '../observer/Reactive';
import { bindWatch, getMapedObject, WatchItem, mixins, setData } from './utils';
import { ComponentOptions, Component, ComponentInstance } from '../make';
import './setter';

export interface WrapperComponent {
    (opt, watchs: WatchItem[], methods: string[], vImages?: {[key: string]: string}): void;
    mixin(m: Component): void
}

const wrapperList: {component: WechatMiniprogram.Component.Constructor, wrapper: WrapperComponent}[] = []

function getDefaultValueByType(type){
    switch(type){
        case String:
            return '';
        case Number:
            return 0;
        case Boolean:
            return false;
        case Object:
            return {};
        case Array:
            return [];
        case null:
            return null;
        default:
            return null;
    }
}

function createProp(propName, propValue){
    let validator = null;
    if([String, Number, Boolean, Object, Array, null].includes(propValue)){
        propValue = { type: propValue, value: getDefaultValueByType(propValue) }
    }else{
        let p = propValue;
        let mainType = null;
        let optionalTypes = [];
        if(p.type){
            // 若指定type
            if(Array.isArray(p.type)){
                // type是数组，取第一个做主类型，其它作可选择类型
                if(p.type.length>0){
                    mainType = p.type[0];
                    optionalTypes = p.type.slice(1);
                }
            }else if(p.type){
                // type即是类型
                mainType = p.type
            }
        }
        propValue = {
            type: mainType,
            value: p.default?
                (typeof p.default==='function' ? p.default() : p.default):
                getDefaultValueByType(mainType)
        };
        if(optionalTypes.length) propValue.optionalTypes = optionalTypes;
        if(p.validator) validator = p.validator;
    }
    propValue.observer = function(v){
        if(validator&&validator.call(this.$react, v)===false){
            console.error('wapp-lib: 属性校验错误', v, this.$react, propValue);
        }
        this.$react[propName] = v;
    }
    return propValue;
}

export default function CreateWrapperComponent(Component: WechatMiniprogram.Component.Constructor): WrapperComponent{
    for(let w of wrapperList){
        if(w.component===Component) return w.wrapper;
    }

    const globalMixins: ComponentOptions[] = [];
    function WrapperComponent(opt, watchs: WatchItem[], methods: string[], vImages?: {[key: string]: string}){
        // props数据将由mixin方式合并入当前的reactive中
        const propsMixin = {
            data: {}
        };
        const $opt: { 
            data?: Record<string, any>, 
            properties?: Record<string, any>,
            methods: Record<string, (...args: any[])=>any>,
            relations: any,
            externalClasses: any,
            options: any,
            lifetimes?: {
                created?(this: ComponentInstance, ...args): any,
                attached?(this: ComponentInstance, ...args): any,
                ready?(this: ComponentInstance, ...args): any,
                moved?(this: ComponentInstance, ...args): any,
                detached?(this: ComponentInstance, ...args): any,
                error?(this: ComponentInstance, ...args): any
            },
            pageLifetimes?: {
                show?(this: ComponentInstance, ...args): any,
                hide?(this: ComponentInstance, ...args): any,
                resize?(this: ComponentInstance, ...args): any
            }
        } = {
            methods: {},
            relations: opt.relations,
            externalClasses: opt.externalClasses,
            options: opt.options
        }

        if(vImages){
            watchs = watchs.filter(w=>w!=='$images');
            Object.seal(vImages);
            $opt.data = {
                $images: vImages
            };
        }

        if(opt.props){
            if(!opt.data) opt.data = {};
            $opt.properties = {};
            for(let prop of Object.keys(opt.props)){
                //去除watchItem中props相关的响应
                watchs = watchs.filter(w=>{
                    if(typeof w === 'string')
                        return w!==prop&&!w.startsWith(prop+'.');
                    else
                        return w.path!==prop&&!w.path.startsWith(prop+'.');
                });
                $opt.properties[prop] = createProp(prop, opt.props[prop]);
                propsMixin.data[prop] = $opt.properties[prop].value;
            }
            if(!opt.mixins) opt.mixins = [];
            opt.mixins.push(propsMixin);
        }

        mixins(opt, globalMixins);
        
        for(let m of methods){
            $opt.methods[m] = function(this: any, ...arg){
                return this.$react[m](...arg);
            }
        }

        $opt.lifetimes = {
            created(this: ComponentInstance, ...args){
                const component = this;
                component['__patchable'] = true;
                component['__cachedPatches'] = [];
    
                const reactive = new Reactive(opt, false);
                if(vImages) reactive['$images'] = vImages;
    
                Object.defineProperties(reactive, {
                    $setData: {
                        value(d){
                            setData(component, d);
                        }
                    },
                    $getComponent: {
                        value(){ return component; }
                    },
                    $emit: {
                        value(event: string, detail: Object, options: WechatMiniprogram.Component.TriggerEventOption){
                            component.triggerEvent(event, detail, options);
                        }
                    },
                    triggerEvent: {
                        value(event: string, detail: Object, options: WechatMiniprogram.Component.TriggerEventOption){
                            component.triggerEvent(event, detail, options);
                        }
                    }
                });
                if(opt.onInit) opt.onInit.call(reactive);
                component.$react = reactive;
                /**
                 * 在onInit之后调用initWatch开始侦听
                 */
                if(opt.created) opt.created.call(reactive, ...args);
            },
            attached(this: ComponentInstance, ...args){
                //初次设置
                const reactive = this.$react as Reactive;
                reactive.$initWatch();
    
                bindWatch(reactive, watchs, d=>{
                    if(this['__patchable']){
                        setData(this, d);
                        return;
                    }
                    this['__cachedPatches'].push(d);
                });
                setData(this, getMapedObject(this.$react, watchs));
                opt.attached&&opt.attached.call(this.$react, ...args)
            },
            detached(this: ComponentInstance, ...args){
                if(opt.detached) opt.detached.call(this.$react, ...args);
                this['$react'].$unwatch();
                this['__patchable'] = false;
            }
        };

        $opt.pageLifetimes = {
            show(this: ComponentInstance, ...args){
                if(!this['__patchable']){
                    this['__patchable'] = true;
                    for(let d of this['__cachedPatches']){
                        setData(this, d);
                    }
                    this['__cachedPatches'] = [];
                }
                if(opt.onPageShow) opt.onPageShow.call(this.$react, ...args);
            },
            hide(this: ComponentInstance, ...args){
                this['__patchable'] = false;
                if(opt.onPageHide) opt.onPageHide.call(this.$react, ...args);
            }
        }

        
        for(let normalEvent of [
            'ready', 'moved'
        ]){
            if(opt[normalEvent]) $opt[normalEvent] = $opt.lifetimes[normalEvent] = function(this: any, ...arg){
                opt[normalEvent].call(this.$react, ...arg);
            }
        }

        Component($opt);
    }

    WrapperComponent.mixin = function(m: ComponentOptions&Component){
        if(globalMixins.includes(m)) return;
        globalMixins.push(m);
    }
    wrapperList.push({
        component: Component, wrapper: WrapperComponent
    });
    return WrapperComponent;
}