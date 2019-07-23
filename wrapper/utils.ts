import Reactive from "../observer/Reactive";
import get from 'lodash-es/get';
import set from 'lodash-es/set';
import { ComponentOptions } from '../make';
import merge from 'lodash-es/merge';
import { arrayRemove } from '../utils';

export type WatchItem = string | {
    path: string, watches: WatchItem[], key?: string
}

export function getMapedObject(obj: Object, props: WatchItem[], pathAsKey = false): Object{
    const d = {};
    for(let prop of props){
        if(prop==='') continue;
        if(typeof prop === 'string'){
            const value = get(obj, prop);
            if(pathAsKey) d[prop] = value
            else set(d, prop, value);
            continue;
        }

        if(prop.path===''){
            //表示当前是一个数组，忽略其它属性
            return getMapedArray(obj as any[], prop.watches, prop.key, pathAsKey);
        }
        const value = getMapedArray(get(obj, prop.path), prop.watches, prop.key, pathAsKey);
        if(!value) continue;
        
        if(pathAsKey) d[prop.path] = value;
        else set(d, prop.path, value);
    }
    return d;
}

function getMapedArray(arr: any[], props: WatchItem[], key: string, pathAsKey = false): any[]|null{
    if(!arr) return null;
    if(key==='*this') return [...arr];

    const needRandom = (key === '$random');

    return arr.map(item => {
        if(needRandom&&!item.$random) item.$random = Math.random().toString();
        return getMapedObject(item, props, pathAsKey);
    })
}

function withPrefix(path: string, prefix: string){
    if(prefix) return [prefix, '.', path].join('');
    return path;
}

function getObjDiff(newObj, oldObj, props: WatchItem[], prefix: string = ''): { [key: string]: any } {
    const d = {};
    
    for(let prop of props){
        if(prop==='') continue;
        if(typeof prop === 'string'){
            if(newObj[prop] !== oldObj[prop]) d[withPrefix(prop, prefix)] = newObj[prop];
            continue;
        }


        const { path, watches, key } = prop;
        if(path===''){
            //表示当前是一个数组，忽略其它属性
            return getArrDiff(newObj as any[], oldObj as any[], watches, key, prefix);
        }
        Object.assign(d, getArrDiff(get(newObj, path), get(oldObj, path), watches, key, withPrefix(path, prefix)));
    }

    return d;
}

function getArrDiff(newArr: any[], oldArr: any[], props: WatchItem[], key: string, prefix: string = ''): { [key: string]: any } {
    if(newArr.length!==oldArr.length || key==='*this') return {[prefix]: newArr};
    
    const d = {};

    newArr.forEach((item, index)=>{
        if(key&&item[key]!==oldArr[index][key]) d[`${prefix}[${index}]`] = item;
        else Object.assign(d, getObjDiff(item, oldArr[index], props, `${prefix}[${index}]`));
    });

    return d;
}

export function bindWatch(reactive: Reactive, watches: WatchItem[], callback: (d: {[key: string]: any})=>void){
    reactive.$watch(()=>getMapedObject(reactive, watches, true), (newV, oldV)=>{
        const diff = getObjDiff(newV, oldV, watches);
        if(Object.keys(diff).length === 0) return;
        callback(diff);
    });
}


function getAllMixin(opt: ComponentOptions): ComponentOptions[]{
    if(!opt.mixins||opt.mixins.length===0) return [];

    const mixins: ComponentOptions[] = [];
    for(let m of opt.mixins){
        mixins.push(m);
        const _result = getAllMixin(m);
        _result.forEach(m=>{
            if(!mixins.includes(m)) mixins.push(m);
        })
    }
    return mixins;
}
function mixinFnCalls(fns: Function[]){
    if(!fns) return null;
    fns = fns.filter(fn=>!!fn);
    if(fns.length===0) return null;

    return function(this: any, ...args){
        const promiseResult = [];
        for(let fn of fns){
            const result = fn.call(this, ...args);
            if(result&&result.then) promiseResult.push(result);
        };
        return Promise.all(promiseResult);
    }
}

function getData(d){
    if(!d) return {};
    if(typeof d === 'function') return d();
    return d;
}
export function mixins(opt: ComponentOptions, globalMixins: ComponentOptions[] = []){
    const mixins = getAllMixin({
        mixins: [...globalMixins, ...(opt.mixins||[]) ]
    });
    delete opt.mixins;
    (opt.excludes||[]).forEach(m=>{
        arrayRemove(mixins, m);
    });

    if(mixins.length===0) return opt;

    const rawOptData = opt.data;
    opt.data = function(){
        return merge({}, ...mixins.map(m=>getData(m.data)), getData(rawOptData));
    };
    opt.computed = Object.assign({}, ...mixins.map(m=>m.computed), opt.computed);
    const watch: typeof opt.watch = {};
    for(let w of [...mixins.map(m=>m.watch), opt.watch]){
        if(!w) continue;
        for(let watchKey of Object.keys(w)){
            let oldWatch = watch[watchKey] as any;
            let currentWatch = w[watchKey] as any;
            if(!oldWatch){
                watch[watchKey] = currentWatch;
                continue;
            }

            if(!Array.isArray(oldWatch)) oldWatch = [oldWatch];
            if(!Array.isArray(currentWatch)) currentWatch = [currentWatch];

            watch[watchKey] = [...oldWatch, ...currentWatch] as any;
        }
    }
    opt.watch = watch;

    opt.methods = Object.assign({}, ...mixins.map(m=>m.methods), opt.methods);

    for(let lifeCycle of [
        'onInit', 'beforeLoad', 'onLoad', 'onReady', 'onShow',
        'onHide', 'onPullDownRefresh', 'onPageScroll', 'onUnload',
        'onDestroy', 'created', 'attached', 'ready', 'moved',
        'detached', 'onPageShow', 'onPageHide'
    ]){
        const fn = mixinFnCalls([...mixins.map(m=>m[lifeCycle]), opt[lifeCycle]])
        if(fn) opt[lifeCycle] = fn;
    };

    return opt;
}