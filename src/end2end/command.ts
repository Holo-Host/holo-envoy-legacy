import axios from 'axios'
import * as commander from 'commander'
import {Client} from 'rpc-websockets'

import * as C from '../config'
import {fail} from '../common'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:")
  console.log("reason: ", reason)
})

const dnaHash = 'Qm_WHATEVER_TODO'
const agentKey = 'dummy-fake-not-real-agent-public-address'

export const withInterceptrClient = fn => {
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

const adminCall = (uri, data) => axios.post(`http://localhost:${C.PORTS.admin}/${uri}`, data)

//////////////////////////////////////////////////

const install = async (dir, cmd) => {
  const installSimple = await adminCall('holo/happs/install', {happId: 'simple-app', agentId: C.hostAgentId})
  console.log('install simple-app: ', installSimple.statusText, installSimple.status)
  const installServiceLogs = await adminCall('holo/happs/install', {happId: 'servicelogger', agentId: C.hostAgentId})
  console.log('install servicelogger: ', installServiceLogs.statusText, installServiceLogs.status)
  // const installHHA = await adminCall('holo/happs/install', {happId: 'holo-hosting', agentId: C.hostAgentId})
  // console.log('install holo-hosting-app: ', installHHA.statusText, installHHA.status)
}

const newAgent = (dir, cmd) => withInterceptrClient(async client => {
  await client.call('holo/identify', {agentKey})
  await client.call('holo/agents/new', {agentKey, happId: 'TODO NOT REAL HAPPID'})
})

commander.version('0.0.1')
commander.command('install').action(install)
commander.command('new-agent').action(newAgent)

commander.parse(process.argv)
