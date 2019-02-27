
import * as test from 'tape'
import {Client} from 'rpc-websockets'

import {PORTS} from '../config'
import {fail} from '../common'


const agentKey = 'HcScIkRaAaaaaaaaaaAaaaAAAAaaaaaaaaAaaaaAaaaaaaaaAaaAAAAatzu4aqa'
const dnaHash = 'QmSKxN3FGVrf1vVMav6gohJVi7GcF4jFcKVDhDcjiAnveo'

test('end to end test', async t => {
  const client = new Client(`ws://localhost:${PORTS.intrceptr}`)
  client.on('open', async () => {
    const agentId = await client.call('holo/identify', {agentKey}).catch(fail)
    const happId = 'TODO'
    const func = 'simple/get_links'
    const params = {base: 'QmTODO'}
    const signature = 'TODO'
    t.equal(agentId, agentKey)

    const result = await client.call('holo/call', {
      agentId, happId, dnaHash, function: func, params, signature
    }).catch(fail)
    t.ok(result.Ok)

    t.end()
  })
  client.on('error', msg => console.error("WS Client error: ", msg))
})
