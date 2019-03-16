import axios from 'axios'
import * as commander from 'commander'
import {Client} from 'rpc-websockets'

import * as C from '../config'
import {fail} from '../common'
import {HAPP_DATABASE} from '../shims/happ-server'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:")
  console.log("reason: ", reason)
})

const happId = 'simple-app'
const dnaHash = HAPP_DATABASE['simple-app'].dnas[0].hash
const agentId = 'dummy-fake-not-real-agent-id'

export const withIntrceptrClient = fn => {
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

const install = async (happId) => {
  const result = await adminCall('holo/happs/install', {happId: happId, agentId: C.hostAgentId})
  console.log(`install ${happId}: `, result.statusText, result.status)
  // const installHHA = await adminCall('holo/happs/install', {happId: 'holo-hosting', agentId: C.hostAgentId})
  // console.log('install holo-hosting-app: ', installHHA.statusText, installHHA.status)
}

const newAgent = (dir, cmd) => withIntrceptrClient(async client => {
  await client.call('holo/identify', {agentId})
  await client.call('holo/agents/new', {agentId, happId})
})

const zomeCallPublic = (dir, cmd) => withIntrceptrClient(async client => {
  const result = await client.call('holo/call', {
    agentId: C.hostAgentId,
    happId,
    dnaHash: dnaHash,
    zome: 'simple',
    function: 'get_links',
    params: {base: 'TODO'},
    signature: 'TODO',
  })
  console.log("how about that! ", result)
})

const zomeCallHosted = (dir, cmd) => withIntrceptrClient(async client => {
  const result = await client.call('holo/call', {
    agentId,
    happId,
    dnaHash: dnaHash,
    zome: 'simple',
    function: 'get_links',
    params: {base: 'TODO'},
    signature: 'TODO',
  })
  console.log("how about that! ", result)
})

commander.version('0.0.1')
commander.command('install <happId>').action(install)
commander.command('new-agent').action(newAgent)
commander.command('zome-call-public').action(zomeCallPublic)
commander.command('zome-call-hosted').action(zomeCallHosted)

commander.parse(process.argv)
