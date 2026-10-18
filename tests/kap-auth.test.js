// kap 鉴权辅助（src/kap-auth.mjs）：令牌读不到时向后兼容裸调。
// 用 KIMI_CODE_HOME 指向临时目录来造场景，不碰用户真令牌。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { kapToken, kapAuthHeaders } from '../src/kap-auth.mjs';

function withTempHome(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kcm-kap-auth-'));
  const previous = process.env.KIMI_CODE_HOME;
  process.env.KIMI_CODE_HOME = dir;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (previous === undefined) delete process.env.KIMI_CODE_HOME;
      else process.env.KIMI_CODE_HOME = previous;
      fs.rmSync(dir, { recursive: true, force: true });
    });
}

test('kapToken：读到 server.token 内容（去首尾空白）', async () => {
  await withTempHome(() => {
    fs.writeFileSync(path.join(process.env.KIMI_CODE_HOME, 'server.token'), '  test-token-123\n');
    assert.equal(kapToken(), 'test-token-123');
    assert.deepEqual(kapAuthHeaders(), { Authorization: 'Bearer test-token-123' });
  });
});

test('kapToken：文件缺失/为空都返回空串，鉴权头为空对象（老客户端裸调兼容）', async () => {
  await withTempHome(() => {
    // 目录存在但无 token 文件
    assert.equal(kapToken(), '');
    assert.deepEqual(kapAuthHeaders(), {});
    // 空文件
    fs.writeFileSync(path.join(process.env.KIMI_CODE_HOME, 'server.token'), '   \n');
    assert.equal(kapToken(), '');
    assert.deepEqual(kapAuthHeaders(), {});
  });
});
