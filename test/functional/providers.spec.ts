/// <reference path="../../adonis-typings/bull.ts" />

import test from 'japa'
import { fs, setupApplication } from '../../test-helpers'
import { BullManager } from '../../src/BullManager'

test.group('Bull Provider', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('register bull provider', async (assert) => {
    const app = await setupApplication(['../../providers/BullProvider'])
    assert.instanceOf(app.container.use('Rocketseat/Bull'), BullManager)
  })
})
