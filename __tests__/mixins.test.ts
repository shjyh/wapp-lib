import Reactive from '../observer/Reactive';
import { wrapper, mixins as wrapperMixins } from '../make';
import { mixins } from '../wrapper/utils';


test('mixins 成功', done=>{
    const watchMock = jest.fn(()=>{});
    const beforeLoadMock = jest.fn(()=>{});

    const opt = mixins(wrapperMixins(wrapper({
        data(){ return {
            a: {
                b: { c: 1 }
            },
            c: 'c'
        }},
        computed: {
            testA(): string{
                return 'a';
            }
        },
        watch: {
            'a.b.c'(){
                watchMock();
            }
        },
        beforeLoad(){
            beforeLoadMock();
        }
    }))({
        data(){ return {
            a: {
                d: 4
            }
        }},
        computed: {
            testA(){
                return 'b'
            }
        },
        watch: {
            'a.b.c'(){
                watchMock();
            }
        },
        beforeLoad(){
            beforeLoadMock();
        }
    }) as any);

    expect((opt.data as any)()['a']['d']).toBe(4);
    expect((opt.computed['testA'] as any)()).toBe('b');
    opt.beforeLoad();
    expect(beforeLoadMock.mock.calls.length).toBe(2);

    const reactive = new Reactive(opt);
    reactive.$watch('a.b.c', ()=>{
        expect(watchMock.mock.calls.length).toBe(2);
        done();
    })
    reactive['a']['b']['c'] = 6;
})