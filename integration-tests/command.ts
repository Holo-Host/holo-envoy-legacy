import axios from 'axios'
import * as commander from 'commander'
import {Client} from 'rpc-websockets'

import * as C from '../config'
import {fail, zomeCallByInstance} from '../common'
import {getMasterClient} from '../server'
import {shimHappById, shimHappByNick} from '../shims/happ-server'
import * as HH from '../flows/holo-hosting'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:", reason)
  throw ("Command threw exception, see reason above ^^")
})

const simpleApp = shimHappByNick('simple-app')!
const simpleAppDnaHash = simpleApp.dnas[0].hash
const agentId = 'dummy-fake-not-real-agent-id'

export const withIntrceptrClient = fn => {
  const client = new Client(`ws://localhost:${C.PORTS.intrceptr}`)
  client.on('error', msg => console.error("WS Client error: ", msg))
  client.once('open', async () => {
    client.subscribe('agent/sign')
    client.on('agent/sign', (params) => {
      console.log('on agent/sign:', params)
      const {entry, id} = params
      client.call('holo/wormholeSignature', {
        signature: 'TODO-signature',
        requestId: id,
      })
    })
    await fn(client)
    client.close()
  })
}

export const adminHostCall = (uri, data) => axios.post(`http://localhost:${C.PORTS.admin}/${uri}`, data)

//////////////////////////////////////////////////

export const commandInstall = async (happNick) => {

  const client = getMasterClient()

  const happEntry = shimHappByNick(happNick)!

  const happId = await HH.registerHapp(client, {
    uiHash: happEntry.ui ? happEntry.ui.hash : null,
    dnaHashes: happEntry.dnas.map(dna => dna.hash)
  })
  console.log("registered hApp: ", happId)

  const hostResult = await HH.enableHapp(client, happId)
  console.log(`enabled ${happId}: `, hostResult)

  const happResult = await adminHostCall('holo/happs/install', {happId: happId, agentId: C.hostAgentId})
  console.log(`installed ${happId}: `, happResult.statusText, happResult.status)

  client.close()
}

const commandNewAgent = (dir, cmd) => withIntrceptrClient(async client => {
  await client.call('holo/identify', {agentId})
  await client.call('holo/agents/new', {agentId, happId: simpleApp.happId})
})

const commandZomeCallPublic = (dir, cmd) => withIntrceptrClient(async client => {
  const result = await client.call('holo/call', {
    agentId: C.hostAgentId,
    happId: simpleApp.happId,
    dnaHash: simpleAppDnaHash,
    zome: 'simple',
    function: 'get_links',
    params: {base: 'TODO'},
    signature: 'TODO',
  })
  console.log("how about that! ", result)
})

const commandZomeCallHosted = (dir, cmd) => withIntrceptrClient(async client => {
  const result = await client.call('holo/call', {
    agentId,
    happId: simpleApp.happId,
    dnaHash: simpleAppDnaHash,
    zome: 'simple',
    function: 'get_links',
    params: {base: 'TODO'},
    signature: 'TODO',
  })
  console.log("how about that! ", result)
})

commander.version('0.0.1')
commander.command('install <happNick>').action(commandInstall)
commander.command('new-agent').action(commandNewAgent)
commander.command('zome-call-public').action(commandZomeCallPublic)
commander.command('zome-call-hosted').action(commandZomeCallHosted)

commander.parse(process.argv)
