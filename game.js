(() => {
'use strict';

/* =========================================================
 * 0. 상수
 *    내부 해상도 480x270 (화면에는 2배 이상으로 픽셀 확대되어 표시됨)
 * ========================================================= */
const W = 480, H = 270, FLOOR = 225;
const LAMP_OFFSETS = [92, 275, 458]; // 칸마다 천장 램프 3개

/* =========================================================
 * 1. 상태 / 월드 데이터
 * ========================================================= */
const state = {
  playerX: 75,
  cameraX: 0,
  facing: 1,
  moving: false,
  nearbyNpc: null,
  dialogueNpc: null,
  dialogueStep: '',   // '' | 'typing' | 'choice'
  choiceIndex: 0,
  lastTime: 0,
  typingTimer: 0,
  typingFinish: null,
  smoke: [],
  smokeTimer: 0,
};

// 스프라이트 공통 팔레트 (O 외곽선, S/s 피부, E 눈)
const PAL_BASE = { O: '#0d0c10', S: '#d9a579', s: '#b27d57', E: '#1a1418' };

const world = {
  width: 2200,
  floorY: FLOOR,
  viewW: W,
  viewH: H,
  player: {
    w: 16, h: 36, speed: 100, hat: 'fedora',
    pal: { H: '#3a3235', h: '#26212a', C: '#8a7150', c: '#6b5740', d: '#5a4835', T: '#b23a3a', P: '#2c2a30', p: '#1f1d22', B: '#15131a' },
  },

  // 열차 칸 (왼쪽부터)
  cars: [
    { name: '1등칸', plate: '1ST CLASS', start: 0,    end: 550,  prop: 'suite',  wall: '#2e2119', wallLight: '#3a2a20', wallDark: '#241a13', floor: 'carpet' },
    { name: '식당칸', plate: 'DINING',    start: 550,  end: 1100, prop: 'dining', wall: '#33261c', wallLight: '#403124', wallDark: '#281d15', floor: 'tile'   },
    { name: '2등칸', plate: '2ND CLASS', start: 1100, end: 1650, prop: 'second', wall: '#27302d', wallLight: '#313b37', wallDark: '#1e2624', floor: 'wood'   },
    { name: '3등칸', plate: '3RD CLASS', start: 1650, end: 2200, prop: 'third',  wall: '#2d2823', wallLight: '#38322b', wallDark: '#221e1a', floor: 'wood'   },
  ],

  // NPC: hat/pal 로 스프라이트 생성, lines[0] 첫 대사, choices 선택지, responses 응답
  npcs: [
    {
      id: 'witness', name: '윤 형사', role: '1등칸 승객 · 목격자', x: 295, hat: 'fedora',
      pal: { H: '#4b4f5a', h: '#353840', C: '#5d6b70', c: '#49555a', d: '#3c474b', T: '#c9b28a', P: '#2d3238', p: '#22262b', B: '#141518' },
      lines: ['급행열차가 터널에 들어간 순간이었어요. 1등칸에서 비명 소리가 들렸습니다.', '시신 옆에서 이 승차권 조각을 발견했어요.'],
      choices: ['객실에 누가 드나들었습니까?', '그 승차권을 확인하겠습니다.'],
      responses: ['식당칸 직원이 사건 직전에 1등칸으로 향했어요.', '승차권의 좌석 번호가 일부 찢겨 나갔습니다.'],
    },
    {
      id: 'keeper', name: '강 요리사', role: '식당칸 직원', x: 790, hat: 'toque',
      pal: { H: '#efe9dc', h: '#cfc6b4', C: '#e6e0d2', c: '#c7c0b0', d: '#b5ad9c', T: '#2a2628', P: '#3a3a3e', p: '#2a2a2e', B: '#1a1a1c' },
      lines: ['사건이 났을 때 저는 식당칸에서 주문을 받고 있었습니다.', '하지만 잠시 자리를 비운 건 사실입니다.'],
      choices: ['그때 어디에 있었죠?', '피해자와 아는 사이였습니까?'],
      responses: ['물품 보관실에서 와인 상자를 찾고 있었어요.', '열차에 타기 전부터 알고 지낸 사이입니다.'],
    },
    {
      id: 'guard', name: '최 순경', role: '2등칸 차장', x: 1340, hat: 'cap',
      pal: { H: '#2d3a55', h: '#1f2a40', C: '#34436a', c: '#283552', d: '#202a44', T: '#d5b25c', P: '#2a3350', p: '#1f2640', B: '#15151c' },
      lines: ['2등칸 통로에서 젖은 구두 자국이 발견됐습니다.', '발자국은 뒤쪽 3등칸까지 이어져요.'],
      choices: ['발자국 크기를 기록해 주세요.', '3등칸 승객을 조사하겠습니다.'],
      responses: ['남성용 구두, 왼발에만 진흙이 묻어 있습니다.', '통로 끝에서 수상한 승객을 봤다는군요.'],
    },
    {
      id: 'passenger', name: '한 승객', role: '3등칸 승객', x: 1910, hat: 'flat',
      pal: { H: '#6b5742', h: '#4f3f30', C: '#7a5a3d', c: '#5f462f', d: '#4b3726', T: '#a63c3c', P: '#3f3a35', p: '#2f2b27', B: '#1c1915' },
      lines: ['저는 아무것도 못 봤어요. 밤새 잠들어 있었으니까요.', '잠깐… 그 구두 자국, 제 좌석 앞에서 끝났나요?'],
      choices: ['신발을 확인해도 될까요?', '왜 그렇게 놀라셨죠?'],
      responses: ['물론이죠. 저는 이 열차에 탄 뒤 한 번도 내리지 않았어요.', '아까 누군가 좌석 밑에 무언가를 밀어 넣는 걸 봤습니다.'],
    },
  ],
};

/* =========================================================
 * 2. 스프라이트 도트맵 (16 x 36)
 *    . 투명 / O 외곽선 / H h 모자 / S s 피부 / E 눈
 *    C c d 코트 / T 포인트(넥타이·단추) / P p 바지 / B 구두
 * ========================================================= */
const SPRITE = {
  heads: {
    fedora: [
      '....OOOOOOOO....',
      '...OHHHHHHHHO...',
      '...OHHHHHHhhO...',
      '...OHHHHHHhhO...',
      '.OOOhhhhhhhhOOO.',
      'OHHHHHHHHHHHHHhO',
      '.OOOOOOOOOOOOOO.',
      '....OssssssO....',
      '....OSESSESO....',
      '....OSSSSSSO....',
      '....OsSSSSsO....',
      '.....OsssO......',
      '......OSO.......',
    ],
    toque: [
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OHHHHHHHhO...',
      '...OHHHHHHhhO...',
      '....OhhhhhhO....',
      '....OOOOOOOO....',
      '....OSSSSSSO....',
      '....OSESSESO....',
      '....OSSSSSSO....',
      '....OsSSSSsO....',
      '.....OsssO......',
      '......OSO.......',
    ],
    cap: [
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHTHHHhO...',
      '...OhhhhhhhhO...',
      '...OOOOOOOOOOO..',
      '....OhhhhhhhhO..',
      '....OssssssOO...',
      '....OSESSESO....',
      '....OSSSSSSO....',
      '....OsSSSSsO....',
      '.....OsssO......',
      '......OSO.......',
    ],
    flat: [
      '................',
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '..OhhhhhhhhhhOO.',
      '...OOOOOOOOOOhO.',
      '....OssssssOOO..',
      '....OSESSESO....',
      '....OSSSSSSO....',
      '....OsSSSSsO....',
      '.....OsssO......',
      '......OSO.......',
    ],
  },
  torso: [
    '....OddTTddO....',
    '...OCdddTdddCO..',
    '..OCCCddTddCCCO.',
    '..OCCCCdTdCCCCO.',
    '.OCCCCCCTCCCCCCO',
    '.OcCCCCCCCCCCCcO',
    '.OcCCCCCCCCCCCcO',
    '.OcCCCOOOOOCCCcO',
    '.OcCCCCCCCCCCCcO',
    '.OsOCCCCCCCCCOsO',
    '.OOOCCCCCCCCCOOO',
    '...OCCCCCCCCCO..',
    '...OcccccccccO..',
  ],
  legs: {
    A: [ // 서 있음
      '....OPPOOPPO....',
      '....OPPO.OPPO...',
      '....OPPO.OPPO...',
      '....OppO.OppO...',
      '....OppO.OppO...',
      '....OppO.OppO...',
      '....OBBO.OBBO...',
      '...OBBBO.OBBBO..',
      '...OOOOO.OOOOO..',
      '................',
    ],
    B: [ // 보폭 최대
      '...OPPOOOOPPO...',
      '..OPPO...OPPO...',
      '..OPPO....OPPO..',
      '..OppO....OppO..',
      '.OppO......OppO.',
      '.OppO......OppO.',
      '.OBBO......OBBO.',
      'OBBBO......OBBBO',
      'OOOOO......OOOOO',
      '................',
    ],
    C: [ // 중간 걸음
      '....OPPOOPPO....',
      '....OPPO.OPPO...',
      '...OPPO..OPPO...',
      '...OppO..OppO...',
      '..OppO...OppO...',
      '..OppO...OppO...',
      '..OBBO...OBBO...',
      '.OBBBO...OBBBO..',
      '.OOOOO...OOOOO..',
      '................',
    ],
  },
};

function paintMap(g, rows, ox, oy, pal) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      g.fillStyle = pal[ch] || '#ff00ff';
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

// 머리 + 몸통 + 다리(3프레임)를 합쳐 오프스크린 캔버스로 미리 그려 둔다.
function buildSprite(def) {
  const pal = { ...PAL_BASE, ...def.pal };
  const frames = {};
  for (const key of ['A', 'B', 'C']) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 36;
    const g = c.getContext('2d');
    paintMap(g, SPRITE.heads[def.hat], 0, 0, pal);
    paintMap(g, SPRITE.torso, 0, 13, pal);
    paintMap(g, SPRITE.legs[key], 0, 26, pal);
    frames[key] = c;
  }
  return frames;
}

/* =========================================================
 * 3. DOM 참조 / 유틸
 * ========================================================= */
const canvas = document.querySelector('#world');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const $ = s => document.querySelector(s);
const dialogueEl = $('#dialogue');
const nearbyEl = $('#nearby');
const optionsEl = $('#options');

$('#closeDialogue').addEventListener('click', closeDialogue);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const sprites = { player: buildSprite(world.player) };
for (const n of world.npcs) sprites[n.id] = buildSprite(n);

function nearestNpc() {
  let best = null, dist = Infinity;
  for (const n of world.npcs) {
    const d = Math.abs(n.x - state.playerX);
    if (d < 44 && d < dist) { best = n; dist = d; }
  }
  return best;
}

/* =========================================================
 * 4. 디더링 패턴 / 사각형 헬퍼
 *    4x4 베이어 행렬로 픽셀아트 특유의 점묘 그라데이션을 만든다.
 * ========================================================= */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const patCache = new Map();

function dither(color, density) {
  const key = color + '|' + density;
  if (patCache.has(key)) return patCache.get(key);
  const c = document.createElement('canvas');
  c.width = 4; c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = color;
  for (let i = 0; i < 16; i++) if (BAYER[i] < density) g.fillRect(i % 4, i / 4 | 0, 1, 1);
  const p = ctx.createPattern(c, 'repeat');
  patCache.set(key, p);
  return p;
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// 화면 기준 디더 사각형 (조명·안개처럼 카메라와 무관한 것)
function srect(x, y, w, h, color, density) {
  ctx.fillStyle = dither(color, density);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// 월드 기준 디더 사각형 (벽·바닥처럼 카메라와 함께 움직이는 것)
function drect(x, y, w, h, color, density) {
  const s = ((Math.round(state.cameraX) % 4) + 4) % 4;
  ctx.save();
  ctx.translate(-s, 0);
  ctx.fillStyle = dither(color, density);
  ctx.fillRect(Math.round(x) + s, Math.round(y), Math.round(w), Math.round(h));
  ctx.restore();
}

// 여러 색을 디더링으로 이어 붙인 세로 그라데이션
function bands(g, x, y, w, h, stops) {
  const n = stops.length - 1, seg = h / n;
  for (let i = 0; i < n; i++) {
    const y0 = y + i * seg, sub = seg / 4;
    g.fillStyle = stops[i];
    g.fillRect(x, Math.round(y0), w, Math.ceil(seg));
    for (let k = 1; k < 4; k++) {
      g.fillStyle = dither(stops[i + 1], k * 4);
      g.fillRect(x, Math.round(y0 + k * sub), w, Math.ceil(seg - k * sub));
    }
  }
}

// 하늘은 움직이지 않으므로 한 번만 그려 둔다.
const sky = document.createElement('canvas');
sky.width = W; sky.height = 180;
bands(sky.getContext('2d'), 0, 0, W, 180, ['#070a0e', '#0e1620', '#182633', '#213744', '#2f3a3e', '#3b312c']);

/* =========================================================
 * 5. 업데이트 (이동 / 카메라 / 근접 NPC / 입자)
 * ========================================================= */
function update(dt) {
  const inDialogue = dialogueEl.classList.contains('open');
  let dir = 0;
  if (!inDialogue) {
    dir = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
    state.playerX = clamp(state.playerX + dir * world.player.speed * dt, world.player.w / 2, world.width - world.player.w / 2);
  }
  state.moving = dir !== 0;
  if (dir) state.facing = dir;

  // 카메라: 플레이어를 화면 왼쪽 1/3 지점에 두고 따라가며, 맵 양 끝에서 멈춘다.
  state.cameraX = clamp(state.playerX - world.viewW / 3, 0, world.width - world.viewW);

  state.nearbyNpc = nearestNpc();
  nearbyEl.classList.toggle('show', !!state.nearbyNpc && !inDialogue);

  const car = world.cars.find(c => state.playerX >= c.start && state.playerX < c.end) || world.cars.at(-1);
  $('#chapter').textContent = car.name + '  /  23:47';

  // 담배 연기 입자
  state.smokeTimer -= dt;
  if (state.smokeTimer <= 0) {
    state.smokeTimer = .18 + Math.random() * .15;
    const tip = state.playerX + (state.facing > 0 ? 4 : -5);
    state.smoke.push({ x: tip + .5, y: FLOOR - 27, vx: (Math.random() - .5) * 4 + state.facing * 2, vy: -9 - Math.random() * 6, life: 1.6 + Math.random() * .8, ph: Math.random() * 6 });
  }
  for (const p of state.smoke) {
    p.life -= dt; p.ph += dt * 3;
    p.x += (p.vx + Math.sin(p.ph) * 4) * dt;
    p.y += p.vy * dt;
    p.vy *= .995;
  }
  state.smoke = state.smoke.filter(p => p.life > 0);
}

/* =========================================================
 * 6. 입력
 * ========================================================= */
const keys = new Set();

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['a', 'd', 'f', 'enter', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
  if (k === 'a' || k === 'd') keys.add(k);
  if ((k === 'f' || k === 'enter') && !e.repeat) activate();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

// 대화 중 키 처리: ESC 닫기, 방향키로 선택지 이동, 숫자키로 바로 선택
window.addEventListener('keydown', e => {
  if (!dialogueEl.classList.contains('open')) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { closeDialogue(); return; }
  if (state.dialogueStep === 'choice') {
    const npc = state.dialogueNpc;
    const len = remainingChoices(npc).length;
    if (k === 'arrowleft' || k === 'arrowup') {
      state.choiceIndex = (state.choiceIndex + len - 1) % len;
      renderOptions(npc);
    }
    if (k === 'arrowright' || k === 'arrowdown') {
      state.choiceIndex = (state.choiceIndex + 1) % len;
      renderOptions(npc);
    }
    if (k >= '1' && k <= '9' && Number(k) <= len) choose(Number(k) - 1);
  }
});

// F / Enter: 타이핑 중이면 즉시 완료, 선택 단계면 확정, 그 외엔 대화 열기/닫기
function activate() {
  if (dialogueEl.classList.contains('open')) {
    if (state.typingFinish) { state.typingFinish(); return; }
    if (state.dialogueStep === 'choice') { choose(state.choiceIndex); return; }
    closeDialogue();
    return;
  }
  if (state.nearbyNpc) openDialogue(state.nearbyNpc);
}

/* =========================================================
 * 7. 대화 시스템
 * ========================================================= */
function openDialogue(npc) {
  state.dialogueNpc = npc;
  state.dialogueStep = 'typing';
  state.choiceIndex = 0;
  $('#conversation').replaceChildren();
  optionsEl.replaceChildren();
  optionsEl.style.display = 'none';

  // 열림 애니메이션을 다시 재생하기 위해 클래스를 제거했다가 붙인다.
  dialogueEl.classList.remove('open');
  void dialogueEl.offsetWidth;
  dialogueEl.classList.add('open');

  // 이미 모든 질문을 마친 NPC는 마무리 대사만 한다.
  if (remainingChoices(npc).length === 0) { say(npc, npc.lines[1], false, finishDialogue); return; }
  say(npc, npc.lines[0], false, () => renderOptions(npc));
}

// 아직 고르지 않은 선택지의 원본 인덱스 목록. 고른 선택지는 npc.asked에 기억해 둔다.
function remainingChoices(npc) {
  npc.asked ??= new Set();
  return npc.choices.map((_, i) => i).filter(i => !npc.asked.has(i));
}

function renderOptions(npc) {
  const remaining = remainingChoices(npc);
  optionsEl.replaceChildren();
  state.choiceIndex = clamp(state.choiceIndex, 0, Math.max(0, remaining.length - 1));
  remaining.forEach((idx, pos) => {
    const b = document.createElement('button');
    b.className = 'option' + (pos === state.choiceIndex ? ' selected' : '');
    b.innerHTML = '<b>' + (pos + 1) + '</b>' + npc.choices[idx];
    b.onclick = () => choose(pos);
    optionsEl.append(b);
  });
  optionsEl.style.display = 'flex';
  state.dialogueStep = 'choice';
  $('#continue').textContent = '↑ ↓ 선택  ·  F 확정';
}

// 더 물을 것이 없을 때: 선택지를 숨기고 F / ESC 로 닫게 한다.
function finishDialogue() {
  optionsEl.replaceChildren();
  optionsEl.style.display = 'none';
  state.dialogueStep = 'done';
  $('#continue').textContent = 'F / ESC  대화 나가기';
}

// pos: 남은 선택지 목록에서의 위치
function choose(pos) {
  const n = state.dialogueNpc;
  const remaining = remainingChoices(n);
  if (!remaining.length) return;
  const idx = remaining[clamp(pos, 0, remaining.length - 1)];
  n.asked.add(idx);
  state.choiceIndex = 0;
  state.dialogueStep = 'typing';
  optionsEl.style.display = 'none';
  // 플레이어 대사 → NPC 응답 → 남은 선택지 (없으면 마무리 대사 후 종료)
  say(n, n.choices[idx], true, () =>
    say(n, n.responses[idx], false, () => {
      if (remainingChoices(n).length) renderOptions(n);
      else say(n, n.lines[1], false, finishDialogue);
    })
  );
}

// 말풍선 하나를 추가하고 글자를 한 자씩 타이핑한다. done은 타이핑 완료 후 호출.
function say(npc, text, player, done) {
  const row = document.createElement('div');
  row.className = 'message' + (player ? ' player' : '');

  if (!player) {
    const p = document.createElement('canvas');
    p.className = 'portrait';
    p.width = 48;
    p.height = 48;
    drawPortrait(npc, p);
    row.appendChild(p);
  }

  const bubble = document.createElement('div');
  bubble.className = 'speech';
  bubble.setAttribute('aria-label', player ? '플레이어 대사' : npc.name + '의 대사');
  row.appendChild(bubble);

  const log = $('#conversation');
  log.appendChild(row);

  const chars = Array.from(text);
  let i = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(state.typingTimer);
    bubble.textContent = text;
    state.typingFinish = null;
    state.typingTimer = 0;
    done?.();
  };
  state.typingFinish = finish;

  const type = () => {
    if (finished) return;
    const follow = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    bubble.textContent = chars.slice(0, ++i).join('');
    if (follow) log.scrollTop = log.scrollHeight;
    if (i < chars.length) state.typingTimer = setTimeout(type, 30);
    else finish();
  };
  type();
}

function closeDialogue() {
  if (state.typingTimer) clearTimeout(state.typingTimer);
  state.typingTimer = 0;
  state.typingFinish = null;
  dialogueEl.classList.remove('open');
  state.dialogueNpc = null;
  state.dialogueStep = '';
  optionsEl.style.display = 'flex';
}

// 대화창 초상화: 스프라이트 상반신(16x16)을 3배로 확대
function drawPortrait(n, canvas) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#1a1d1f';
  g.fillRect(0, 0, 48, 48);
  g.fillStyle = '#242a2e';
  g.fillRect(6, 6, 36, 36);
  g.fillStyle = dither('#3a3128', 4);
  g.fillRect(0, 0, 48, 48);
  g.drawImage(sprites[n.id].A, 0, 0, 16, 16, 0, 0, 48, 48);
}

/* =========================================================
 * 8. 장면 그리기
 * ========================================================= */
const lamps = [];   // 이번 프레임의 천장 램프 x (화면 좌표)
const lights = [];  // 작은 광원 {x,y,r,color}
const steams = [];  // 김이 나는 컵 x

function draw(t) {
  const cam = state.cameraX;
  lamps.length = 0; lights.length = 0; steams.length = 0;
  ctx.clearRect(0, 0, W, H);

  drawCeiling(cam);

  // 벽 + 창문 위치 수집
  const windows = [];
  const visible = [];
  for (const car of world.cars) {
    const sx = car.start - cam, ex = car.end - cam;
    if (ex < 0 || sx > W) continue;
    visible.push([car, sx, ex]);
    drawWalls(car, sx, ex, cam);
    for (let wx = car.start + 21; wx + 69 <= car.end - 24; wx += 94) windows.push({ x: wx - cam, seed: wx });
  }

  // 창문 구멍 안에만 바깥 풍경을 그린다.
  ctx.save();
  ctx.beginPath();
  for (const w of windows) ctx.rect(Math.round(w.x), 85, 69, 89);
  ctx.clip();
  drawOutside(cam, t);
  for (const w of windows) drawGlass(w, t);
  ctx.restore();
  for (const w of windows) drawWindowFrame(w.x);

  for (const [car, sx, ex] of visible) {
    drawFurniture(car, sx, ex, cam);
    drawFloor(car, sx, ex, cam);
  }

  // 캐릭터
  for (const n of world.npcs) {
    const x = n.x - cam;
    if (x < -20 || x > W + 20) continue;
    const breathe = ((t / 900 + n.x) | 0) % 2 ? 1 : 0;
    const face = state.playerX < n.x ? -1 : 1;
    if (n === state.nearbyNpc) lights.push({ x, y: FLOOR, r: 16, color: 'rgba(255,220,150,.22)' });
    drawSprite(sprites[n.id], x, FLOOR - breathe, 'A', face);
  }
  const walkFrame = ['A', 'C', 'B', 'C'][(t / 110 | 0) % 4];
  const bob = state.moving ? ((t / 110 | 0) % 2 ? 1 : 0) : (((t / 900) | 0) % 2 ? 1 : 0);
  const px = state.playerX - cam;
  drawSprite(sprites.player, px, FLOOR - bob, state.moving ? walkFrame : 'A', state.facing);
  // 담배
  const xr = Math.round(px), my = FLOOR - bob - 26;
  const cx = state.facing > 0 ? xr + 1 : xr - 4;
  rect(cx, my, 3, 1, '#e8e0d0');
  rect(state.facing > 0 ? xr + 4 : xr - 5, my, 1, 1, ((t / 150 | 0) % 3) ? '#ff6a3a' : '#ffb080');

  drawLights(t);
  drawParticles(cam, t);

  // 근처 NPC 머리 위 "!" 말풍선
  if (state.nearbyNpc && !dialogueEl.classList.contains('open')) {
    const xi = Math.round(state.nearbyNpc.x - cam);
    const by = FLOOR - 50 + Math.round(Math.sin(t * .006) * 2);
    rect(xi - 5, by, 10, 9, '#0d0c10');
    rect(xi - 4, by + 1, 8, 7, '#f3e7c4');
    rect(xi - 1, by + 9, 2, 1, '#0d0c10');
    rect(xi, by + 2, 1, 3, '#2a2228');
    rect(xi, by + 6, 1, 1, '#2a2228');
  }
}

function drawCeiling(cam) {
  bands(ctx, 0, 0, W, 66, ['#0a0d10', '#141a1f', '#1b2227']);
  for (let x = -(((cam % 46) + 46) % 46); x < W; x += 46) rect(x, 0, 1, 64, '#0d1114');
  rect(0, 62, W, 2, '#262c30');
  rect(0, 64, W, 2, '#101416');
}

function drawWalls(car, sx, ex, cam) {
  const w = ex - sx;
  // 상단 몰딩
  rect(sx, 66, w, 6, '#5a3d28'); rect(sx, 66, w, 1, '#7a5536'); rect(sx, 71, w, 1, '#1b130e');
  // 벽 본체 + 천장 그림자
  rect(sx, 72, w, 153, car.wall);
  drect(sx, 72, w, 10, car.wallDark, 8);
  drect(sx, 82, w, 6, car.wallDark, 4);
  for (let wx = car.start + 11; wx < car.end; wx += 11) rect(wx - cam, 84, 1, 94, car.wallDark);
  // 2·3등칸 짐 선반
  if (car.prop === 'second' || car.prop === 'third') {
    rect(sx, 79, w, 1, '#6e6e66');
    for (let wx = car.start + 30; wx < car.end; wx += 60) rect(wx - cam, 79, 1, 4, '#4a4a44');
  }
  // 체어 레일 + 하단 패널(웨인스코트)
  rect(sx, 178, w, 3, '#6a4a30'); rect(sx, 178, w, 1, '#8a6240');
  rect(sx, 181, w, 38, car.wallDark);
  for (let wx = car.start + 6; wx + 18 < car.end - 4; wx += 24) {
    const x = wx - cam;
    rect(x, 185, 18, 30, car.wall);
    rect(x, 185, 18, 1, car.wallLight); rect(x, 185, 1, 30, car.wallLight);
    rect(x + 17, 185, 1, 30, '#0f0b08'); rect(x, 214, 18, 1, '#0f0b08');
  }
  rect(sx, 219, w, 6, '#15100c'); rect(sx, 219, w, 1, '#3a2a1e');

  // 벽 끝 액자와 벽등
  const fx = car.end - 62 - cam;
  rect(fx, 98, 20, 26, '#4a3524'); rect(fx + 2, 100, 16, 22, '#c9b98f');
  rect(fx + 4, 104, 12, 8, '#8a6a50'); rect(fx + 6, 106, 8, 4, '#5f4a3a');
  rect(fx + 4, 114, 12, 2, '#5a4a40'); rect(fx + 6, 117, 8, 1, '#5a4a40');
  const scx = car.end - 30 - cam;
  rect(scx, 106, 1, 6, '#6a5a3a'); rect(scx - 4, 102, 9, 5, '#d8b57a');
  rect(scx - 3, 101, 7, 1, '#f0d8a0'); rect(scx - 2, 107, 5, 1, '#8a6a40');
  lights.push({ x: scx + .5, y: 107, r: 26, color: 'rgba(255,200,130,.3)' });

  // 천장 램프
  for (const o of LAMP_OFFSETS) {
    const lx = car.start + o - cam;
    if (lx < -20 || lx > W + 20) continue;
    rect(lx, 62, 1, 10, '#3a3a3a');
    rect(lx - 7, 72, 14, 2, '#3a2d1f'); rect(lx - 9, 74, 18, 3, '#4a3a28'); rect(lx - 9, 77, 18, 1, '#2a2016');
    rect(lx - 6, 78, 12, 1, '#ffd890'); rect(lx - 1, 79, 3, 1, '#fff4d0');
    lamps.push(Math.round(lx));
  }
}

// 창밖: 하늘 → 먼 건물(네온) → 안개 → 가까운 건물 → 비. 열차가 달리므로 시간에 따라 흐른다.
function drawOutside(cam, t) {
  ctx.drawImage(sky, 0, 0);

  const p1 = cam * .15 + t * .012, span1 = 1500;
  for (let i = 0; i < 26; i++) {
    const w = 26 + (hash(i) * 30 | 0), h = 45 + (hash(i + 7) * 75 | 0);
    const bx = Math.round((((i * 58 - p1) % span1) + span1) % span1 - 60), top = 165 - h;
    rect(bx, top, w, h, '#111a21'); rect(bx, top, w, 1, '#1b2730');
    for (let wy = top + 5; wy < 160; wy += 7) for (let wx = bx + 3; wx + 3 < bx + w - 2; wx += 6) {
      const r = hash(i * 977 + (wx - bx) * 13 + wy);
      if (r < .32) {
        const blink = r < .04 && ((t / 900 + i) | 0) % 2;
        if (!blink) rect(wx, wy, 3, 4, r < .2 ? '#d19a52' : '#6fa7bb');
      } else rect(wx, wy, 3, 4, '#0c1319');
    }
    if (i % 5 === 2) neon(bx + (w >> 1) - 9, top + 9, i % 2, i, t);
  }

  // 안개 띠 (화면 고정)
  srect(0, 128, W, 14, 'rgba(34,56,70,.8)', 2);
  srect(0, 142, W, 14, 'rgba(34,56,70,.8)', 4);
  srect(0, 156, W, 20, 'rgba(34,56,70,.8)', 7);

  const p2 = cam * .4 + t * .04, span2 = 1900;
  for (let i = 0; i < 22; i++) {
    const w = 40 + (hash(i + 50) * 50 | 0), h = 35 + (hash(i + 90) * 60 | 0);
    const bx = Math.round((((i * 93 - p2) % span2) + span2) % span2 - 90), top = 176 - h;
    rect(bx, top, w, h, '#090e11'); rect(bx, top, w, 1, '#141c21'); rect(bx, top, 1, h, '#0f1619');
    for (let wy = top + 8; wy < 170; wy += 11) for (let wx = bx + 5; wx + 4 < bx + w - 3; wx += 9) {
      const r = hash(i * 311 + (wx - bx) * 7 + wy * 3);
      if (r < .12) { rect(wx, wy, 4, 5, '#c08a48'); rect(wx, wy, 4, 2, '#e0a860'); }
      else rect(wx, wy, 4, 5, '#0d1418');
    }
    if (i % 3 === 0) { // 옥상 물탱크
      rect(bx + 6, top - 9, 10, 8, '#0e1417'); rect(bx + 5, top - 10, 12, 1, '#17212a');
      rect(bx + 7, top - 1, 1, 1, '#0a0f12'); rect(bx + 14, top - 1, 1, 1, '#0a0f12');
    }
    if (i % 4 === 1) { // 안테나 + 빨간 경고등
      rect(bx + w - 8, top - 14, 1, 14, '#141c20');
      if (((t / 700) | 0) % 2) { rect(bx + w - 8, top - 15, 1, 1, '#ff4a4a'); srect(bx + w - 10, top - 17, 5, 5, 'rgba(255,74,74,.5)', 4); }
    }
    if (i % 3 === 2) for (let fy = top + 6; fy < 170; fy += 12) { // 비상계단
      rect(bx + w - 6, fy, 6, 1, '#151d22'); rect(bx + w - 6, fy, 1, 12, '#151d22');
    }
  }

  for (let i = 0; i < 110; i++) {
    const x = Math.round(((i * 53 - t * .06) % 520 + 520) % 520 - 20);
    const y = Math.round((i * 37 + t * .28 * (.8 + (i % 3) * .15)) % 200);
    ctx.fillStyle = i % 4 ? 'rgba(170,190,200,.28)' : 'rgba(200,215,220,.45)';
    ctx.fillRect(x, y, 1, 3); ctx.fillRect(x - 1, y + 3, 1, 3);
  }
}

const NEON = [
  { c: '#4fe0ff', g: 'rgba(79,224,255,.28)' },
  { c: '#ff5fa6', g: 'rgba(255,95,166,.28)' },
];
function neon(x, y, kind, i, t) {
  const { c, g } = NEON[kind];
  const on = Math.sin(t * .004 + i * 1.7) > -.75; // 가끔 깜빡인다
  rect(x, y, 18, 7, '#15101a');
  if (!on) return;
  rect(x, y, 18, 1, c); rect(x, y + 6, 18, 1, c); rect(x, y, 1, 7, c); rect(x + 17, y, 1, 7, c);
  rect(x + 3, y + 2, 2, 3, c); rect(x + 7, y + 2, 4, 1, c); rect(x + 8, y + 3, 1, 2, c); rect(x + 13, y + 2, 2, 3, c);
  ctx.globalCompositeOperation = 'lighter';
  srect(x - 6, y - 5, 30, 17, g, 2); srect(x - 3, y - 2, 24, 11, g, 3);
  ctx.globalCompositeOperation = 'source-over';
}

// 유리: 푸른 색조, 사선 반사, 흘러내리는 빗방울, 아래쪽 김서림
function drawGlass(w, t) {
  const x = Math.round(w.x), y = 85;
  srect(x, y, 69, 89, 'rgba(120,160,175,.35)', 1);
  ctx.fillStyle = dither('rgba(223,232,234,.5)', 2);
  ctx.beginPath(); ctx.moveTo(x + 44, y); ctx.lineTo(x + 54, y); ctx.lineTo(x + 24, y + 89); ctx.lineTo(x + 14, y + 89); ctx.closePath(); ctx.fill();
  srect(x, y + 72, 69, 17, 'rgba(159,182,189,.4)', 3);
  for (let k = 0; k < 7; k++) {
    const dx = 2 + (hash(w.seed + k * 13) * 64 | 0);
    const sp = .03 * (.7 + hash(w.seed + k) * .9);
    const dy = (t * sp + hash(w.seed + k + 5) * 89) % 89;
    rect(x + dx, y + dy, 1, 2, '#c7dbe0');
    const tl = Math.min(8, dy);
    ctx.fillStyle = 'rgba(199,219,224,.3)';
    ctx.fillRect(x + dx, Math.round(y + dy - tl), 1, Math.round(tl));
  }
}

function drawWindowFrame(x) {
  x = Math.round(x);
  rect(x - 3, 81, 75, 4, '#4e3624'); rect(x - 3, 81, 75, 1, '#7a5a3c');
  rect(x - 3, 81, 3, 97, '#4e3624'); rect(x + 69, 81, 3, 97, '#4e3624'); rect(x - 2, 82, 1, 95, '#7a5a3c');
  rect(x + 33, 85, 3, 89, '#4e3624'); rect(x + 33, 85, 1, 89, '#6a4a30');
  rect(x - 5, 174, 79, 5, '#6a4a30'); rect(x - 5, 174, 79, 1, '#8a6a46'); rect(x - 5, 179, 79, 2, '#1b130e');
}

/* ---------- 가구 ---------- */
function sofa(x, flip) {
  const bx = flip ? x + 28 : x;
  rect(bx, 182, 8, 31, '#5e2332'); rect(bx + (flip ? 0 : 7), 183, 1, 29, '#8a3a4c'); rect(bx + 1, 182, 6, 1, '#8a3a4c');
  rect(bx + 2, 188, 4, 1, '#4a1a28'); rect(bx + 2, 196, 4, 1, '#4a1a28');
  rect(x, 204, 36, 9, '#7a2f40'); rect(x, 204, 36, 1, '#9a4255'); rect(x + 17, 205, 1, 8, '#5a2030');
  rect(x + 1, 213, 34, 8, '#4f1d2a'); rect(x + 1, 213, 34, 1, '#6a2a3a');
  rect(x + 3, 221, 4, 4, '#2a1c15'); rect(x + 29, 221, 4, 4, '#2a1c15');
  const ax = flip ? x : x + 28;
  rect(ax, 198, 8, 6, '#6a2a3a'); rect(ax, 198, 8, 1, '#8a3a4c');
}

function chair(x, flip) {
  const bx = flip ? x + 6 : x;
  rect(bx, 186, 3, 20, '#4a3324'); rect(bx + (flip ? 0 : 2), 186, 1, 20, '#6a4a34');
  rect(x, 206, 9, 4, '#5a3e2b'); rect(x, 206, 9, 1, '#7a5a40');
  rect(x + 1, 210, 2, 15, '#3a2818'); rect(x + 6, 210, 2, 15, '#3a2818');
}

const FURN = {
  suite(x) {
    sofa(x + 2, false); sofa(x + 49, true);
    rect(x + 37, 200, 14, 3, '#8a6a44'); rect(x + 37, 200, 14, 1, '#a8865a');
    rect(x + 43, 203, 2, 18, '#5a4530'); rect(x + 40, 221, 8, 2, '#3a2a1c');
    rect(x + 40, 190, 8, 5, '#e0b878'); rect(x + 40, 194, 8, 1, '#b8905a'); rect(x + 41, 190, 6, 1, '#f4d9a0');
    rect(x + 43, 195, 2, 5, '#3a2a1a');
    lights.push({ x: x + 44, y: 197, r: 22, color: 'rgba(255,200,120,.3)' });
  },
  dining(x) {
    chair(x, false); chair(x + 77, true);
    rect(x + 8, 200, 70, 4, '#e6dcc6'); rect(x + 8, 200, 70, 1, '#f5efe0'); rect(x + 8, 204, 70, 5, '#cfc4ad');
    srect(x + 8, 207, 70, 2, '#a89d88', 8);
    rect(x + 12, 209, 62, 3, '#3a2a1c'); rect(x + 14, 212, 4, 13, '#2a1c13'); rect(x + 68, 212, 4, 13, '#2a1c13');
    rect(x + 24, 195, 5, 5, '#efe9df'); rect(x + 24, 195, 5, 1, '#fbf7ee'); rect(x + 29, 196, 1, 3, '#efe9df');
    steams.push(x + 26);
    rect(x + 52, 189, 3, 11, '#1e3a2a'); rect(x + 52, 187, 1, 2, '#1e3a2a'); rect(x + 52, 193, 3, 4, '#b8a070'); rect(x + 53, 189, 1, 2, '#3a5a44');
    rect(x + 58, 193, 3, 5, '#8aa3aa'); rect(x + 59, 198, 1, 2, '#8aa3aa'); rect(x + 58, 200, 3, 1, '#8aa3aa'); rect(x + 58, 196, 3, 2, '#7a2a35');
    rect(x + 37, 188, 10, 6, '#a8383a'); rect(x + 38, 188, 8, 1, '#c85050'); rect(x + 37, 193, 10, 1, '#7a2628'); rect(x + 41, 194, 2, 6, '#3a2a1a');
    lights.push({ x: x + 42, y: 196, r: 22, color: 'rgba(255,170,120,.32)' });
  },
  second(x) {
    rect(x + 2, 184, 82, 20, '#3a5e4c'); rect(x + 2, 184, 82, 2, '#4d7560');
    for (let i = 0; i < 6; i++) rect(x + 9 + i * 14, 187, 1, 15, '#2f4d3e');
    rect(x, 204, 86, 8, '#355545'); rect(x, 204, 86, 1, '#4d7560');
    rect(x + 2, 212, 82, 8, '#1f2a25'); rect(x + 2, 212, 82, 1, '#2a3a32');
    rect(x + 4, 220, 5, 5, '#2a2a28'); rect(x + 77, 220, 5, 5, '#2a2a28');
    rect(x + 1, 197, 2, 8, '#9a9a92'); rect(x + 83, 197, 2, 8, '#9a9a92');
    rect(x + 30, 201, 12, 3, '#d8d2c0'); rect(x + 31, 202, 10, 1, '#6a6a62');
  },
  third(x) {
    rect(x + 2, 186, 3, 26, '#4a3220'); rect(x + 81, 186, 3, 26, '#4a3220');
    for (let i = 0; i < 3; i++) { rect(x + 2, 186 + i * 6, 82, 4, '#6b4a2e'); rect(x + 2, 186 + i * 6, 82, 1, '#86603e'); }
    rect(x, 206, 86, 6, '#6b4a2e'); rect(x, 206, 86, 1, '#86603e'); rect(x, 211, 86, 1, '#4a3220');
    rect(x + 4, 212, 4, 13, '#3a2818'); rect(x + 78, 212, 4, 13, '#3a2818'); rect(x + 8, 219, 70, 1, '#3a2818');
    rect(x + 40, 193, 17, 13, '#5a4536'); rect(x + 40, 193, 17, 1, '#7a6250'); rect(x + 40, 193, 1, 13, '#7a6250');
    rect(x + 45, 197, 7, 1, '#3a2a20'); rect(x + 47, 199, 3, 2, '#c9a860'); rect(x + 56, 193, 1, 13, '#3a2a20');
    rect(x + 14, 217, 10, 8, '#6a5a48'); rect(x + 15, 216, 8, 1, '#8a7a62');
  },
};

function drawDoor(dx) {
  rect(dx - 11, 66, 22, 159, '#0a0d0f');
  rect(dx - 11, 66, 1, 159, '#3a2a1f'); rect(dx + 10, 66, 1, 159, '#3a2a1f'); rect(dx - 10, 66, 20, 2, '#3a2a1f');
  rect(dx - 8, 92, 16, 133, '#1c1b1c'); rect(dx - 8, 92, 16, 1, '#2e2c2e'); rect(dx - 8, 92, 1, 133, '#2e2c2e');
  rect(dx - 5, 100, 10, 22, '#1f2f38'); srect(dx - 5, 100, 10, 22, '#4a6a78', 4);
  rect(dx - 5, 100, 10, 1, '#0d1114'); rect(dx - 5, 100, 1, 22, '#0d1114');
  rect(dx - 6, 130, 12, 1, '#111111'); rect(dx - 6, 180, 12, 1, '#111111'); rect(dx + 4, 160, 2, 5, '#c9a860');
  rect(dx - 7, 72, 14, 8, '#0f1a12');
  rect(dx - 5, 74, 3, 4, '#46e08a'); rect(dx - 1, 74, 3, 4, '#46e08a'); rect(dx + 3, 74, 3, 4, '#46e08a');
  lights.push({ x: dx, y: 76, r: 12, color: 'rgba(70,224,138,.25)' });
}

function drawFurniture(car, sx, ex, cam) {
  for (let wx = car.start + 44; wx + 87 < car.end - 20; wx += 180) {
    const x = wx - cam;
    if (x < -100 || x > W + 10) continue;
    FURN[car.prop](x);
  }
  if (car.start > 0) drawDoor(Math.round(sx));
  // 칸 번호판
  const p = Math.round(sx) + 14;
  rect(p, 70, 52, 9, '#1c1510'); rect(p + 1, 71, 50, 7, '#b08a4c'); rect(p + 1, 71, 50, 1, '#d4ac66');
  ctx.fillStyle = '#2a1d10';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(car.plate, p + 26, 77);
}

function drawFloor(car, sx, ex, cam) {
  const x0 = Math.max(Math.round(sx), 0), x1 = Math.min(Math.round(ex), W), w = x1 - x0;
  if (w <= 0) return;
  if (car.floor === 'carpet') {
    rect(x0, FLOOR, w, H - FLOOR, '#3a1a21');
    drect(x0, FLOOR + 6, w, H - FLOOR - 6, '#4a2430', 5);
    rect(x0, FLOOR + 3, w, 1, '#8a6b3c'); rect(x0, H - 5, w, 1, '#8a6b3c');
    for (let wx = car.start + 8; wx < car.end; wx += 24) {
      const x = wx - cam;
      if (x < x0 - 8 || x > x1) continue;
      rect(x, FLOOR + 18, 4, 1, '#6b3d4a'); rect(x + 1, FLOOR + 17, 2, 3, '#6b3d4a');
    }
  } else if (car.floor === 'tile') {
    rect(x0, FLOOR, w, H - FLOOR, '#262320');
    const startX = Math.floor(Math.max(car.start, cam) / 8) * 8;
    for (let wx = startX; wx < Math.min(car.end, cam + W); wx += 8) {
      if (wx < car.start) continue;
      for (let ty = FLOOR + 1; ty < H; ty += 8)
        if (((wx / 8) + ((ty - FLOOR - 1) / 8)) % 2 === 0) rect(wx - cam, ty, 8, 8, '#332e29');
    }
    srect(x0, H - 14, w, 14, '#0a0a0a', 4);
  } else {
    rect(x0, FLOOR, w, H - FLOOR, car.prop === 'third' ? '#261c14' : '#2c2118');
    for (let wx = Math.floor(cam / 40) * 40; wx < cam + W; wx += 40) {
      if (wx < car.start || wx >= car.end) continue;
      rect(wx - cam, FLOOR, 1, H - FLOOR, '#1d1610');
    }
    rect(x0, FLOOR + 15, w, 1, '#1d1610'); rect(x0, FLOOR + 30, w, 1, '#1d1610');
    drect(x0, FLOOR, w, 8, '#3a2c1f', 4);
    if (car.prop === 'third') drect(x0, FLOOR + 20, w, H - FLOOR - 20, '#140f0b', 5);
  }
  rect(x0, FLOOR, w, 1, '#5a4a36'); rect(x0, FLOOR + 1, w, 1, '#1a1410');
}

/* ---------- 캐릭터 ---------- */
function drawSprite(frames, x, y, frame, facing) {
  const img = frames[frame];
  const xi = Math.round(x), sx = xi - 8, sy = Math.round(y) - 36;
  ctx.fillStyle = dither('#04060a', 9);
  ctx.beginPath(); ctx.ellipse(xi, FLOOR + 1, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  if (facing < 0) {
    ctx.save(); ctx.translate(sx + 16, sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
  } else ctx.drawImage(img, sx, sy);
}

/* ---------- 조명 (가산 합성 + 디더) ---------- */
// 옅은 바탕 + 안쪽으로 갈수록 촘촘해지는 디더 3겹. 바탕이 있어 점이 그물처럼 보이지 않는다.
function cone(x, topY, topW, botW, botY, sway, base, color) {
  const path = k => {
    ctx.beginPath();
    ctx.moveTo(x - topW * k, topY); ctx.lineTo(x + topW * k, topY);
    ctx.lineTo(x + botW * k + sway, botY); ctx.lineTo(x - botW * k + sway, botY);
    ctx.closePath();
  };
  ctx.fillStyle = base; path(1); ctx.fill();
  for (const [k, d] of [[.85, 3], [.6, 5], [.35, 8]]) { ctx.fillStyle = dither(color, d); path(k); ctx.fill(); }
}

function halo(x, y, r, color) {
  for (const [k, d] of [[1, 2], [.66, 4], [.33, 7]]) {
    ctx.fillStyle = dither(color, d);
    ctx.beginPath(); ctx.arc(x, y, r * k, 0, Math.PI * 2); ctx.fill();
  }
}

function drawLights(t) {
  ctx.globalCompositeOperation = 'lighter';
  for (const lx of lamps) {
    const sway = Math.sin(t * .0015 + lx * .02) * 2; // 열차 흔들림
    cone(lx, 79, 6, 58, FLOOR, sway, 'rgba(255,196,120,.07)', 'rgba(255,196,120,.13)');
    halo(lx, 79, 7, 'rgba(255,220,160,.3)');
    srect(lx - 16 + sway, FLOOR, 32, H - FLOOR, 'rgba(255,196,120,.14)', 3);
    srect(lx - 8 + sway, FLOOR, 16, H - FLOOR, 'rgba(255,196,120,.14)', 6);
  }
  for (const l of lights) halo(l.x, l.y, l.r, l.color);
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- 입자: 먼지, 김, 담배 연기 ---------- */
function drawParticles(cam, t) {
  ctx.fillStyle = 'rgba(255,222,170,.5)';
  for (const lx of lamps) for (let i = 0; i < 7; i++) {
    const y = 84 + ((t * .006 * (1 + i * .07) + i * 23 + lx) % 136);
    const x = lx + Math.sin(t * .0005 * (1 + i * .1) + i * 1.3 + lx * .01) * (8 + (y - 84) * .3);
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  for (const sx of steams) for (let k = 0; k < 4; k++) {
    const ph = (t * .02 + k * 6) % 22;
    const x = sx + Math.sin(t * .003 + k * 2 + ph * .3) * 1.5;
    ctx.fillStyle = `rgba(235,235,235,${(1 - ph / 22) * .6})`;
    ctx.fillRect(Math.round(x), Math.round(194 - ph), 1, 1);
  }
  for (const p of state.smoke) {
    ctx.fillStyle = `rgba(210,210,215,${Math.min(.6, p.life * .5)})`;
    const s = p.life < 1.2 ? 2 : 1;
    ctx.fillRect(Math.round(p.x - cam), Math.round(p.y), s, s);
  }
}

/* =========================================================
 * 9. 필름 그레인 오버레이 (CSS에서 애니메이션)
 * ========================================================= */
(function makeGrain() {
  const g = document.createElement('canvas');
  g.width = g.height = 96;
  const gc = g.getContext('2d');
  const id = gc.createImageData(96, 96);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255 | 0;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  gc.putImageData(id, 0, 0);
  const el = document.querySelector('.grain');
  if (el) el.style.backgroundImage = `url(${g.toDataURL()})`;
})();

/* =========================================================
 * 10. 메인 루프
 * ========================================================= */
function frame(t) {
  const dt = state.lastTime ? Math.min(.04, (t - state.lastTime) / 1000) : 0;
  state.lastTime = t;
  update(dt);
  draw(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
