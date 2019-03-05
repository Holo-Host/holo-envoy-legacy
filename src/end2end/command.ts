import * as program from 'commander'
import {Client} from 'rpc-websockets'

import * as C from '../config'
import {fail} from '../common'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:")
  console.log("reason: ", reason)
})

const dnaHash = 'Qm_WHATEVER_TODO'
const agentKey = 'dummy-fake-not-real-agent-public-address'

export const withClient = fn => {
  const client = new Client(`ws://localhost:${C.PORTS.intrceptr}`)
  client.on('error', msg => console.error("WS Client error: ", msg))
  client.once('open', async () => {
    client.subscribe('agent/sign')
    client.on('agent/sign', (params) => {
      console.log('on agent/sign:', params)
      const {entry, id} = params
      client.call('holo/clientSignature', {
        signature: 'TODO-signature',
        requestId: id,
      })
    })
    await fn(client)
    client.close()
  })
}

//////////////////////////////////////////////////

const install = (dir, cmd) => withClient(async client => {
  await client.call('holo/happs/install', {happId: 'simple-app', agentId: C.hostAgentId})
  await client.call('holo/happs/install', {happId: 'holo-hosting', agentId: C.hostAgentId})
})

const newAgent = (dir, cmd) => withClient(async client => {
  await client.call('holo/identify', {agentKey})
  await client.call('holo/agents/new', {agentKey, happId: 'TODO NOT REAL HAPPID'})
})

program.version('0.0.1')
program.command('install').action(install)
program.command('new-agent').action(newAgent)

program.parse(process.argv)
