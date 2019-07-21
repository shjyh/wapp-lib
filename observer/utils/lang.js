export const emptyObject = Object.freeze({})

/**
 * Check if a string starts with $ or _
 */
export function isReserved(str){
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 */
export function def(obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 */
const bailRE = /[^\w.$]/
export function parsePath(path){
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}

export function isObject(obj){
    return obj !== null && typeof obj === 'object'
}

const _toString = Object.prototype.toString
export function isPlainObject(obj) {
  return _toString.call(obj) === '[object Object]'
}

export function isValidArrayIndex(val){
  const n = parseFloat(val)
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key)
}

export function bind(fn, ctx) {
  function boundFn (a) {
    const l = arguments.length
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }
  // record original fn length
  boundFn._length = fn.length
  return boundFn
}

export function noop(a, b, c) {}