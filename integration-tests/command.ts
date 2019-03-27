import * as commander from 'commander'

import * as C from '../src/config'
import {fail, zomeCallByInstance} from '../src/common'
import {getMasterClient} from '../src/server'
import {shimHappById, shimHappByNick} from '../src/shims/happ-server'
import * as HH from '../src/flows/holo-hosting'

import {withIntrceptrClient, adminHostCall} from './common'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:", reason)
  throw ("Command threw exception, see reason above ^^")
})

const simpleApp = shimHappByNick('simple-app')!
const simpleAppDnaHash = simpleApp.dnas[0].hash
const agentId = 'dummy-fake-not-real-agent-id'


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
