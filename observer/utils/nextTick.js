/**
 * Defer a task to execute it asynchronously.
 */
export default (function () {
  const callbacks = []
  let pending = false

  let timerFunc = (function(){
      var p = Promise.resolve();
      var logError = err => { console.error(err) };
      return () => {
        p.then(nextTickHandler).catch(logError);
      }
  }());

  function nextTickHandler () {
    pending = false
    const copies = callbacks.slice(0)
    callbacks.length = 0
    for (let i = 0; i < copies.length; i++) {
      copies[i]()
    }
  }

  return function queueNextTick (cb, ctx) {
    let _resolve
    callbacks.push(() => {
      if (cb) {
        try {
          cb.call(ctx)
        } catch (e) {
            console.error('nextTick callback error', e);
        }
      } else if (_resolve) {
        _resolve(ctx)
      }
    })
    if (!pending) {
      pending = true
      timerFunc()
    }
    if (!cb) {
      return new Promise((resolve, reject) => {
        _resolve = resolve
      })
    }
  }
})()