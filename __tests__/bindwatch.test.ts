import Reactive from '../observer/Reactive';
import { wrapper } from '../make';
import { bindWatch, getMapedObject, WatchItem } from '../wrapper/utils';

test('reactive bindwatch 逻辑', done=>{
    const reactive = new Reactive(wrapper({
        data: {
            a: {
                b: 3,
                arr: [1, 2]
            },
            arr: [{ a: 1, b: 2 }, { a: 3, b: 4 }],
            warr: {
                arr: [
                    { a: 1, b: 2, list: [ { innerA: 5, innerB: 6 } ] }, { a: 3, b: 4 }
                ]
            },
            nestedArr: [
                [ { innerValue: '1' } ]
            ]
        },
        methods: {
            change(){
                this.a.b = 4;
                this.a.arr.push(5);
                this.arr[0].a = 6;
                this.warr.arr[0].list.push({ innerA: 7 } as any)
                this.warr.arr[1]['$random'] = 100;
                this.nestedArr[0][0].innerValue = '2';
            }
        }
    })) as any;

    const watches: WatchItem[] = [
        'a.b', {path: 'a.arr', watches: [], key: '*this'},
        {path: 'arr', watches: ['a'] },
        {path: 'warr.arr', watches: ['$random', { path: 'list', watches: ['innerA'] } ], key: '$random'},
        {path: 'nestedArr', watches: { path: '', watches: [ 'innerValue' ] } }
    ]

    expect(getMapedObject(reactive, watches)).toEqual({
        a: {
            b: 3,
            arr: [1, 2]
        },
        arr: [{
            a: 1
        }, {
            a: 3
        }],
        warr: {
            arr: [{
                $random: expect.any(Number),
                list: [{ innerA: 5 }] 
            },
            {
                $random: expect.any(Number)
            }]
        },
        nestedArr: [
            [ { innerValue: '1' } ]
        ]
    });
    expect({ v: reactive.warr.arr[0].$random}).toEqual({
        v: expect.any(Number)
    });
    
    bindWatch(reactive, watches, (d)=>{
        expect(d).toEqual({
            'a.b': 4,
            'a.arr': [1, 2, 5],
            'arr[0].a': 6,
            'warr.arr[0].list':  [{ innerA: 5 }, { innerA: 7}],
            'warr.arr[1]': {
                $random: expect.any(Number)
            },
            'nestedArr[0][0].innerValue': '2'
        })
        
        done();
    });
    (reactive as any).change();
})