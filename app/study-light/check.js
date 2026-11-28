// playwright-cli run-code --filename=... after opening the dedicated reference app.
async (page) => {
  page.setDefaultTimeout(5000);
  const errors = [];
  const base = page.url().split('#')[0];
  const go = async (hash) => {
    await page.goto(base + '#' + hash);
    await page.locator('nav.tabs a[aria-current][href="#' + hash + '"]').waitFor();
  };
  const expect = (pass, label) => {
    if (!pass) throw new Error(label);
  };
  const el = (s) => page.locator(s);
  const btn = (name) => page.getByRole('button', { name, exact: true });
  const shot = async (name) => {
    await page.mouse.move(1, 1);
    await page.screenshot({ path: 'output/playwright/' + name + '.png', animations: 'disabled' });
  };
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (req) => {
    if (!req.url().startsWith(new URL(base).origin + '/') && !req.url().startsWith('data:'))
      errors.push('unexpected request');
  });
  await page.reload();
  await go('w01-p1/0');
  const sizes = [320, 375, 390, 720, 721, 1031, 1280, 1440];
  const units = ['w01-p1', 'w01-p2', 'w01-p3', 'w01-p4', 'w02-p0', 'w02-p1', 'w02-p2', 'w02-p3', 'w02-p4'];
  for (const id of units) {
    for (const tab of [0, 1, 2, 3]) {
      await go(id + '/' + tab);
      for (const width of sizes) {
        const height = width < 720 ? 844 : 860;
        await page.setViewportSize({ width, height });
        const problems = await page.evaluate(() => {
          const areas = [
            document.documentElement,
            ...document.querySelectorAll(
              '.permission-map,.flow-node,.flow-edge,.focus-note,.branch-row,.run-units,.board,.axis,dd,.art-head,.figure,.options,.reading,header,.top,aside,button',
            ),
          ];
          return areas
            .filter((e) => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1)
            .map((e) => e.className || e.tagName);
        });
        if (problems.length) errors.push({ id, tab, width, problems });
        if (!tab && [390, 1280].includes(width)) {
          if (id === 'w01-p1') {
            await page.evaluate(() => window.scrollTo(0, 0));
            const node = await el('[data-node=bucket]').boundingBox();
            expect(node.y + node.height < height, 'Full path at ' + width);
            await shot('topology-' + width);
            await btn('比較').click();
            const bounds = await el('.board').boundingBox();
            expect(
              bounds.y >= 0 && bounds.y + bounds.height < height,
              'All three scenes must fit at ' + width,
            );
          }
          await shot(id + '-' + width);
          if (id === 'w01-p1') await btn('全体図').click();
          if (width === 1280 && ['w01-p3', 'w02-p0'].includes(id)) {
            const name = id === 'w01-p3' ? 'scope' : 'week2';
            await el('.figure')
              .first()
              .screenshot({ path: 'output/playwright/' + name + '.png' });
          }
        }
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go('w01-p1/0');
  const selector = page.getByLabel('権限の条件');
  const results = ['許可許可許可', '拒否未到達未到達', '許可拒否未到達', '許可許可拒否'];
  const actors = ['developer', 'account', 'portal', 'app', 'bucket'];
  for (const width of [320, 375, 390, 721, 1031, 1280]) {
    await page.setViewportSize({ width, height: 860 });
    let baseline;
    for (const value of [0, 1, 2, 3]) {
      await selector.selectOption('' + value);
      expect(
        (await el('.flow-edge .verdict').allTextContents()).join('') === results[value],
        'map results ' + value,
      );
      expect(
        (await el('.flow-node').evaluateAll((nodes) => nodes.map((n) => n.dataset.node).join(' '))) ===
          actors.join(' '),
        'fixed actors',
      );
      const pos = await el('.permission-map').evaluate((map) =>
        Array.from(map.querySelectorAll('.flow-node')).map((n) =>
          Math.round(n.getBoundingClientRect().top + window.scrollY),
        ),
      );
      if (value === 0) baseline = pos;
      else
        expect(
          pos.every((v, j) => Math.abs(v - baseline[j]) < 3),
          'moving nodes ' + width + ' ' + value + ' ' + baseline + ' -> ' + pos,
        );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        'overflow ' + width,
      );
    }
  }
  await selector.selectOption('0');
  await el('[data-edge=read] > button').click();
  expect((await el('.focus-note').innerText()).includes('メタデータサーバー'), 'selected explanation');
  expect((await el('.board [aria-current=step]').innerText()).includes('読み取り'), 'selected comparison');
  await selector.selectOption('2');
  await page.mouse.move(1, 1);
  await el('.figure').screenshot({ path: 'output/playwright/blocked.png' });
  await el('[data-edge=read] > button').click();
  expect((await el('dialog[open]').innerText()).includes('判定されません'), 'blocked route details');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(!(await el('.flow-line i').isVisible()), 'reduced motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await btn('比較').click();
  for (const value of [0, 1, 2, 3]) {
    await selector.selectOption('' + value);
    expect(
      (await el('.board .verdict').allTextContents()).join('') === results[value],
      'deny matrix ' + value,
    );
  }
  await selector.selectOption('2');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('denied');
  await btn('読み取りの詳細').click();
  expect((await el('dialog').innerText()).includes('未到達'), 'unreached detail');
  await el('dialog [data-term="object-viewer"]').first().click();
  expect((await el('dialog[open]').count()) === 2, 'dictionary on top of inspector');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await el('.axis [data-term=act-as]').click();
  expect(await el('.dictionary .analogy').isVisible(), 'definition with analogy');
  await shot('term');
  await el('.dictionary .term-list button').first().click();
  await btn('前の用語へ').click();
  await page.keyboard.press('Escape');
  expect(await el('.axis [data-term=act-as]').evaluate((e) => document.activeElement === e), 'focus return');
  await btn('この単元の用語').click();
  await page.getByLabel('用語を検索').fill('リビジョン');
  expect((await el('.dictionary-row').count()) > 0, 'cross-week search');
  await btn('閉じる').click();
  await btn('拡大').click();
  expect(await btn('次のステップ').isDisabled(), 'blocked after denial');
  await page.getByLabel('再生速度').selectOption('2');
  await btn('最初から再生').click();
  await btn('最初から再生').waitFor({ timeout: 9000 });
  expect((await page.getByLabel('再生位置').inputValue()) === '12', 'auto-stop at denial');
  await selector.selectOption('0');
  await btn('再生').click();
  await el('.key-name button').click();
  await el('dialog[open]').waitFor();
  await page.keyboard.press('Escape');
  await btn('再生').waitFor();
  await btn('次のステップ').click();
  await go('w01-p1/1');
  await el('.choice').nth(1).click();
  expect((await el('.feedback').innerText()).includes('正解'), 'quiz');
  await go('w01-p1/0');
  expect((await page.getByLabel('再生位置').inputValue()) === '16', 'saved step');
  await shot('sequence');
  await go('w01-p1/2');
  await page.getByText('設定画面を見る').click();
  await el('.console-shot-trigger').first().click();
  await el('.console-lightbox-img').evaluate((img) => img.decode());
  await page.keyboard.press('Escape');
  await go('w01-p2/0');
  expect((await el('.board').first().locator('[data-term=metadata-server]').count()) === 1, 'metadata link');
  await go('w01-p3/0');
  for (const [label, count] of [
    ['キー単体', 1],
    ['プロジェクト', 2],
    ['フォルダ', 3],
  ]) {
    await page.getByRole('group', { name: '許可を付ける範囲' }).getByRole('button', { name: label }).click();
    expect((await el('[data-access=direct]').count()) === 1, 'one grant');
    expect((await el('.branch-note').filter({ hasText: '読める' }).count()) === count, 'scope ' + label);
    expect(
      (await el('[data-resource=test-key] [data-access=inherited]').count()) === (count === 3 ? 1 : 0),
      'dev branch',
    );
    expect((await el('[data-resource=sa-reader] [data-access]').count()) === 0, 'SA resource not a secret');
  }
  await page.getByLabel('週を選ぶ').selectOption('2');
  await el('.store-art').waitFor();
  expect((await el('.run-units span').count()) === 4, 'both revisions and both tasks');
  expect((await el('.run-map ~ .term-list [data-term]').count()) === 8, 'eight prerequisite terms');
  await go('w02-p2/0');
  await btn('50%').click();
  await btn('旧版に戻す').click();
  expect((await page.getByLabel('新版への配分').inputValue()) === '0', 'rollback');
  await go('w02-p2/3');
  expect((await el('textarea').count()) === 3, 'three predictions');
  expect((await el('button button, a button, summary button').count()) === 0, 'nested controls');
  expect(!errors.length, JSON.stringify(errors.slice(0, 16)));
  return units.length * 4 * sizes.length + ' layouts and study interactions passed';
}
