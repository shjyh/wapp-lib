import CreateWrapperPage, { WrapperPage } from '../wrapper/CreateWrapperPage';
import { wrapper } from '../make';

test('page 生命周期&setData调用', done=>{
    let _opt = null;

    function Page(opt){
        _opt = opt;
    }

    const liftCircleMock = jest.fn(hook=>{});

    CreateWrapperPage(Page)(wrapper({
        data: {
            a: 1,
            b: 2,
            c: 3
        },
        onInit(){
            liftCircleMock('onInit');
            expect(this.$route).toBe('testroute');
        },
        onShow(){
            liftCircleMock('onShow');
        },
        onHide(){
            liftCircleMock('onHide');
        },
        onUnload(){
            liftCircleMock('onUnload');
            
            expect(liftCircleMock.mock.calls).toEqual([
                ['onInit'], ['beforeLoad'], ['onLoad'], ['onShow'], ['onHide'],
                ['onShow'], ['onUnload']
            ]);
            expect(setDataMock.mock.calls).toEqual([
                [{a: 1, b: 2}], [{a: 5, b: 6}], [{ a: 8, b: 9 }]
            ])
            done()
        },
        onLoad(){
            liftCircleMock('onLoad');
        },
        beforeLoad(){
            liftCircleMock('beforeLoad');
        },
        methods: {
            testA(){
                this.c = 4;
            },
            testB(){
                this.a = 5;
                this.b = 6;
                this.c = 7;
            },
            testC(){
                this.a = 8;
                this.b = 9;
            }
        }
    }), ['a', 'b'], ['testA', 'testB', 'testC']);

    const setDataMock = jest.fn((d)=>{});

    const pageInstance = {
        route: 'testroute',
        setData(d){
            setDataMock(d);
        }
    }
    _opt.onLoad.call(pageInstance);
    _opt.onShow.call(pageInstance);
    _opt.testA.call(pageInstance);
    setTimeout(()=>{
        _opt.onHide.call(pageInstance);
        _opt.testB.call(pageInstance);
        setTimeout(()=>{
            _opt.testC.call(pageInstance);
            setTimeout(()=>{
                _opt.onShow.call(pageInstance);
                _opt.onUnload.call(pageInstance);
            }, 200)
        }, 200)
    }, 200)
});