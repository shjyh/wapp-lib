import Reactive from '../observer/Reactive';
import { wrapper } from '../make';
import { defineSetter } from '../observer/setter';

test('reactive 响应式测试', done => {
    const reactive = new Reactive(wrapper({
        data: {
            a: 1,
            obj: {
                a: 1
            },
            arr: [
                { value: 1 }
            ],
            arrOp: [
                { value: 1 }
            ]
        },
        computed: {
            b(){
                return this.a * 2
            }
        },
        methods: {
            run(){
                this.a = 3;
            }
        }
    })) as any;

    expect(reactive.b).toBe(2);
    reactive.run();
    expect(reactive.b).toBe(6);

    function testPropA(){
        reactive.$watch('a', (newV, oldV)=>{
            expect(newV).toBe(4);
            expect(oldV).toBe(3);
            testPropObj();
        });
        reactive.a = 4;
    }
    function testPropObj(){
        reactive.$watch(function(this:any){
            return this.obj;
        }, (newV)=>{
            expect(newV.a).toBe(2);
            testPropArr();
        }, {deep: true});
        reactive.obj.a = 2;
    }

    function testPropArr(){
        reactive.$watch('arr.0.value', (newV)=>{
            expect(newV).toBe(2);
            testPropArrOp();
        });
        reactive.arr[0].value = 2;
    }

    function testPropArrOp(){
        reactive.$watch('arrOp', ()=>{
            done();
        });
        reactive.arrOp.push({value: 3});
    }

    testPropA();
})

test('reactive setter 测试&data函数测试', ()=>{
    defineSetter({
        before(v){
            if(v===2) return 3;
        }
    });

    const reactive = new Reactive(wrapper({
        data(){ return {
            a: 1
        }}
    })) as any;

    reactive.a = 2;
    expect(reactive.a).toBe(3);
    reactive.a = 4;
    expect(reactive.a).toBe(4);
})