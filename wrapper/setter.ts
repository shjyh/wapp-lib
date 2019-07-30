import { defineSetter } from '../observer/setter'

defineSetter({
    before(val){
        if(
            val&&
            ['input','blur','confirm'].includes(val.type)&&
            val.target&&
            val.currentTarget&&
            'detail' in val
        ){
            if((typeof val.detail==='object')&&'value' in val.detail){
                return val.detail.value;
            } else return val.detail;
        }
        return val;
    }
});

