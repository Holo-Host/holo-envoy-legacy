import axios from 'axios'
import * as commander from 'commander'
import {Client} from 'rpc-websockets'

import * as C from '../config'
import {fail, zomeCallByInstance} from '../common'
import {getMasterClient} from '../server'
import {shimHappById, shimHappByNick} from '../shims/happ-server'

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

const install = async (happNick) => {

  const client = getMasterClient()

  const happEntry = shimHappByNick(happNick)!

  const registerResult = await zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId,
    zomeName: 'provider',
    funcName: 'register_app',
    params: {
      ui_hash: happEntry.ui ? happEntry.ui.hash : "",
      dna_list: happEntry.dnas.map(dna => dna.hash)
    }
  })

  const happId = registerResult

  console.log("Registered hApp: ", registerResult, happId)

  const happResult = await adminCall('holo/happs/install', {happId: happId, agentId: C.hostAgentId})
  console.log(`install ${happId}: `, happResult.statusText, happResult.status)

  const hostResult = await zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId,
    zomeName: 'host',
    funcName: 'enable_app',
    params: {
      app_hash: happId
    }
  })
  console.log(`enable ${happId}: `, hostResult)
  client.close()
}

const newAgent = (dir, cmd) => withIntrceptrClient(async client => {
  await client.call('holo/identify', {agentId})
  await client.call('holo/agents/new', {agentId, happId: simpleApp.happId})
})

const zomeCallPublic = (dir, cmd) => withIntrceptrClient(async client => {
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

const zomeCallHosted = (dir, cmd) => withIntrceptrClient(async client => {
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
commander.command('install <happNick>').action(install)
commander.command('new-agent').action(newAgent)
commander.command('zome-call-public').action(zomeCallPublic)
commander.command('zome-call-hosted').action(zomeCallHosted)

commander.parse(process.argv)
