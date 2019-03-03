import * as program from 'commander'
import {Client} from 'rpc-websockets'

import * as C from '../config'
import {fail} from '../common'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:")
  console.log("reason: ", reason)
})

const dnaHash = 'Qm_WHATEVER_TODO'
const agentKey = 'total-dummy-fake-not-real-agent-public-address'

const withClient = fn => {
  const client = new Client(`ws://localhost:${C.PORTS.intrceptr}`)
  client.once('open', async () => {
    await fn(client)
    client.close()
  })
  client.on('error', msg => console.error("WS Client error: ", msg))
}

//////////////////////////////////////////////////

import {initializeConductorConfig} from '../conductor'

const init = (dir, cmd) => {
  initializeConductorConfig()
}

const install = (dir, cmd) => withClient(client =>
  client.call('holo/happs/install', {happId: 'TODO', agentId: C.hostAgentId})
)

const newAgent = (dir, cmd) => withClient(client =>
  client.call('holo/agents/new', {agentKey, happId: 'TODO NOT REAL HAPPID'})
)

program.version('0.0.1')
program.command('init').action(init)
program.command('install').action(install)
program.command('new-agent').action(newAgent)

program.parse(process.argv)
