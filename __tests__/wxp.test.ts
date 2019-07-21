import wxp, { addHook } from '../wxp';

global['wx'] = {};

wx.checkSession = function(opt){
    switch(opt['mock']){
        case 'success':
            opt.success&&opt.success({errMsg: 'success'});
            break;
        case 'fail':
            opt.fail&&opt.fail({errMsg: 'fail'});
            break;
    }
    opt.complete&&opt.complete({errMsg: 'complete'});
}

test('wxp success回调挂载', ()=>{
    return expect(wxp.checkSession({mock: 'success'} as any)).resolves.toEqual({
        errMsg: 'success'
    });
});
test('wxp fail回调挂载', ()=>{
    return expect(wxp.checkSession({mock: 'fail'} as any)).rejects.toEqual({
        errMsg: 'fail'
    });
});

test('wxp hook注入', ()=>{
    const beforeHookMock = jest.fn((api, opt)=>{});
    const successHookMock = jest.fn((api, opt)=>{});
    const failHookMock = jest.fn((api, opt)=>{});
    const completeHookMock = jest.fn((api, opt)=>{});
    
    addHook('before', beforeHookMock);
    addHook('success', successHookMock);
    addHook('fail', failHookMock);
    addHook('complete', completeHookMock);

    return Promise.all([
        wxp.checkSession({mock: 'success'} as any),
        wxp.checkSession({mock: 'fail'} as any).catch(()=>{})
    ]).then(()=>{
        const b = beforeHookMock.mock.calls;
        const s = successHookMock.mock.calls;
        const f = failHookMock.mock.calls;
        const c = completeHookMock.mock.calls;

        const api = 'checkSession';
        expect([
            b.length, s.length, f.length, c.length,
            b[0][0] === api, s[0][0] === api, f[0][0] === api, c[0][0] === api,
            b[0][1].mock === 'success', s[0][1].errMsg === 'success', 
            f[0][1].errMsg === 'fail', c[0][1].errMsg === 'complete'
        ]).toEqual([
            2,1,1,2,
            true, true, true, true,
            true, true,
            true, true
        ]);
    })
});