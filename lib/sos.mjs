// Compatibility entry: retired endpoints cannot create or resolve requests.
export {normalizePhone} from './phone.mjs';
export function createSos(){throw Object.assign(Error('제공이 종료된 기능입니다.'),{status:410});}
export const resolveSos=createSos;
export const careContact=()=>null;
