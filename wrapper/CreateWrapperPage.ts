import Reactive from '../observer/Reactive';
import { bindWatch, getMapedObject, WatchItem, mixins } from './utils';
import { ComponentOptions } from '../make';
import './setter';

export interface WrapperPage {
    (opt, watchs: WatchItem[], methods: string[]): void;
    mixin(m): void
}

const wrapperList: {page: Page.PageConstructor, wrapper: WrapperPage}[] = []

export default function CreateWrapperPage(Page: Page.PageConstructor): WrapperPage{
    for(let w of wrapperList){
        if(w.page===Page) return w.wrapper;
    }

    const globalMixins: ComponentOptions[] = [];
    function WrapperPage(opt, watchs: WatchItem[], methods: string[], vImages?: {[key: string]: string}){
        mixins(opt, globalMixins);

        const $opt = {} as any;
        if(vImages){
            watchs = watchs.filter(w=>w!=='$images');
            Object.seal(vImages);
            $opt.data = {
                $images: vImages
            };
        };
         
        for(let m of methods){
            $opt[m] = function(this: any, ...arg){
                return this.$react[m](...arg);
            }
        }

        for(let normalEvent of [
             'onReady', 'onPullDownRefresh', 'onReachBottom', 'onPageScroll', 'onShareAppMessage'
        ]){
            if(opt[normalEvent]) $opt[normalEvent] = function(this: any, ...arg){
                return opt[normalEvent].call(this.$react, ...arg);
            }
        }


        $opt.onLoad = function(this: Page.PageInstance, ...args){
            const page = this;
            page['__patchable'] = true;
            page['__cachedPatches'] = [];

            const reactive = new Reactive(opt, false);
            if(vImages) reactive['$images'] = vImages; 
            
            Object.defineProperties(reactive, {
                $isActive: {
                    value(){
                        const pages = getCurrentPages();
                        return pages[pages.length-1] === page;
                    }
                },
                $setData: {
                    value(d){
                        page.setData(d);
                    }
                },
                $getPage: {
                    value(){ return page; }
                },
                $route: {
                    get(){ return page.route }
                }
            });

            if(opt.onInit) opt.onInit.call(reactive);
            page.$react = reactive;
            /**
             * 在onInit之后调用initWatch开始侦听
             */
            reactive.$initWatch();

            if(opt.beforeLoad) opt.beforeLoad.call(reactive, ...args);

            bindWatch(reactive, watchs, d=>{
                if(page['__patchable']){
                    page.setData(d);
                    return;
                }
                page['__cachedPatches'].push(d);
            });

            //初次设置
            page.setData(getMapedObject(reactive, watchs));

            if(opt.onLoad){
                page['__waitOnLoadDone'] = opt.onLoad.call(reactive, ...args);
            }
        };
        $opt.onShow = function(this:Page.PageInstance, ...args){
            if(!this['__patchable']){
                this['__patchable'] = true;
                for(let d of this['__cachedPatches']){
                    this.setData(d);
                }
            }
            if(!this['__waitOnLoadDone']){
                if(opt.onShow) opt.onShow.call(this.$react, ...args);
                return;
            }
            this['__waitOnLoadDone'].then(()=>{
                delete this['__waitOnLoadDone'];
                if(opt.onShow) opt.onShow.call(this.$react, ...args);
            })
        };
        $opt.onHide = function(...args){
            this['__patchable'] = false;
            if(opt.onHide) opt.onHide.call(this.$react, ...args);
        };
        $opt.onUnload = function(...args){
            if(opt.onUnload) opt.onUnload.call(this.$react, ...args);
            this.$react.$unwatch();
            this['__patchable'] = false;

            if(opt.onDestroy) opt.onDestroy.call(this.$react);
        }

        Page($opt);
    }

    WrapperPage.mixin = function(m: ComponentOptions){
        if(globalMixins.includes(m)) return;
        globalMixins.push(m);
    }

    wrapperList.push({
        page: Page, wrapper: WrapperPage
    });
    return WrapperPage;
}