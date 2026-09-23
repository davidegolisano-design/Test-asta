const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const images = [], listeners = new Map(), grants = new Set();
  const ctx = vm.createContext({
    window: {
      liveastaPremium: {has: id => grants.has(id)},
      addEventListener: (name, fn) => listeners.set(name, fn)
    },
    document: {readyState: 'loading', addEventListener() {}, querySelectorAll: () => images}
  });
  vm.runInContext(fs.readFileSync('scripts/roles.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('scripts/player-assets.js', 'utf8'), ctx);
  function image() {
    const img = {dataset: {}, requests: [], value: null,
      get src() {return this.value;},
      set src(value) {this.value = value; this.requests.push(value);},
      getAttribute(name) {return name === 'src' ? this.value : null;}
    };
    images.push(img);
    return img;
  }
  return {ctx, grants, image, update: () => listeners.get('liveasta:premium-change')()};
}

test('Free uses the two existing generic assets in Classic and Mantra', () => {
  const {ctx, grants} = setup();
  for (const role of ['P', 'Por', 'por', ' POR ']) {
    assert.equal(ctx.playerImageUrl('123', role), './assets/players/generic-goalkeeper.webp');
  }
  for (const role of ['D', 'C', 'A', 'Dc;Dd', 'T;A', 'Pc', '']) {
    assert.equal(ctx.playerImageUrl('123', role), './assets/players/generic-player.webp');
  }
  grants.add('ready');
  assert.equal(ctx.playerImageUrl('123', 'P'), './assets/players/generic-goalkeeper.webp');
  delete ctx.window.liveastaPremium;
  assert.equal(ctx.playerImageUrl('123', 'P'), './assets/players/generic-goalkeeper.webp');
});

test('Miniature grant includes the catalog; inventory checks remain independent', () => {
  const {ctx, grants} = setup();
  assert.equal(ctx.playerMiniatureAssetUrl('123'), './assets/players/123.webp');
  grants.add('miniatures');
  assert.equal(ctx.playerImageUrl('123', 'Por'), './assets/players/123.webp');
  assert.equal(ctx.playerImageUrl('456', 'A'), './assets/players/456.webp');
  assert.equal(ctx.playerImageUrl('', 'Por'), './assets/players/generic-goalkeeper.webp');
  assert.equal(ctx.playerImageUrl('a/b', 'A'), './assets/players/a%2Fb.webp');
});

test('Grant, revoke and room exit refresh already displayed images without reloading on polling', () => {
  const {ctx, grants, image, update} = setup();
  const desktop = image(), mobile = image(), roster = image();
  ctx.setPlayerImage(desktop, '123', 'P');
  ctx.setPlayerImage(mobile, '123', 'Por');
  ctx.setPlayerImage(roster, '456', 'Dc;Dd');
  grants.add('miniatures'); update();
  assert.equal(desktop.src, './assets/players/123.webp');
  assert.equal(mobile.src, './assets/players/123.webp');
  assert.equal(roster.src, './assets/players/456.webp');
  const requests = desktop.requests.length;
  update(); assert.equal(desktop.requests.length, requests);
  grants.clear(); update();
  assert.equal(desktop.src, './assets/players/generic-goalkeeper.webp');
  assert.equal(mobile.src, './assets/players/generic-goalkeeper.webp');
  assert.equal(roster.src, './assets/players/generic-player.webp');
});

test('Missing personalized images use the correct generic once, without retry loops', () => {
  const {ctx, grants, image, update} = setup();
  grants.add('miniatures');
  const keeper = image();
  ctx.setPlayerImage(keeper, 'missing', 'Por');
  ctx.playerImageFallback(keeper);
  assert.equal(keeper.src, './assets/players/generic-goalkeeper.webp');
  const requests = keeper.requests.length;
  ctx.playerImageFallback(keeper); update();
  ctx.setPlayerImage(keeper, 'missing', 'Por');
  assert.equal(keeper.requests.length, requests);
  ctx.setPlayerImage(keeper, 'missing', 'A');
  assert.equal(keeper.src, './assets/players/generic-player.webp');
  grants.clear(); update(); grants.add('miniatures'); update();
  assert.equal(keeper.src, './assets/players/missing.webp');
});
