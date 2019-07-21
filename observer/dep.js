let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */

import { arrayRemove } from '../utils';

export default class Dep {

    constructor() {
        this.id = uid++
        this.subs = []
    }

    addSub(sub) {
        this.subs.push(sub)
    }

    removeSub(sub) {
        arrayRemove(this.subs, sub);
    }

    depend() {
        if (Dep.target) {
            Dep.target.addDep(this)
        }
    }

    notify() {
        // stabilize the subscriber list first
        const subs = this.subs.slice()
        for (let i = 0, l = subs.length; i < l; i++) {
            subs[i].update()
        }
    }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

Dep.pushTarget = function (_target) {
    if (Dep.target) targetStack.push(Dep.target)
    Dep.target = _target
}

Dep.popTarget = function () {
    Dep.target = targetStack.pop()
}