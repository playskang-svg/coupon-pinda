(function(){
var d=document,toast=d.getElementById('toast'),t;
function say(m){toast.textContent=m;toast.classList.add('show');clearTimeout(t);t=setTimeout(function(){toast.classList.remove('show')},1800)}
try{var th=localStorage.getItem('theme');if(th)d.documentElement.dataset.theme=th}catch(e){}
d.getElementById('theme').onclick=function(){var h=d.documentElement,n=(h.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))==='dark'?'light':'dark';h.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}};
// 코드 복사 → 토스트 → 새 창으로 스토어 이동 (복사 실패해도 이동은 함)
d.addEventListener('click',function(e){var b=e.target.closest('.code');if(!b)return;var go=function(){b.classList.add('done');say('✅ '+b.dataset.code+' 복사됨 · 스토어로 이동');setTimeout(function(){window.open(b.dataset.go,'_blank','noopener')},500)};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(b.dataset.code).then(go,go)}else{var i=d.createElement('textarea');i.value=b.dataset.code;d.body.appendChild(i);i.select();try{d.execCommand('copy')}catch(x){}i.remove();go()}});
// 필터 탭
d.querySelectorAll('.filters button').forEach(function(f){f.onclick=function(){d.querySelectorAll('.filters button').forEach(function(x){x.classList.remove('on')});f.classList.add('on');d.querySelectorAll('.cp').forEach(function(c){c.classList.toggle('hide',f.dataset.f!=='all'&&c.dataset.type!==f.dataset.f)})}});
// 홈 검색: 스토어 카드 + 쿠폰 카드 동시 필터
var q=d.getElementById('q');if(q)q.oninput=function(){var v=q.value.trim().toLowerCase();d.querySelectorAll('.store').forEach(function(s){s.style.display=!v||s.textContent.toLowerCase().indexOf(v)>-1?'':'none'});d.querySelectorAll('.cp').forEach(function(c){c.classList.toggle('hide',!!v&&c.dataset.q.indexOf(v)<0)});d.querySelectorAll('.cat').forEach(function(c){c.style.display=c.querySelector('.store:not([style*="none"]),.cp:not(.hide)')?'':'none'})};
})();
