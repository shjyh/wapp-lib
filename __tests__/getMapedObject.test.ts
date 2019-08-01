import { getMapedObject } from "../wrapper/utils";

test('watch maped 测试', ()=>{
    expect(getMapedObject({a: [{ b: { c : 1} }] }, [{ path: 'a', watches: [ 'b.c' ] }])).toEqual({
        a: [ { b: { c: 1 } } ]
    })
})