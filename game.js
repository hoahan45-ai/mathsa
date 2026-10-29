const $=id=>document.getElementById(id);let level=0,score=0,done=false,missed=false;
const levels=[{title:'토끼의 피크닉을 구해줘!',mission:'삼각형 돗자리의 무게중심은 어디일까요? 동물 친구를 끌어서 무게중심에 놓아주세요.',hint:'세 꼭짓점에서 마주 보는 변의 중점으로 선을 그어보세요. 세 선이 만나는 지점이에요.',type:'point'}, {title:'아기 곰에게 다리를 놓아줘!',mission:'A에서 출발해 중선 AM을 따라가요. AG : GM의 비율은 무엇일까요?',hint:'꼭짓점에서 무게중심까지가 더 길어요. AG는 GM의 두 배!',options:['1 : 1','2 : 1','1 : 2'],correct:1}, {title:'여우에게 간식을 배달해줘!',mission:'중선 AM의 길이는 12 m예요. 꼭짓점 A에서 무게중심 G까지는 몇 m일까요?',hint:'AG는 전체 중선 AM의 ⅔예요. 12 × ⅔를 계산하세요.',options:['4 m','6 m','8 m'],correct:2}, {title:'마지막 출동! 고양이의 집으로',mission:'GM이 5 m일 때, 중선 AM의 전체 길이는 몇 m일까요?',hint:'AG : GM = 2 : 1이므로 AM은 GM의 3배예요.',options:['10 m','15 m','20 m'],correct:1}];
const shapes=[[[300,60],[100,315],[500,315]],[[140,65],[140,320],[510,320]],[[100,100],[520,140],[230,325]],[[460,60],[90,260],[510,320]],[[80,240],[490,80],[420,325]]];
const friends=['🐰','🐻','🦊','🐱','🐼'];
for(let i=1;i<shapes.length;i++)levels.splice(i,0,{title:['','곰의 직각삼각형 캠핑장','여우의 기울어진 돗자리','고양이의 길쭉한 놀이터','판다의 새로운 쉼터'][i],mission:'동물 친구를 끌어서 삼각형의 무게중심에 놓아주세요. 모양이 달라도 세 중선은 한 점에서 만나요!',hint:'각 꼭짓점과 마주 보는 변의 중점을 이은 중선을 찾아보세요.',type:'point',shape:i});
function geometry(){const v=shapes[levels[level].shape||0];return {v,g:[0,1].map(k=>v.reduce((n,p)=>n+p[k],0)/3),m:[0,1].map(k=>(v[1][k]+v[2][k])/2)}}

function answer(ok){if(done)return;if(!ok){missed=true;$('feedback').textContent='🌱 조금만 더 생각해 볼까요? 도움말을 눌러 힌트를 확인해 보세요.';return}done=true;score+=missed?50:100;$('score').textContent=`⭐ ${score}점`;$('feedback').textContent='🎉 구조 성공! 무게중심 G는 세 중선의 교점이고, AG : GM = 2 : 1이에요.';$('next').disabled=false;document.querySelectorAll('#answers button').forEach(b=>b.disabled=true);draw(true)}
function draw(reveal=false){
 const board=$('board'),l=levels[level],{v,g,m}=geometry();
 const show=reveal||l.type!=='point';
 board.innerHTML=`<defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#dce6d3"/></pattern></defs><rect width="600" height="390" fill="url(#dots)"/><text x="40" y="60" font-size="34">☁️</text><text x="520" y="340" font-size="35">🌳</text><polygon points="${v.map(p=>p.join(',')).join(' ')}" fill="#ffefbf" stroke="#cfac63" stroke-width="3"/>`;
 const add=html=>board.insertAdjacentHTML('beforeend',html);
 if(show||l.hinted)v.forEach((p,i)=>{const q=v[(i+1)%3],r=v[(i+2)%3];add(`<path d="M${p} L${(q[0]+r[0])/2},${(q[1]+r[1])/2}" stroke="#72a489" stroke-width="2" stroke-dasharray="7 5"/>`)});
 v.forEach((p,i)=>add(`<text x="${p[0]-10}" y="${p[1]-15}" fill="#54745d">${'ABC'[i]}</text>`));
 if(show)add(`<circle cx="${g[0]}" cy="${g[1]}" r="8" fill="#43896b"/><text x="${g[0]+20}" y="${g[1]}" fill="#32684e">G</text><text x="${m[0]}" y="${m[1]+25}" fill="#54745d">M</text>`);
 const movable=l.type==='point'&&!reveal;
 const start=reveal?g:[65,190];
 add(`<g id="friend" transform="translate(${start})" ${movable?'tabindex="0" role="button" aria-label="동물 친구: 방향키로 이동, Enter 또는 스페이스로 놓기"':''}><circle r="30" fill="white" stroke="#81ad91" stroke-width="2"/><text text-anchor="middle" dominant-baseline="central" font-size="39">${friends[l.shape||0]}</text></g>`);
 if(!movable)return;
 const friend=$('friend');let xy=[...start],dragging=false;
 friend.style.cursor='grab';
 const move=(x,y)=>{xy=[Math.max(30,Math.min(570,x)),Math.max(30,Math.min(360,y))];friend.setAttribute('transform',`translate(${xy})`)};
 const locate=e=>{const matrix=board.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());move(p.x,p.y)};
 const drop=()=>answer(Math.hypot(xy[0]-g[0],xy[1]-g[1])<=24);
 friend.onpointerdown=e=>{e.preventDefault();dragging=true;friend.setPointerCapture(e.pointerId);friend.focus();locate(e)};
 friend.onpointermove=e=>{if(dragging)locate(e)};
 friend.onpointerup=e=>{if(!dragging)return;locate(e);dragging=false;drop()};
 friend.onpointercancel=()=>{dragging=false};
 friend.onkeydown=e=>{const deltas={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(deltas[e.key]){e.preventDefault();const d=deltas[e.key];move(xy[0]+d[0],xy[1]+d[1])}else if(e.key==='Enter'||e.key===' '){e.preventDefault();drop()}};
}
function render(){done=false;missed=false;const l=levels[level];$('stage').textContent=`구조 작전 ${level+1} / ${levels.length}`;$('progress').style.width=`${(level+1)*100/levels.length}%`;$('title').textContent=l.title;$('mission').textContent=l.mission;$('feedback').textContent='준비됐나요? 함께 출동해요!';$('next').disabled=true;$('next').textContent=level===levels.length-1?'구조 결과 보기 →':'다음 구조 →';$('answers').replaceChildren();(l.options||[]).forEach((o,i)=>{const b=document.createElement('button');b.textContent=o;b.onclick=()=>answer(i===l.correct);$('answers').append(b)});draw()}
$('hint').onclick=()=>{levels[level].hinted=true;draw();$('feedback').textContent='💡 '+levels[level].hint};$('next').onclick=()=>{if(!done)return;if(level<levels.length-1){level++;render()}else{$('title').textContent='모든 친구들을 구했어요! 🏅';$('mission').textContent=`최종 점수 ${score} / ${levels.length*100}점 · 당신은 멋진 무게중심 구조대원이에요!`;$('feedback').textContent='기억해요: 세 중선의 교점이 무게중심, 꼭짓점부터 2 : 1!';$('next').textContent='처음부터 다시 하기 ↻';$('next').onclick=()=>location.reload();$('hint').disabled=true}};render();
