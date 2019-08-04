import { getObjDiff } from "../wrapper/utils";

test('diff算法', ()=>{
    expect(getObjDiff({ a: 1 }, { a: 1 }, [ 'a' ])).toEqual({});
    expect(getObjDiff(
        { list: [{$random:1, prop: 1}, {$random:3, prop: 1}] }, 
        { list: [{$random:2, prop: 1}, {$random:4, prop: 2}] }, 
        [{path: 'list', watches: null}]
    )).toEqual({'list[1]': { $random: 3, prop: 1 }});
})