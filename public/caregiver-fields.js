const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const hourText=h=>`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round(h%1*60)).padStart(2,'0')}`;
export function caregiverFields(c={},demo=false){
 const options=(value,end=false)=>Array.from({length:97},(_,i)=>i/4).filter(h=>end?h>0:h<24).map(h=>`<option value="${h}" ${h===value?'selected':''}>${hourText(h)}</option>`).join('');
 return `${!c.id?'<label>성함<input name="name" required maxlength="50" autocomplete="name"></label>':''}
 ${demo?`<label>희망 근무 지역<select name="regionId" aria-label="희망 근무 지역"><option value="yeonnam" ${c.regionId==='yeonnam'?'selected':''}>서울 마포구 연남동</option><option value="seogyo" ${c.regionId==='seogyo'?'selected':''}>서울 마포구 서교동</option><option value="gangnam" ${c.regionId==='gangnam'?'selected':''}>서울 강남구 역삼동</option></select></label><p class="subtitle">체험 지역의 가상 위치를 사용합니다.</p>`:`<label>희망 근무 지역의 기준 주소<input name="address" required maxlength="200" placeholder="예: 서울 마포구 성미산로 189" value="${esc(c.address||'')}"></label><p class="subtitle">이 주소 주변 5km 안에서 돌봄을 연결합니다. 네이버 주소 검색으로 위치를 확인합니다.</p>`}
 <label>연락받을 전화번호<input name="phone" type="tel" maxlength="30" autocomplete="tel" placeholder="010-1234-5678" value="${esc(c.phone||'')}"></label><p class="subtitle">담당 어르신 화면의 전화 버튼에 사용합니다.</p>
 <fieldset class="work-days"><legend>희망 근무 요일</legend><div class="day-list">${[1,2,3,4,5,6,0].map(d=>`<label><input type="checkbox" name="days" value="${d}" ${(c.days||[1,2,3,4,5]).includes(d)?'checked':''}>${'일월화수목금토'[d]}</label>`).join('')}</div></fieldset>
 <div class="split"><label>시작 시간<select name="from" aria-label="시작 시간">${options(c.from??9)}</select></label><label>종료 시간<select name="to" aria-label="종료 시간">${options(c.to??18,true)}</select></label></div><p class="subtitle">한국 시간 · 15분 단위 · 선택한 요일마다 동일한 시간을 적용합니다.</p>
 ${!c.id?`<fieldset class="work-days"><legend>제공할 돌봄</legend><div class="day-list">${['생활 도움','병원 동행','식사 도움','외출 동행'].map(s=>`<label><input type="checkbox" name="services" value="${s}" checked>${s}</label>`).join('')}</div></fieldset>`:''}`;
}
export function caregiverValues(form){const f=new FormData(form);return {...Object.fromEntries(f),from:Number(f.get('from')),to:Number(f.get('to')),days:f.getAll('days').map(Number),services:f.getAll('services')};}
