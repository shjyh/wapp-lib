

interface ApiMeta<Opt, Result = WechatMiniprogram.GeneralCallbackResult, Err = WechatMiniprogram.GeneralCallbackResult, Complete = WechatMiniprogram.GeneralCallbackResult> {
    opt: Opt;
    result: Result;
    err: Err,
    complete: Complete
}

export interface ApiTypeMap{
    checkSession: ApiMeta<WechatMiniprogram.CheckSessionOption>;
    login: ApiMeta<WechatMiniprogram.LoginOption, WechatMiniprogram.LoginSuccessCallbackResult>;
    getUserInfo: ApiMeta<WechatMiniprogram.GetUserInfoOption, WechatMiniprogram.GetUserInfoSuccessCallbackResult>;
    redirectTo: ApiMeta<WechatMiniprogram.RedirectToOption>;
    switchTab: ApiMeta<WechatMiniprogram.SwitchTabOption>;
    reLaunch: ApiMeta<WechatMiniprogram.ReLaunchOption>;
    navigateTo: ApiMeta<WechatMiniprogram.NavigateToOption>;
    navigateBack: ApiMeta<WechatMiniprogram.NavigateBackOption>;
    chooseImage: ApiMeta<WechatMiniprogram.ChooseImageOption, WechatMiniprogram.ChooseImageSuccessCallbackResult>;
    authorize: ApiMeta<WechatMiniprogram.AuthorizeOption>;
    getSetting: ApiMeta<WechatMiniprogram.GetSettingOption, WechatMiniprogram.GetSettingSuccessCallbackResult>;
    openSetting: ApiMeta<WechatMiniprogram.OpenSettingOption, WechatMiniprogram.OpenSettingSuccessCallbackResult>;
    uploadFile: ApiMeta<WechatMiniprogram.UploadFileOption, WechatMiniprogram.UploadFileSuccessCallbackResult>;
    getStorage: ApiMeta<WechatMiniprogram.GetStorageOption, WechatMiniprogram.GetStorageSuccessCallbackResult>;
    setStorage: ApiMeta<WechatMiniprogram.SetStorageOption>;
    clearStorage: ApiMeta<WechatMiniprogram.ClearStorageOption>;
    showActionSheet: ApiMeta<WechatMiniprogram.ShowActionSheetOption, WechatMiniprogram.ShowActionSheetSuccessCallbackResult>;
    getSystemInfo: ApiMeta<WechatMiniprogram.GetSystemInfoOption, WechatMiniprogram.GetSystemInfoSuccessCallbackResult>;
    getBackgroundAudioPlayerState: ApiMeta<WechatMiniprogram.GetBackgroundAudioPlayerStateOption, WechatMiniprogram.GetBackgroundAudioPlayerStateSuccessCallbackResult>;
    startRecord: ApiMeta<WechatMiniprogram.WxStartRecordOption, WechatMiniprogram.StartRecordSuccessCallbackResult>;
    downloadFile: ApiMeta<WechatMiniprogram.DownloadFileOption, WechatMiniprogram.DownloadFileSuccessCallbackResult>;
    playVoice: ApiMeta<WechatMiniprogram.PlayVoiceOption>;
    getLocation: ApiMeta<WechatMiniprogram.GetLocationOption, WechatMiniprogram.GetLocationSuccessCallbackResult>;
    showModal: ApiMeta<WechatMiniprogram.ShowModalOption, WechatMiniprogram.ShowModalSuccessCallbackResult>;
    getImageInfo: ApiMeta<WechatMiniprogram.GetImageInfoOption, WechatMiniprogram.GetImageInfoSuccessCallbackResult>;
    saveImageToPhotosAlbum: ApiMeta<WechatMiniprogram.SaveImageToPhotosAlbumOption>;
    previewImage: ApiMeta<WechatMiniprogram.PreviewImageOption>;
    setClipboardData: ApiMeta<WechatMiniprogram.SetClipboardDataOption>;
    getClipboardData: ApiMeta<WechatMiniprogram.GetClipboardDataOption, WechatMiniprogram.GetClipboardDataSuccessCallbackOption>;
    chooseAddress: ApiMeta<WechatMiniprogram.ChooseAddressOption, WechatMiniprogram.ChooseAddressSuccessCallbackResult>;
    makePhoneCall: ApiMeta<WechatMiniprogram.MakePhoneCallOption>;
    requestPayment: ApiMeta<WechatMiniprogram.RequestPaymentOption>;
    scanCode: ApiMeta<WechatMiniprogram.ScanCodeOption, WechatMiniprogram.ScanCodeSuccessCallbackResult>;
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
    'getClipboardData',
    'chooseAddress',
    'makePhoneCall',
    'requestPayment',
    'scanCode'
] as WrapperApiName[]){
    wxp[key] = wrapperApi(key) as any;
}

export default wxp;