/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from './utils/lang';

const arrayProto = Array.prototype

export const arrayMethods = Object.create(arrayProto);

import { getSetter} from './setter';

/**
 * Intercept mutating methods and emit events
 */
;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    const { before: sBefore, after:sAfter } = getSetter()||{};
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        if(sBefore) args = args.map(item=>sBefore(item));
        inserted = args
        break
      case 'splice':
        if(sBefore) args = args.map((item, index)=>{
          if(index>=2) return sBefore(item);
          return item;
        });
        inserted = args.slice(2)
        break
    }
    const result = original.apply(this, args)

    if (inserted) ob.observeArray(inserted)

    sAfter&&sAfter();
    // notify change
    ob.dep.notify()
    return result
  })
})