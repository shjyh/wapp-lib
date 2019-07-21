import Reactive from '../observer/Reactive';
import { bindWatch, getMapedObject, WatchItem, mixins } from './utils';
import { ComponentOptions } from '../make';

export type WrapperComponent = (opt, watchs: WatchItem[], methods: string[])=>void

const wrapperList: {component: Function, wrapper: WrapperComponent}[] = []

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
    if([String, Number, Boolean, Object, Array, null].includes(propValue)){
        propValue = { type: propValue, value: getDefaultValueByType(propValue) }
    }else{
        propValue = {
            type: propValue.type||null,
            value: propValue.default?
                (typeof propValue.default==='function' ? propValue.default() : propValue.default):
                getDefaultValueByType(propValue.type)
        }
    }
    propValue.observer = function(v){
        this.$react[propName] = v;
    }
    return propValue;
}

export default function CreateWrapperComponent(Component: Function): WrapperComponent{
    for(let w of wrapperList){
        if(w.component===Component) return w.wrapper;
    }

    const globalMixins: ComponentOptions[] = [];
    function WrapperComponent(opt, watchs: WatchItem[], methods: string[]){
        const propsMixin = {
            data: {}
        };
        const $opt = {
            methods: {},
            relations: opt.relations,
            externalClasses: opt.externalClasses,
            options: opt.options,
            lifetimes: {},
            pageLifetimes: {}
        } as any;

        if(opt.props){
            if(!opt.data) opt.data = {};
            $opt.properties = {};
            for(let prop of Object.keys(opt.props)){
                $opt.properties[prop] = createProp(prop, opt.props[prop]);
                propsMixin.data[prop] = $opt.properties[prop].value;
            }
        }
        if(!opt.mixins) opt.mixins = [];
        opt.mixins.push(propsMixin);

        mixins(opt, globalMixins);
        
        for(let m of methods){
            $opt.methods[m] = function(this: any, ...arg){
                return this.$react[m](...arg);
            }
        }

        $opt.created = $opt.lifetimes.created = function(this: WxComponent, ...args){
            const component = this;
            component['__patchable'] = true;
            component['__cachedPatches'] = [];

            const reactive = new Reactive(opt, false);
            Object.defineProperties(reactive, {
                $setData: {
                    value(d){
                        component.setData(d);
                    }
                },
                $getComponent: {
                    value(){ return component; }
                },
                $emit: {
                    value(event: string, detail: Object, options: TriggerEventOption){
                        component.triggerEvent(event, detail, options);
                    }
                },
                triggerEvent: {
                    value(event: string, detail: Object, options: TriggerEventOption){
                        component.triggerEvent(event, detail, options);
                    }
                }
            });
            if(opt.onInit) opt.onInit.call(reactive);
            component['$react'] = reactive;
            /**
             * 在onInit之后调用initWatch开始侦听
             */
            reactive.$initWatch();

            bindWatch(reactive, watchs, d=>{
                if(component['__patchable']){
                    component.setData(d);
                    return;
                }
                component['__cachedPatches'].push(d);
            });
            if(opt.created) opt.created.call(reactive, ...args);
        };
        $opt.attached = $opt.lifetimes.attached = function(this: WxComponent, ...args){
            //初次设置
            this.setData(getMapedObject(this['$react'], watchs));
            opt.attached&&opt.attached.call(this['$react'], ...args)
        };
        $opt.detached = $opt.lifetime.detached = function(this: WxComponent, ...args){
            if(opt.detached) opt.detached.call(this['$react'], ...args);
            this['$react'].$unwatch();
            this['__patchable'] = false;
        };
        $opt.pageLifetimes = {
            show(this: WxComponent, ...args){
                if(!this['__patchable']){
                    this['__patchable'] = true;
                    for(let d of this['__cachedPatches']){
                        this.setData(d);
                    }
                }
                if(opt.onPageShow) opt.onPageShow.call(this['$react'], ...args);
            },
            hide(this: WxComponent, ...args){
                this['__patchable'] = false;
                if(opt.onPageHide) opt.onPageHide.call(this['$react'], ...args);
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

    WrapperComponent.mixins = function(m: ComponentOptions){
        if(globalMixins.includes(m)) return;
        globalMixins.push(m);
    }
    wrapperList.push({
        component: Component, wrapper: WrapperComponent
    });
    return WrapperComponent;
}