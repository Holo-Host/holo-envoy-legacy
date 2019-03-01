import * as test from 'tape'
import {Client} from 'rpc-websockets'

import * as C from '../config'
import {fail} from '../common'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:")
  console.log("reason: ", reason)
})

const agentName = C.hostAgentId
const dnaHash = 'Qm_WHATEVER_TODO'

test('end to end test', async t => {
  const client = new Client(`ws://localhost:${C.PORTS.intrceptr}`)

  client.once('open', async () => {

    // TODO: conductor panics if installing the same app twice!
    // console.log('installing happ...')
    // await client.call('holo/happs/install', {happId: 'TODO', agentId: C.hostAgentId})

    console.log('identifying...')
    const agentId = await client.call('holo/identify', {agentKey: agentName}).then(JSON.parse)
    t.equal(agentId, agentName)

    const happId = 'TODO'
    const func = 'simple/get_links'
    const params = {base: 'QmTODO'}
    const signature = 'TODO'

    const result = await client.call('holo/call', {
      agentId: agentName, happId, dnaHash, function: func, params, signature
    }).then(JSON.parse)

    t.ok(result.Ok)

    client.close()
    t.end()
  })
  client.on('error', msg => console.error("WS Client error: ", msg))
})
