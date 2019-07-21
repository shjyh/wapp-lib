/**
 * @typedef Setter
 * @property {(val:any)=>any} [Setter.before]
 * @property {()=>void} [Setter.after]
 * 
 */

 /**@type {Setter} */
let externalSetter = null;

/**
 * @param {Setter} setter 
 */
export function defineSetter(setter){
    if(setter.before) setter.before = wrapperBefore(setter.before);
    externalSetter = setter;
}

export function getSetter(){
    return externalSetter;
}

/**
 * @param {(val:any)=>any} before
 * @returns {(val:any)=>any} 
 */
function wrapperBefore(before){
    if(!before) return;
    return function(v){
        const result = before(v);
        if(result===undefined) return v;
        return result;
    }
}