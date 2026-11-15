export function normalizePhone(value){
 if(value==null||value==='')return '';
 if(typeof value!=='string'||value.length>30||!/^[+\d ()-]+$/.test(value))throw Error('전화번호를 확인해 주세요.');
 const phone=value.replace(/[ ()-]/g,'');
 if(!/^\+?\d{8,15}$/.test(phone))throw Error('전화번호를 확인해 주세요.');
 return phone;
}
