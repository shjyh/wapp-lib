export default function stringify(value: any){
    return JSON.stringify(value, function(key, value){
        if(key==='$random') return;
        return value;
    });
}