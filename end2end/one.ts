
import * as test from 'tape'

import {PORTS} from '../config'
import {Client} from 'rpc-websockets'


const agentKey = 'HcScIkRaAaaaaaaaaaAaaaAAAAaaaaaaaaAaaaaAaaaaaaaaAaaAAAAatzu4aqa'
const dnaHash = 'QmSKxN3FGVrf1vVMav6gohJVi7GcF4jFcKVDhDcjiAnveo'

test('end to end test', async t => {
  const client = new Client(`ws://localhost://${PORTS.intrceptr}`)
  client.on('open', async () => {
    const agentId = await client.call('holo/identify', {agentKey})
    const happId = 'TODO'
    const func = 'simple/get_links'
    const params = {base: 'QmTODO'}
    const signature = 'TODO'
    t.equal(agentId, agentKey)
    
    const result = await client.call('holo/call', {
      agentId, happId, dnaHash, function: func, params, signature
    })
    t.ok(result.Ok)

    t.end()
  })
})