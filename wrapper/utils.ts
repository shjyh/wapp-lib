import Reactive from "../observer/Reactive";
import get from 'lodash-es/get';
import set from 'lodash-es/set';
import { ComponentOptions } from '../make';
import merge from 'lodash-es/merge';
import cloneDeep from 'lodash-es/cloneDeep';
import { arrayRemove } from '../utils';

export interface ArrayWatchItem {
    path: string;
    watches: WatchItem[]|NestedArrayWatchItem;
    key?: string
};

export interface NestedArrayWatchItem extends ArrayWatchItem {
    path: ''
}

export type WatchItem = string | ArrayWatchItem

export function getMapedObject(obj: Object, props: WatchItem[], pathAsKey = false): Object{
    if(!obj) return null;
    const d = {};
    for(let prop of props){
        if(prop==='') continue;
        if(typeof prop === 'string'){
            const value = cloneDeep(get(obj, prop))||null;
            if(pathAsKey) d[prop] = value
            else set(d, prop, value);
            continue;
        }

        const value = getMapedArray(get(obj, prop.path), prop.watches, prop.key, pathAsKey);
        if(!value) continue;
        
        if(pathAsKey) d[prop.path] = value;
        else set(d, prop.path, value);
    }
    return d;
}

function getMapedArray(arr: any[], props: WatchItem[]|NestedArrayWatchItem, key: string, pathAsKey = false): any[]|null{
    if(!arr) return null;
    if(!Array.isArray(arr)) return null;
    if(key==='*this'||!props) return cloneDeep(arr);

    const needRandom = (key === '$random');

    return arr.map(item => {
        if(Array.isArray(props)){
            if(needRandom&&!item.$random) item.$random = Math.random().toString();
            return getMapedObject(item, props, pathAsKey);
        }
        return getMapedArray(item, props.watches, props.key, pathAsKey);
    })
}

function withPrefix(path: string, prefix: string){
    if(!prefix) return path;
    if(path.startsWith('[')) return prefix + path;
    return [prefix, '.', path].join('');
}

function getObjDiff(newObj, oldObj, props: WatchItem[], prefix: string = ''): { [key: string]: any } {
    if(!newObj||!oldObj) return {[prefix]: newObj};
    
    const d = {};
    
    for(let prop of props){
        if(prop==='') continue;
        if(typeof prop === 'string'){
            if(newObj[prop] !== oldObj[prop]) d[withPrefix(prop, prefix)] = newObj[prop];
            continue;
        }


        const { path, watches, key } = prop;
        Object.assign(d, getArrDiff(newObj[path], oldObj[path], watches, key, withPrefix(path, prefix)));
    }

    return d;
}

function getArrDiff(newArr: any[], oldArr: any[], props: WatchItem[]|NestedArrayWatchItem, key: string, prefix: string = ''): { [key: string]: any } {
    if(!newArr||!oldArr) return {[prefix]: null};
    if(newArr.length!==oldArr.length || key==='*this' || !props) return {[prefix]: newArr};
    
    const d = {};

    newArr.forEach((item, index)=>{
        if(Array.isArray(props)){
            if(key&&item[key]!==oldArr[index][key]) d[`${prefix}[${index}]`] = item;
            else Object.assign(d, getObjDiff(item, oldArr[index], props, `${prefix}[${index}]`));
        }else{
            Object.assign(d, getArrDiff(item, oldArr[index], props.watches, props.key, `${prefix}[${index}]`));
        }
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