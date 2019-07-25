
type ApiName = keyof wx.Wx;

interface ApiMeta<Opt, Result = wx.GeneralCallbackResult, Err = wx.GeneralCallbackResult, Complete = wx.GeneralCallbackResult> {
    opt: Opt;
    result: Result;
    err: Err,
    complete: Complete
}

export interface ApiTypeMap{
    checkSession: ApiMeta<wx.CheckSessionOption>;
    login: ApiMeta<wx.LoginOption, wx.LoginSuccessCallbackResult>;
    getUserInfo: ApiMeta<wx.GetUserInfoOption, wx.GetUserInfoSuccessCallbackResult>;
    redirectTo: ApiMeta<wx.RedirectToOption>;
    switchTab: ApiMeta<wx.SwitchTabOption>;
    reLaunch: ApiMeta<wx.ReLaunchOption>;
    navigateTo: ApiMeta<wx.NavigateToOption>;
    navigateBack: ApiMeta<wx.NavigateBackOption>;
    chooseImage: ApiMeta<wx.ChooseImageOption, wx.ChooseImageSuccessCallbackResult>;
    authorize: ApiMeta<wx.AuthorizeOption>;
    getSetting: ApiMeta<wx.GetSettingOption, wx.GetSettingSuccessCallbackResult>;
    openSetting: ApiMeta<wx.OpenSettingOption, wx.OpenSettingSuccessCallbackResult>;
    uploadFile: ApiMeta<wx.UploadFileOption, wx.UploadFileSuccessCallbackResult>;
    getStorage: ApiMeta<wx.GetStorageOption, wx.GetStorageSuccessCallbackResult>;
    setStorage: ApiMeta<wx.SetStorageOption>;
    clearStorage: ApiMeta<wx.ClearStorageOption>;
    showActionSheet: ApiMeta<wx.ShowActionSheetOption, wx.ShowActionSheetSuccessCallbackResult>;
    getSystemInfo: ApiMeta<wx.GetSystemInfoOption, wx.GetSystemInfoSuccessCallbackResult>;
    getBackgroundAudioPlayerState: ApiMeta<wx.GetBackgroundAudioPlayerStateOption, wx.GetBackgroundAudioPlayerStateSuccessCallbackResult>;
    startRecord: ApiMeta<wx.WxStartRecordOption, wx.StartRecordSuccessCallbackResult>;
    downloadFile: ApiMeta<wx.DownloadFileOption, wx.DownloadFileSuccessCallbackResult>;
    playVoice: ApiMeta<wx.PlayVoiceOption>;
    getLocation: ApiMeta<wx.GetLocationOption, wx.GetLocationSuccessCallbackResult>;
    showModal: ApiMeta<wx.ShowModalOption, wx.ShowModalSuccessCallbackResult>;
    getImageInfo: ApiMeta<wx.GetImageInfoOption, wx.GetImageInfoSuccessCallbackResult>;
    saveImageToPhotosAlbum: ApiMeta<wx.SaveImageToPhotosAlbumOption>;
    previewImage: ApiMeta<wx.PreviewImageOption>;
    setClipboardData: ApiMeta<wx.SetClipboardDataOption>;
    chooseAddress: ApiMeta<wx.ChooseAddressOption, wx.ChooseAddressSuccessCallbackResult>;
    makePhoneCall: ApiMeta<wx.MakePhoneCallOption>;
    requestPayment: ApiMeta<wx.RequestPaymentOption>;
    scanCode: ApiMeta<wx.ScanCodeOption, wx.ScanCodeSuccessCallbackResult>;
}
type WrapperApiName = keyof ApiTypeMap;
type PromisifyApi<T extends WrapperApiName> = (opt?: ApiTypeMap[T]['opt']) => Promise<ApiTypeMap[T]['result']>;
type WrapperApiHook<H extends keyof ApiMeta<any, any>> = <T extends WrapperApiName>(api: T, arg: ApiTypeMap[T][H]) => void

interface HookParamKeyMap {
    before: 'opt';
    success: 'result';
    fail: 'err';
    complete: 'complete';
}
const hooks = {
    before: [] as WrapperApiHook<'opt'>[],
    success: [] as WrapperApiHook<'result'>[],
    fail: [] as WrapperApiHook<'err'>[],
    complete: [] as WrapperApiHook<'complete'>[]
};

export function addHook<H extends keyof typeof hooks>(type: H, fn: WrapperApiHook<HookParamKeyMap[H]>){
    hooks[type].push(fn);
}

function runHook<H extends keyof typeof hooks, T extends WrapperApiName>(type: H, api: T, arg: ApiTypeMap[T][HookParamKeyMap[H]]): void
function runHook(type, api, arg){
    for(let fn of hooks[type]){
        fn(api, arg);
    }
}

function wrapperApi<T extends WrapperApiName>(api: T): PromisifyApi<T>{
    return function(opt = {}){
        const token = Date.now() + '_' + Math.round(Math.random()*10000);
        console.log('token:', token, 'wxp trigger api:', api, opt);
        runHook('before', api, opt);

        return new Promise((r, j)=>{
            opt.success = function(result){
                runHook('success', api, result);
                console.log('token:', token, 'wxp trigger success:', api, result);
                r(result);
            };
            opt.fail = function(err){
                runHook('fail', api, err);
                console.log('token:', token, 'wxp trigger fail:', api, err);
                j(err);
            };
            opt.complete = function(obj){
                runHook('complete', api, obj);
            };
            wx[api](opt as any);
        })
    }
}

const wxp = {} as {
    [key in WrapperApiName]: PromisifyApi<key>;
}

for(let key of [
    'checkSession',
    'login',
    'getUserInfo',
    'redirectTo',
    'switchTab',
    'chooseImage',
    'authorize',
    'getSetting',
    'openSetting',
    'navigateTo',
    'navigateBack',
    'uploadFile',
    'reLaunch',
    'getStorage',
    'setStorage',
    'clearStorage',
    'showActionSheet',
    'getSystemInfo',
    'getBackgroundAudioPlayerState',
    'startRecord',
    'downloadFile',
    'playVoice',
    'getLocation',
    'showModal',
    'getImageInfo',
    'saveImageToPhotosAlbum',
    'previewImage',
    'setClipboardData',
    'chooseAddress',
    'makePhoneCall',
    'requestPayment',
    'scanCode'
] as WrapperApiName[]){
    wxp[key] = wrapperApi(key) as any;
}

export default wxp;