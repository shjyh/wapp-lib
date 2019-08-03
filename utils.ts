export function arrayRemove(arr: Array<any>, item){
    const index = arr.indexOf(item);
    if(index !== -1){
        arr.splice(index, 1);
    }
}
export function arrayToggle(arr: Array<any>, item){
    const index = arr.indexOf(item);
    if(index !== -1){
        arr.splice(index, 1);
    }else{
        arr.push(item);
    }
}
export function arrayExchange(arr: Array<any>, i1: number, i2: number){
    const item1 = arr[i1];
    const item2 = arr[i2];
    arr.splice(i1, 1, item2);
    arr.splice(i2, 1, item1);
}


export interface DateFormatI18n {
    /**@description 从周日开始星期短文本，7位数组 */
    dayNamesShort?: Array<string>,
    /**@description 从周日开始星期长文本，7位数组 */
    dayNames?: Array<string>
    monthNamesShort?: Array<string>
    monthNames?: Array<string>
    amPm?: Array<string>
}

const dayNameString = '日一二三四五六';
const monthNamesString = '一|二|三|四|五|六|七|八|九|十|十一|十二';
const defaultDateFormatI18n = {
    dayNamesShort: dayNameString.split('').map(d => '周' + d),
    dayNames: dayNameString.split('').map(d => '星期' + d),
    monthNamesShort: monthNamesString.split('|').map(m => m + '月'),
    monthNames: monthNamesString.split('|').map(m => m + '月'),
    amPm: ['上午', '下午']
}
const dateFormatFlags: {[key: string]: (date: Date, i18n: DateFormatI18n)=>string} = {
    D(d){ return d.getDate().toString() },
    DD(d){ return d.getDate().toString().padStart(2, '0') },
    d(d){ return d.getDay().toString() },
    dd(d){ return d.getDay().toString().padStart(2, '0') },
    ddd(d, i18n){ return i18n.dayNamesShort[d.getDay()] },
    dddd(d, i18n){ return i18n.dayNames[d.getDay()] },
    M(d){ return (d.getMonth() + 1).toString() },
    MM(d){ return (d.getMonth() + 1).toString().padStart(2, '0') },
    MMM(d, i18n){ return i18n.monthNamesShort[d.getMonth()] },
    MMMM(d, i18n){ return i18n.monthNames[d.getMonth()] },
    YY(d){ return d.getFullYear().toString().substr(2) },
    YYYY(d){ return d.getFullYear().toString() },
    h(d){ return (d.getHours() % 12 || 12).toString() },
    hh(d){ return (d.getHours() % 12 || 12).toString().padStart(2, '0') },
    H(d){ return d.getHours().toString() },
    HH(d){ return d.getHours().toString().padStart(2, '0') },
    m(d){ return d.getMinutes().toString() },
    mm(d){ return d.getMinutes().toString().padStart(2, '0') },
    s(d){ return d.getSeconds().toString() },
    ss(d){ return d.getSeconds().toString().padStart(2, '0') },
    S(d){ return Math.round(d.getMilliseconds() / 100).toString() },
    SS(d){ return Math.round(d.getMilliseconds() / 10).toString().padStart(2, '0') },
    SSS(d){ return d.getMilliseconds().toString().padStart(2, '0') },
    a(d, i18n){ return d.getHours() < 12 ? i18n.amPm[0] : i18n.amPm[1] },
    A(d, i18n){ return (d.getHours() < 12 ? i18n.amPm[0] : i18n.amPm[1]).toUpperCase() },
    ZZ(d) {
        const o = d.getTimezoneOffset();
        return (o > 0 ? '-' : '+') + (Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60).toString().padStart(4, '0')
    }
}

export function dateFormat(date: Date, formatString: string, i18n: DateFormatI18n = {}): string{
    i18n = Object.assign({}, defaultDateFormatI18n, i18n);
    const dateLiteral = /\[([^]*?)\]/gm;
    const dateToken = /d{1,4}|M{1,4}|YY(?:YY)?|S{1,3}|ZZ|([HhMsDm])\1?|[aA]|"[^"]*"|'[^']*'/g;

    const literals: Array<string> = [];
    formatString = formatString.replace(dateLiteral, ($0, $1)=>{
        literals.push($1);
        return '??';
    });

    formatString = formatString.replace(dateToken, $0 => {
        return $0 in dateFormatFlags ? dateFormatFlags[$0](date, i18n) : $0;
    })

    return formatString.replace(/\?\?/g, () => {
        return literals.shift();
    });
}

export function dateDaySpan(d1: Date, d2: Date): number{
    const from = new Date(dateFormat(d1, 'YYYY-MM-DD'));
    const to = new Date(dateFormat(d2, 'YYYY-MM-DD'));
    return (to.valueOf() - from.valueOf()) / (3600 * 1000 * 24);
}

export function parseDate(str: string|number): Date{
    if(typeof str === 'number') return new Date(str);
    const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.{0,1}\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    const dateReg = /^(\d{4})([\/\-\.])(\d{1,2})\2(\d{1,2})( (\d{1,2}):(\d{1,2})(:(\d{1,2}))?)?$/;

    if(reISO.test(str)){
        const t = new Date(str);
        if(Number.isNaN(t.valueOf())) return null;
        return t;
    }

    const m = str.match(dateReg);
    if(!m) return null;

    return new Date(
        p(m[1]), p(m[3])-1, p(m[4]), 
        p(m[6]||0), p(m[7]||0), p(m[9]||0)
    )

    function p(s:string|number): number {
        if(typeof s === 'number') return s;
        return Number.parseInt(s, 10);
    }
}