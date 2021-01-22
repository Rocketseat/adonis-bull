import test from 'japa'
import { fs, setupApplication } from '../../test-helpers'
import { BullManager } from '../../src/BullManager'

test.group('Bull Provider', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('register bull provider', async (assert) => {
    const app = await setupApplication()

    assert.instanceOf(app.container.use('Rocketseat/Bull'), BullManager)
  })
})
