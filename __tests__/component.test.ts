import CreateWrapperComponent from '../wrapper/CreateWrapperComponent';
import { wrapper } from '../make';

test('component 生命周期&props数据监听', done=>{
    let _opt = null;

    function Component(opt){
        _opt = opt;
    }

    const liftCircleMock = jest.fn(hook=>{});

    CreateWrapperComponent(Component)(wrapper({
        props: {
            pa: String,
            pb: {
                type: Object,
                default(){
                    return { value: 1 }
                }
            }
        },
        created(){
            expect(this.pa).toBe('');
            expect(this.pb.value).toBe(1);

            liftCircleMock('created');
        },
        attached(){
            liftCircleMock('attached');
        },
        moved(){
            expect(this.pa).toBe('testInput');
            liftCircleMock('moved');
        },
        ready(){
            liftCircleMock('ready');
        },
        detached(){
            liftCircleMock('detached');
            expect(liftCircleMock.mock.calls).toEqual([
                ['created'], ['attached'], ['ready'], ['moved'], ['onPageHide'],
                ['onPageShow'], ['detached']
            ]);
            done();
        },
        onPageShow(){
            liftCircleMock('onPageShow');
        },
        onPageHide(){
            liftCircleMock('onPageHide');
        }
    }), [], []);

    const componentInstance = {
        setData(){}
    };

    _opt.lifetimes.created.call(componentInstance);
    _opt.lifetimes.attached.call(componentInstance);
    _opt.lifetimes.ready.call(componentInstance);
    _opt.properties.pa.observer.call(componentInstance, 'testInput');
    _opt.lifetimes.moved.call(componentInstance);
    _opt.pageLifetimes.hide.call(componentInstance);
    _opt.pageLifetimes.show.call(componentInstance);
    _opt.lifetimes.detached.call(componentInstance);
})