// playwright-cli run-code --filename=../app/study-light/check-library.js (from local/)
async (page) => {
  page.setDefaultTimeout(5000);
  const errors = [];
  const base = page.url().split('#')[0];
  page.on('pageerror', (e) => errors.push(e.message));
  const expect = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const el = (s) => page.locator(s);
  const button = (name) => page.getByRole('button', { name, exact: true });
  const widths = [320, 375, 390, 720, 721, 1030, 1031, 1280];
  const size = (width) => page.setViewportSize({ width, height: width <= 720 ? 844 : 860 });
  const shot = async (name) => {
    await page.mouse.move(0, 0);
    await page.screenshot({ path: 'output/playwright/' + name + '.png' });
  };
  async function checkLayout() {
    const errors = await page.evaluate(() => {
      const elements = [
        document.documentElement,
        ...document.querySelectorAll(
          'button, .art-grid, .art-filters, .stage-strip, .stage-strip li div, .options, .insight, dialog',
        ),
      ];
      return elements
        .filter((e) => e.clientWidth && e.scrollWidth > e.clientWidth + 1)
        .map((e) => e.className || e.tagName);
    });
    expect(!errors.length, page.url() + ' ' + page.viewportSize().width + ' ' + errors.join(', '));
  }
  await size(1280);
  await page.goto(base + '#w02-p2/2');
  await page.reload();
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  await el('a[href="#art"]').click();
  const tile = el('[data-art]');
  await tile.first().waitFor();
  const ids = await tile.evaluateAll((list) => list.map((b) => b.dataset.art));
  expect(ids.length === 72 && new Set(ids).size === 72, 'ArtName count');
  for (const w of widths) {
    await size(w);
    await checkLayout();
    if (w === 1280 || w === 390) await shot('gallery-' + w);
  }
  const search = page.getByRole('searchbox');
  for (const [word, id] of [
    ['Ｃｌｏｕｄ　Ｔａｓｋｓ', 'queue'],
    ['BigQuery', 'warehouse'],
    ['Memory Bank', 'memory'],
    ['A2A', 'handoff'],
    ['長期記憶', 'memory'],
  ]) {
    await search.fill(word);
    expect(await el('[data-art="' + id + '"]').isVisible(), 'search ' + word);
  }
  await search.fill('unknown-service');
  await button('すべてのイラストを見る').click();
  expect((await tile.count()) === ids.length, 'reset');
  // Every exported SVG must be self-contained, unique and fit the viewBox.
  const issues = await page.evaluate(async () => {
    const issues = [];
    const seen = new Set();
    for (const node of document.querySelectorAll('[data-art] svg')) {
      const id = node.closest('button').dataset.art;
      const xml = new XMLSerializer().serializeToString(node);
      if (seen.has(xml) || node.querySelector('image,use,foreignObject,text,script,style,[id]'))
        issues.push(id);
      seen.add(xml);
      const img = new Image();
      img.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(xml.replace('0 0 240 196', '-20 -20 280 236'));
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 236;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 280, 236);
      const pixels = ctx.getImageData(0, 0, 280, 236).data;
      let count = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 20) continue;
        count++;
        const x = (((i - 3) / 4) % 280) - 20;
        const y = Math.floor((i - 3) / 4 / 280) - 20;
        if (x < 0 || x >= 240 || y < 0 || y >= 196) {
          issues.push(id + ' cropped');
          break;
        }
      }
      if (count < 3000) issues.push(id + ' empty');
    }
    return issues;
  });
  expect(!issues.length, issues.join(', '));
  await size(320);
  for (const id of ids) {
    const btn = el('[data-art="' + id + '"]');
    await btn.click();
    await el('dialog[open]').waitFor();
    await checkLayout();
    expect((await el('.art-snippet code').innerText()) === '<Art name="' + id + '" />', 'snippet ' + id);
    expect((await el('.art-preview div svg').boundingBox()).width === 64, '64px preview ' + id);
    await page.keyboard.press('Escape');
    await el('dialog').waitFor({ state: 'hidden' });
    expect(await btn.evaluate((e) => document.activeElement === e), 'focus ' + id);
  }
  await page.getByLabel('分類を選ぶ').selectOption('#art/agents');
  await page.getByRole('heading', { name: 'エージェント', exact: true }).waitFor();
  expect((await tile.count()) === 8, 'category');
  await size(1280);
  await shot('agents');
  await el('[data-art="memory"]').click();
  await page
    .context()
    .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
  await button('コードをコピー').click();
  expect((await page.evaluate(() => navigator.clipboard.readText())) === '<Art name="memory" />', 'copy');
  const [file] = await Promise.all([page.waitForEvent('download'), button('SVG を保存').click()]);
  expect(file.suggestedFilename() === 'memory.svg' && (await file.failure()) === null, 'download');
  await file.saveAs('output/playwright/memory.svg');
  await shot('art-modal');
  await el('dialog a[href="#figures/context"]').click();
  await el('.demo').waitFor();
  const routes = await el('.demo select option').evaluateAll((list) => list.map((e) => e.value));
  expect(routes.length === 8, 'figure count');
  const verdicts = {
    retry: ['2件に重複', '1件のまま'],
    outbound: ['接続', '未到達', '未到達'],
    release: ['次の段階へ', '旧版へ戻す', '配分を維持'],
    recovery: ['10:20', '10:45', '10:30'],
    context: ['短く説明', '短く説明', '標準の長さ'],
    rag: ['規定を引用', '根拠なし・保留'],
    evaluation: ['両方に合格', '実行手順が不合格', '実行手順が不合格'],
    approval: ['未実行', '未実行', '実行'],
  };
  let layouts = 0;
  for (const route of routes) {
    const id = route.split('/')[1];
    await size(390);
    await page.getByLabel('図解例を選ぶ').selectOption(route);
    await el('.tabs a[href="' + route + '"][aria-current]').waitFor();
    const choices = el('.demo .options button');
    expect((await choices.count()) === verdicts[id].length, 'choices ' + id);
    for (const [i, expected] of verdicts[id].entries()) {
      await choices.nth(i).click();
      expect((await el('.stage-strip li span').last().innerText()) === expected, id + ' step ' + i);
      for (const w of widths) {
        await size(w);
        await checkLayout();
        layouts++;
        if (i === 1 && (w === 390 || w === 1280)) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await shot(id + '-' + w);
        }
      }
    }
    await el('.stage-strip li button').last().click();
    await button('閉じる').click();
    expect((await choices.last().getAttribute('aria-pressed')) === 'true', id + ' choice retained');
  }
  await page.getByRole('link', { name: '教材へ戻る' }).click();
  await el('.tabs a[aria-current][href="#w02-p2/2"]').waitFor();
  expect((await page.evaluate(() => JSON.stringify(localStorage))) === saved, 'storage unchanged');
  expect(!errors.length, errors.join());
  return ids.length + ' illustrations, download, copy, ' + layouts + ' figure layouts and navigation passed';
}
