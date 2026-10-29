'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const physics = window.YoungPhysics;
  const wave = $('wave'), space = $('space');
  const context = wave.getContext('2d');
  const controls = ['lambda', 'distance', 'length', 'width', 'mode'];
  const presets = { baseline: [550, 250, 150, 40], red: [660, 250, 150, 40], blue: [450, 250, 150, 40], far: [550, 250, 300, 40] };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let time = 0, running = !reducedMotion, previous = null, currentStage = -1;
  let yaw = -.7, pitch = .38, zoom = 10, pointer = null;
  let renderer = null, sceneDirty = true, lastFrame = 0;
  const stageStarts = [0, 1.6, 3.2, 5.2];
  function parameters() {
    return {
      wavelength: +$('lambda').value * 1e-9,
      separation: +$('distance').value * 1e-6,
      screenDistance: +$('length').value / 100,
      slitWidth: +$('width').value * 1e-6,
      mode: $('mode').value
    };
  }
  function color(p, alpha = 1) {
    return `rgba(${physics.wavelengthRGB(p.wavelength * 1e9).join(',')},${alpha})`;
  }
  function update() {
    const p = parameters();
    $('lv').textContent = `${$('lambda').value} nm`;
    $('dv').textContent = `${(p.separation * 1000).toFixed(2)} mm`;
    $('Lv').textContent = `${p.screenDistance.toFixed(2)} m`;
    $('av').textContent = `${(p.slitWidth * 1000).toFixed(3)} mm`;
    $('distance').disabled = p.mode === 'single';
    const descriptions = {
      double: '같은 광원에서 나온 빛이 두 슬릿을 지나 일정한 위상 관계로 중첩됩니다.',
      single: '슬릿 하나를 가렸습니다. 한 틈 안에서 퍼지는 빛의 회절을 관찰하세요.',
      incoherent: '두 슬릿의 위상 관계가 무작위인 경우입니다. 시간 평균에서 간섭 줄무늬가 사라집니다.'
    };
    $('mode-description').textContent = descriptions[p.mode];
    const interference = p.mode === 'double';
    $('result-label').textContent = interference ? '밝은 무늬 사이 간격' : '중앙 → 첫 어두운 무늬';
    $('result').textContent = `${((interference ? physics.fringeSpacing(p) : physics.firstMinimum(p)) * 1000).toFixed(2)} mm`;
    $('result-formula').textContent = interference ? 'Δy ≈ λL / d' : 'y₁ ≈ λL / a';
    $('central-intensity').textContent = p.mode === 'double' ? '4 ×' : p.mode === 'single' ? '1 ×' : '2 ×';
    $('formula-title').textContent = interference ? '보강 간섭의 조건' : p.mode === 'single' ? '단일슬릿 회절의 조건' : '위상 관계가 사라지면';
    $('formula').textContent = interference ? 'd sin θ = mλ' : p.mode === 'single' ? 'a sin θ = mλ (m ≠ 0)' : '⟨I⟩ = I₁ + I₂';
    $('explanation').textContent = interference ? '경로 차이가 파장의 정수배이면 두 빛이 보강됩니다. 반정수배이면 상쇄됩니다. 유한한 슬릿 너비에 의한 회절 포락선도 함께 계산합니다.' : p.mode === 'single' ? '중앙은 가장 밝고 넓습니다. 양쪽으로 어두운 무늬와 약한 밝은 무늬가 번갈아 나타납니다.' : '밝기의 합만 남습니다. 슬릿 너비에 의한 회절 포락선은 유지되지만, 두 슬릿의 촘촘한 간섭무늬는 없습니다.';
    $('prediction').textContent = interference ? '파장을 늘리거나 스크린을 멀리 보내면 줄무늬 사이가 넓어져요. 슬릿 간격을 늘리면 어떻게 될까요?' : '슬릿 너비를 줄여보세요. 좁은 틈을 지날수록 빛은 더 넓게 퍼져요.';
    document.querySelectorAll('[data-preset]').forEach(button => {
      const v = presets[button.dataset.preset];
      button.setAttribute('aria-pressed', String(controls.slice(0, 4).every((id, i) => +$(id).value === v[i]) && p.mode === 'double'));
    });
    currentStage = -1;
    sceneDirty = true;
    render();
  }
  function stage() { return time < 1.6 ? 0 : time < 3.2 ? 1 : time < 5.2 ? 2 : 3; }
  function updateStage() {
    const index = stage();
    if (index === currentStage) return;
    currentStage = index;
    const p = parameters();
    const titles = ['빛이 슬릿으로 향합니다', '좁은 틈이 새로운 파원이 됩니다', '퍼져 나간 파동이 만납니다', '스크린에 도착한 빛을 읽어보세요'];
    const notes = [
      '단색광의 평면 파동이 슬릿 판을 향해 나아갑니다. 파면 사이의 간격은 파장을 나타냅니다. 그림의 길이와 시간은 확대·축소한 모형입니다.',
      p.mode === 'single' ? '열린 한 슬릿에서 빛이 회절하며 퍼집니다. 위쪽 슬릿은 닫혀 있습니다.' : '두 슬릿을 통과한 빛이 각각 퍼집니다. 두 슬릿이 새로운 파원처럼 작용합니다.',
      p.mode === 'double' ? '두 파동의 위상이 같으면 보강, 반대이면 상쇄됩니다. 경로 차이에 따라 밝기가 달라집니다.' : p.mode === 'single' ? '슬릿 내부의 각 지점에서 나온 파동이 중첩되어 회절무늬를 만듭니다.' : '그림은 위상이 달라지는 예시입니다. 오른쪽 결과는 빠른 위상 변화를 시간 평균한 밝기입니다.',
      p.mode === 'double' ? '중앙은 두 경로의 길이가 같아 밝습니다. 오른쪽 그래프에서 밝은 무늬와 어두운 무늬가 번갈아 나타나는지 확인하세요.' : '중앙의 넓은 밝은 무늬와 양쪽의 약한 무늬를 살펴보세요. 두 슬릿 간섭 줄무늬와 비교해 보세요.'
    ];
    $('stage-title').textContent = `${index + 1}. ${titles[index]}`;
    $('stage-description').textContent = notes[index];
    document.querySelectorAll('[data-stage]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.stage === index)));
  }
  function playback() {
    $('play').textContent = running ? 'Ⅱ 일시정지' : '▶ 재생';
    $('play').setAttribute('aria-label', running ? '실험 일시정지' : '실험 재생');
    $('play-status').innerHTML = `<i></i> ${running ? '실험 중' : '관찰 중 · 일시정지'}`;
  }
  function fit(canvas) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const changed = canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio);
    if (changed) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    return { width, height, ratio, changed };
  }
  function drawWave() {
    const { width: w, height: h, ratio } = fit(wave);
    if (!w || !h) return;
    const c = context, p = parameters();
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#101e27'; c.fillRect(0, 0, w, h);
    const narrow = w < 520, left = 16, barrier = w * .25, screen = w * .71;
    const top = 43, bottom = h - 37, mid = (top + bottom) / 2, plotWidth = w * .18;
    const visualSeparation = 26 + (p.separation * 1e6 - 100) / 500 * 52;
    const opening = 5 + (p.slitWidth * 1e6 - 10) / 70 * 9;
    const slits = p.mode === 'single' ? [mid + visualSeparation / 2] : [mid - visualSeparation / 2, mid + visualSeparation / 2];
    c.font = `${narrow ? 9 : 11}px system-ui`; c.fillStyle = '#b8c9c2';
    c.fillText('입사광', left, 24); c.fillText('슬릿', barrier - 8, 24);
    c.fillText('스크린', screen - 8, 24); c.fillText('상대 강도', screen + 31, 24);
    // Background grid and optical axis.
    c.strokeStyle = '#ffffff08'; c.lineWidth = 1;
    for (let y = top; y < bottom; y += 28) { c.beginPath(); c.moveTo(10, y); c.lineTo(w - 10, y); c.stroke(); }
    c.setLineDash([3, 5]); c.strokeStyle = '#6d8b8d55'; c.beginPath(); c.moveTo(left, mid); c.lineTo(w - 10, mid); c.stroke(); c.setLineDash([]);
    const spacing = 12 + (p.wavelength * 1e9 - 380) / 370 * 15;
    const phase = time * 32 % spacing;
    const incomingFront = Math.min(1, time / 1.6) * barrier;
    c.strokeStyle = color(p, .65); c.lineWidth = 1.3;
    for (let x = phase; x < incomingFront; x += spacing) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke(); }
    c.fillStyle = '#8ea29f'; c.fillRect(barrier, top, 5, bottom - top);
    c.fillStyle = '#101e27';
    slits.forEach(y => c.fillRect(barrier - 1, y - opening / 2, 7, opening));
    // Wavefronts only occupy the region reached by light at this observation stage.
    const reach = Math.max(0, (time - 1.6) / (5.2 - 1.6)) * (screen - barrier);
    slits.forEach((y, i) => {
      c.save(); c.beginPath(); c.rect(barrier + 6, top, screen - barrier - 7, bottom - top); c.clip();
      const offset = p.mode === 'incoherent' && i === 1 ? Math.sin(time * 7) * spacing * .5 : 0;
      c.strokeStyle = color(p, i ? .5 : .65);
      for (let radius = (phase + offset + spacing) % spacing; radius < Math.min(reach, w); radius += spacing) {
        c.beginPath(); c.arc(barrier + 5, y, radius, -Math.PI / 2, Math.PI / 2); c.stroke();
      }
      c.restore();
      c.fillStyle = color(p); c.beginPath(); c.arc(barrier + 3, y, 2, 0, Math.PI * 2); c.fill();
    });
    const arrived = time >= 5.2;
    const graphX = screen + 32;
    c.fillStyle = '#060f16'; c.fillRect(screen, top, 12, bottom - top);
    c.strokeStyle = '#8ca69c40'; c.strokeRect(screen - 1, top, 14, bottom - top);
    if (arrived) {
      const rgb = physics.wavelengthRGB(p.wavelength * 1e9);
      for (let y = top; y < bottom; y++) {
        const physicalY = (mid - y) / (bottom - top) * .03;
        const intensity = physics.normalizedIntensity(physicalY, p);
        c.fillStyle = `rgb(${rgb.map(v => Math.round(v * intensity)).join(',')})`;
        c.fillRect(screen, y, 12, 1);
      }
      c.beginPath(); c.moveTo(graphX, top);
      for (let y = top; y <= bottom; y++) {
        const intensity = physics.normalizedIntensity((mid - y) / (bottom - top) * .03, p);
        c.lineTo(graphX + intensity * plotWidth, y);
      }
      c.lineTo(graphX, bottom); c.closePath(); c.fillStyle = color(p, .12); c.fill(); c.strokeStyle = color(p, .9); c.lineWidth = 1.5; c.stroke();
    } else {
      c.fillStyle = '#758c88'; c.font = '10px system-ui';
      c.save(); c.translate(graphX + 8, mid + 45); c.rotate(-Math.PI / 2); c.fillText('빛이 도착하면 무늬가 보여요', 0, 0); c.restore();
    }
    c.font = '9px system-ui'; c.fillStyle = '#8fa69d';
    c.fillText('+15 mm', graphX, top - 6); c.fillText('−15 mm', graphX, bottom + 15);
    c.fillText('0', graphX - 10, mid + 3);
    c.fillText('관찰용 파면 · 실제 파장 및 시간과 축척이 다릅니다', 12, h - 10);
  }

  // WebGL model: real perspective geometry and a physical intensity shader on the screen.
  // The screen's vertical world coordinate maps to ±15 mm; device dimensions are illustrative.
  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return null;
    const vertexSource = `attribute vec3 position; attribute vec3 normal;
      uniform mat4 camera; varying vec3 point; varying vec3 surfaceNormal;
      void main(){point=position;surfaceNormal=normal;gl_Position=camera*vec4(position,1.0);}`;
    const fragmentSource = `precision mediump float; varying vec3 point; varying vec3 surfaceNormal;
      uniform vec3 tint; uniform vec3 lightColor; uniform float isScreen; uniform float arrived;
      uniform float wavelength; uniform float separation; uniform float slitWidth; uniform float distanceToScreen; uniform float mode;
      void main(){
        float light=0.5+0.5*abs(dot(normalize(surfaceNormal+vec3(0.001)),normalize(vec3(-0.4,0.9,0.4))));
        vec3 rgb=tint*light;
        if(isScreen>0.5){
          float y=point.y*0.01;
          float st=y/sqrt(distanceToScreen*distanceToScreen+y*y);
          float beta=3.14159265*slitWidth*st/wavelength;
          float env=abs(beta)<0.001?1.0:pow(sin(beta)/beta,2.0);
          float coherence=mode<0.5?pow(cos(3.14159265*separation*st/wavelength),2.0):1.0;
          rgb=vec3(0.025,0.045,0.055)+lightColor*env*coherence*arrived;
        }
        gl_FragColor=vec4(rgb,1.0);
      }`;
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const locations = {};
    ['camera', 'tint', 'lightColor', 'isScreen', 'arrived', 'wavelength', 'separation', 'slitWidth', 'distanceToScreen', 'mode'].forEach(name => locations[name] = gl.getUniformLocation(program, name));
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    ['position', 'normal'].forEach((name, i) => {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, i * 12);
    });
    gl.enable(gl.DEPTH_TEST);
    const multiply = (a, b) => {
      const out = new Float32Array(16);
      for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
      return out;
    };
    const normalize = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    function cameraMatrix(w, h) {
      const target = [.4, 0, 0];
      const eye = [target[0] + Math.sin(yaw) * Math.cos(pitch) * zoom, Math.sin(pitch) * zoom, Math.cos(yaw) * Math.cos(pitch) * zoom];
      const z = normalize(eye.map((v, i) => v - target[i]));
      const x = normalize(cross([0, 1, 0], z)), y = cross(z, x);
      const dot = a => -a.reduce((sum, v, i) => sum + v * eye[i], 0);
      const view = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, dot(x), dot(y), dot(z), 1];
      const f = 1 / Math.tan(Math.PI / 8), near = .1, far = 100;
      const perspective = [f / (w / h), 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
      return multiply(perspective, view);
    }
    function vertices(points, n) { return points.flatMap(p => [...p, ...n]); }
    function mesh(data, tint, screen = false, type = gl.TRIANGLES) {
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
      gl.uniform3fv(locations.tint, tint); gl.uniform1f(locations.isScreen, screen ? 1 : 0);
      gl.drawArrays(type, 0, data.length / 6);
    }
    function box(x, y, z, dx, dy, dz, tint) {
      const p = [[x-dx/2,y-dy/2,z-dz/2],[x+dx/2,y-dy/2,z-dz/2],[x+dx/2,y+dy/2,z-dz/2],[x-dx/2,y+dy/2,z-dz/2],[x-dx/2,y-dy/2,z+dz/2],[x+dx/2,y-dy/2,z+dz/2],[x+dx/2,y+dy/2,z+dz/2],[x-dx/2,y+dy/2,z+dz/2]];
      const faces = [[[0,1,2,3],[0,0,-1]],[[4,7,6,5],[0,0,1]],[[0,4,5,1],[0,-1,0]],[[3,2,6,7],[0,1,0]],[[0,3,7,4],[-1,0,0]],[[1,5,6,2],[1,0,0]]];
      mesh(faces.flatMap(([indices,n]) => vertices([0,1,2,0,2,3].map(i=>p[indices[i]]),n)), tint);
    }
    function line(a, b, tint) { mesh(vertices([a, b], [0,1,0]), tint, false, gl.LINES); }
    function draw(p) {
      const { width: w, height: h } = fit(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(.063, .118, .153, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(locations.camera, false, cameraMatrix(w, h));
      gl.uniform3fv(locations.lightColor, physics.wavelengthRGB(p.wavelength * 1e9).map(v=>v/255));
      // Aperture lengths use micrometers; screen coordinates and distance use meters.
      // Ratios stay dimensionless while avoiding subnormal SI wavelengths in mediump.
      gl.uniform1f(locations.wavelength, p.wavelength * 1e6);
      gl.uniform1f(locations.separation, p.separation * 1e6);
      gl.uniform1f(locations.slitWidth, p.slitWidth * 1e6);
      gl.uniform1f(locations.distanceToScreen, p.screenDistance);
      gl.uniform1f(locations.mode, p.mode === 'double' ? 0 : 1);
      gl.uniform1f(locations.arrived, time >= 5.2 ? 1 : 0);
      const green = [.22,.33,.31], gray = [.43,.54,.52], glow = physics.wavelengthRGB(p.wavelength*1e9).map(v=>v/255);
      for (let i = -5; i <= 5; i++) { line([i,-1.7,-2.3],[i,-1.7,2.3],green); line([-5,-1.7,i*.45],[5,-1.7,i*.45],green); }
      const sx = 1.9 + p.screenDistance * .6;
      box(.1,-1.64,0,7.7,.08,.3,gray);
      box(-3,0,0,.65,.38,.42,gray); box(-2.65,0,0,.06,.23,.24,glow); box(-3,-.9,0,.09,1.4,.09,gray);
      box(0,-1.5,0,.65,.1,1.1,gray); box(sx,-1.5,0,.65,.1,1.1,gray);
      const separation = .35 + (p.separation * 1e6-100)/500*.7;
      const opening = .065 + (p.slitWidth*1e6-10)/70*.14;
      const centers = p.mode === 'single' ? [-separation/2] : [-separation/2,separation/2];
      const edges = [-1.5,...centers.flatMap(y=>[y-opening/2,y+opening/2]),1.5];
      for (let i=0;i<edges.length-1;i+=2) box(0,(edges[i]+edges[i+1])/2,0,.1,edges[i+1]-edges[i],1.65,gray);
      box(0,0,-.78,.12,3,.1,gray); box(0,0,.78,.12,3,.1,gray);
      box(sx,0,0,.1,3,1.8,[.2,.3,.33]);
      for (const x of [sx-.056,sx+.056]) mesh(vertices([[x,-1.5,-.8],[x,1.5,-.8],[x,1.5,.8],[x,-1.5,-.8],[x,1.5,.8],[x,-1.5,.8]],[1,0,0]),gray,true);
      box(sx,1.55,0,.14,.08,1.9,gray); box(sx,-1.55,0,.14,.08,1.9,gray);
      if(time>0) line([-2.6,0,0],[-2.6+Math.min(time/1.6,1)*2.55,0,0],glow);
      if(time>1.6) for(const y of centers) {
        const progress = Math.min((time-1.6)/3.6,1);
        for(const dest of [-1.2,0,1.2]) line([.06,y,0],[.06+(sx-.12)*progress,y+(dest-y)*progress,0],glow);
      }
    }
    return { draw };
  }
  function drawFallback() {
    // A perspective wire model keeps the experiment usable when WebGL is unavailable.
    const c = space.getContext('2d');
    if (!c) return;
    const {width:w,height:h,ratio} = fit(space);
    c.setTransform(ratio,0,0,ratio,0,0); c.fillStyle='#101e27';c.fillRect(0,0,w,h);
    const p = parameters(), scale = Math.min(w/9,h/5)*10/zoom;
    function point(x,y,z) {
      const cx=x-.4, rx=cx*Math.cos(yaw)-z*Math.sin(yaw), rz=cx*Math.sin(yaw)+z*Math.cos(yaw);
      return [w/2+rx*scale,h/2-(y*Math.cos(pitch)-rz*Math.sin(pitch))*scale];
    }
    function line(a,b,tint='#829c92'){c.strokeStyle=tint;c.beginPath();c.moveTo(...point(...a));c.lineTo(...point(...b));c.stroke();}
    const sx=1.9+p.screenDistance*.6;
    for(const x of [0,sx]) {
      const corners=[[x,-1.5,-.8],[x,1.5,-.8],[x,1.5,.8],[x,-1.5,.8]];
      corners.forEach((a,i)=>line(a,corners[(i+1)%4]));
    }
    const centers=p.mode==='single'?[-.3]:[-.3,.3];
    centers.forEach(y=>{line([0,y-.07,0],[0,y+.07,0],'#ffffff');line([-3,0,0],[0,y,0],color(p));if(time>=5.2)for(const dest of [-1,0,1])line([0,y,0],[sx,dest,0],color(p));});
    c.fillStyle='#b3c7bf';c.font='11px system-ui';
    [['광원',-3],['슬릿',0],['스크린',sx]].forEach(([name,x])=>c.fillText(name,...point(x,-1.8,0)));
  }
  function render() {
    updateStage(); drawWave();
    $('elapsed').textContent = `${time.toFixed(1)} / 8`;
    if (renderer) renderer.draw(parameters()); else drawFallback();
    sceneDirty = false;
  }
  function setView(name) {
    const views = { perspective: [-.7,.38,10], top: [0,1.5,10], front: [Math.PI/2,0,8] };
    [yaw,pitch,zoom] = views[name];
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
    sceneDirty=true;
  }
  controls.forEach(id=>$(id).addEventListener('input',update));
  $('play').onclick=()=>{running=!running;previous=null;playback();render();};
  $('step').onclick=()=>{running=false;time=stageStarts[(stage()+1)%4];playback();render();};
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{running=false;time=stageStarts[+b.dataset.stage];playback();render();});
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{presets[b.dataset.preset].forEach((v,i)=>$(controls[i]).value=v);$('mode').value='double';update();});
  $('reset').onclick=()=>{
    presets.baseline.forEach((v,i)=>$(controls[i]).value=v);$('mode').value='double';$('speed').value='1';time=0;running=!reducedMotion;previous=null;setView('perspective');playback();update();
  };
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  function changeZoom(delta) {zoom=Math.max(5,Math.min(18,zoom+delta));sceneDirty=true;}
  $('zoom-in').onclick=()=>changeZoom(-1);$('zoom-out').onclick=()=>changeZoom(1);
  function rotate(dx,dy) {
    yaw+=dx*.008;pitch=Math.max(-1.5,Math.min(1.5,pitch+dy*.008));
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));sceneDirty=true;
  }
  space.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};space.setPointerCapture(e.pointerId);});
  space.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;rotate(e.clientX-pointer.x,e.clientY-pointer.y);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});
  space.addEventListener('pointerup',()=>pointer=null);space.addEventListener('pointercancel',()=>pointer=null);
  space.addEventListener('wheel',e=>{e.preventDefault();changeZoom(Math.sign(e.deltaY)*.5);},{passive:false});
  space.addEventListener('keydown',e=>{
    const keys={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};
    if(keys[e.key]){e.preventDefault();rotate(...keys[e.key]);}
    if(['+','=','-'].includes(e.key)){e.preventDefault();changeZoom(e.key==='-'?.5:-.5);}
  });
  try {renderer=createRenderer(space);} catch(error) {console.warn('3D renderer unavailable:',error.message);}
  $('renderer-note').textContent=renderer?'WebGL · 실제 3D 기하 모델':'호환 모드 · 3D 투영 도식';
  space.addEventListener('webglcontextlost',e=>{e.preventDefault();$('renderer-note').textContent='3D 연결이 중단되었습니다. 복구를 기다리는 중';});
  space.addEventListener('webglcontextrestored',()=>{renderer=createRenderer(space);$('renderer-note').textContent='WebGL · 실제 3D 기하 모델';sceneDirty=true;});
  new ResizeObserver(()=>{sceneDirty=true;}).observe(wave.parentElement);
  new ResizeObserver(()=>{sceneDirty=true;}).observe(space.parentElement);
  document.addEventListener('visibilitychange',()=>previous=null);
  function frame(now) {
    if(previous!==null&&running&&!document.hidden) {time=(time+Math.min((now-previous)/1000,.08)*+$('speed').value)%8;sceneDirty=true;}
    previous=now;
    if(sceneDirty&&now-lastFrame>=1000/30){render();lastFrame=now;}
    requestAnimationFrame(frame);
  }
  playback();update();requestAnimationFrame(frame);
})();
