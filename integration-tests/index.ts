import * as test from 'tape'
import * as fs from 'fs'
import {exec} from 'child_process'


import {initializeConductorConfig, spawnConductor} from '../src/conductor'
import * as HH from '../src/flows/holo-hosting'
import * as Config from '../src/config'
import startIntrceptr, {getMasterClient} from '../src/server'
import {callWhenConnected} from '../src/common'
import {shimHappById, shimHappByNick, HappEntry} from '../src/shims/happ-server'
import {withIntrceptrClient, adminHostCall} from './common'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fire up a conductor and create a WS client to it.
 * NB: there cannot be more than one conductor running at a time since they currently occupy
 * a fixed set of ports and a fixed config file path, etc.
 */
const withConductor = async (fn) => {
  // TODO: how to shut down last run properly in case of failure?
  exec('killall holochain')
  // TODO: generate in a temp file, don't clobber the main one!
  initializeConductorConfig()
  const conductor = spawnConductor()

  await delay(1000)

  // enter passphrase
  // TODO: also generate a new passphrase!
  console.info("auto-entering passphrase...")
  conductor.stdin.write('\n')
  conductor.stdin.end()

  const intrceptr = startIntrceptr(Config.PORTS.intrceptr)
  await intrceptr.connections.ready()
  await delay(1000)

  console.log("intrceptr ready! running test.")
  await withIntrceptrClient(fn)
  conductor.kill()
  intrceptr.close()
}

const doRegisterAgent = async () => {
  await HH.SHIMS.registerAsProvider(getMasterClient())
  await HH.registerAsHost(getMasterClient())
  await delay(1000)
}

const doRegisterApp = async (happEntry: HappEntry): Promise<string> => {

  const masterClient = getMasterClient()
  const happId = await HH.SHIMS.registerHapp(masterClient, {
    uiHash: happEntry.ui ? happEntry.ui.hash : null,
    dnaHashes: happEntry.dnas.map(dna => dna.hash)
  })
  console.log("registered hApp: ", happId)

  const hostResult = await HH.enableHapp(masterClient, happId)
  console.log(`enabled ${happId}: `, hostResult)

  masterClient.close()

  return happId
}

const doAppSetup = async (client, happNick: string) => {
  const happEntry = shimHappByNick(happNick)!
  const dnaHashes = happEntry.dnas.map(dna => dna.hash)
  const uiHash = happEntry.ui ? happEntry.ui.hash : null

  const happId = await doRegisterApp(happEntry)

  const happResult = await adminHostCall('holo/happs/install', {happId: happId, agentId: Config.hostAgentId})
  console.log(`installed ${happId}: `, happResult.statusText, happResult.status)

  return {happId, dnaHashes, uiHash}
}

const zomeCaller = (client, {happId, agentId, dnaHash, zome}) => (func, params) => {
  return callWhenConnected(client, 'holo/call', {
    happId, agentId, dnaHash,
    zome: zome,
    function: func,
    params: params,
    signature: 'TODO',
  })
}

test('can do public zome call', t => {
  const happNick = 'basic-chat'
  withConductor(async client => {
    await doRegisterAgent()
    const {happId, dnaHashes} = await doAppSetup(client, happNick)
    const dnaHash = dnaHashes[0]!
    const agentId = 'some-random-agent-id'
    const call = zomeCaller(client, {happId, agentId, dnaHash, zome: 'chat'})

    const address = await call('register', {
      name: 'chat noir',
      avatar_url: null,
    })
    const result = await call('get_all_public_streams', {})
    t.ok(address)
    t.deepEqual(result, [])
  }).then(t.end)
})


// test('can do hosted zome call', t => {
//   const happNick = 'basic-chat'
//   withConductor(async client => {
//     const {happId, dnaHashes} = await doAppSetup(client, happNick)
//     const dnaHash = dnaHashes[0]!
//     const agentId = 'some-random-agent-id'
//     const result = await callWhenConnected(client, 'holo/call', {
//       happId, agentId, dnaHash,
//       zome: 'chat',
//       function: 'get_all_public_streams',
//       params: {},
//       signature: 'TODO',
//     })
//     t.equal(result, 'syke!!')
//   }).then(t.end)
// })

