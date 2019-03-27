import * as test from 'tape'
import * as fs from 'fs'
import {exec} from 'child_process'

import {initializeConductorConfig, spawnConductor} from '../src/conductor'
import * as HH from '../src/flows/holo-hosting'
import * as Config from '../src/config'
import {zomeCallByInstance, zomeCallByDna} from '../src/common'
import startIntrceptr from '../src/server'
import {shimHappById, shimHappByNick, HappEntry} from '../src/shims/happ-server'
import {withIntrceptrClient, adminHostCall} from './command'

/**
 * Fire up a conductor and create a WS client to it.
 * NB: there cannot be more than one conductor running at a time since they currently occupy 
 * a fixed set of ports and a fixed config file path, etc.
 */
const withConductor = (fn) => {
  // TODO: how to shut down last run properly in case of failure?
  exec('killall holochain')
  // TODO: generate in a temp file, don't clobber the main one!
  initializeConductorConfig()
  const conductor = spawnConductor()
  setTimeout(() => {
    // enter passphrase
    // TODO: also generate a new passphrase!
    console.info("entering passphrase.")
    conductor.stdin.write('\n');
    conductor.stdin.end();

    const intrceptr = startIntrceptr(Config.PORTS.intrceptr)
    intrceptr.connections.ready().then(async () => {
      console.log("intrceptr ready! running test.")
      await withIntrceptrClient(fn)
      console.log("DONE! TODO shutdown")
    })
  }, 1000)
}

const doRegister = async (client, happEntry: HappEntry): Promise<string> => {

  const happId = await HH.registerHapp(client, {
    uiHash: happEntry.ui ? happEntry.ui.hash : null,
    dnaHashes: happEntry.dnas.map(dna => dna.hash)
  })
  console.log("registered hApp: ", happId)

  const hostResult = await HH.enableHapp(client, happId)
  console.log(`enabled ${happId}: `, hostResult)

  return happId
}

const doAppSetup = async (client, happNick: string) => {

  const happEntry = shimHappByNick(happNick)!
  const dnaHashes = happEntry.dnas.map(dna => dna.hash)
  const uiHash = happEntry.ui ? happEntry.ui.hash : null

  const happId = await doRegister(client, happEntry)

  const happResult = await adminHostCall('holo/happs/install', {happId: happId, agentId: Config.hostAgentId})
  console.log(`installed ${happId}: `, happResult.statusText, happResult.status)

  return {happId, dnaHashes, uiHash}
}


test('can do public zome call', t => {
  const happNick = 'basic-chat'
  withConductor(async client => {
    const {happId, dnaHashes} = await doAppSetup(client, happNick)
    const dnaHash = dnaHashes[0]!
    const agentId = 'some-random-agent-id'
    const result = await zomeCallByDna(client, {
      agentId, dnaHash, zomeName: 'chat', funcName: 'get_all_public_streams', params: {}
    })
    t.end()
  })
})

