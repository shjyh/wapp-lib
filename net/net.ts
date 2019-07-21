import EventEmitter from '../EventEmitter';

interface Net {
    onLine: boolean
}
class Net extends EventEmitter<'offline'|'online'>{
    constructor(){
        super();
        let connected = true;
        wx.getNetworkType({
            success(res){
                connected = res.networkType!=='none';
            }
        });
        wx.onNetworkStatusChange(result=>{
            if(connected===result.isConnected) return;

            connected = result.isConnected;
            if(result.isConnected) this.trigger('online')
            else this.trigger('offline');
        });

        Object.defineProperty(this, 'onLine', {
            get(){
                return connected;
            }
        })
    }
}

export default new Net();