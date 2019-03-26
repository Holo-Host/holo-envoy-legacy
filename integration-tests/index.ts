
import {initializeConductorConfig, spawnConductor} from '../src/conductor'
import * as HH from '../src/flows/holo-hosting'
import {zomeCallByInstance} from '../src/common'
import {shimHappById, shimHappByNick} from '../src/shims/happ-server'
import {withIntrceptrClient, adminHostCall} from './command'

/**
 * Fire up a conductor and create a WS client to it.
 * NB: there cannot be more than one conductor running at a time since they currently occupy 
 * a fixed set of ports and a fixed config file path, etc.
 */
const withConductor = (fn) => {
  initializeConductorConfig()
  spawnConductor()
  withIntrceptrClient(fn)
  console.log("DONE! TODO shutdown")
}

const installFlow = async (client, happNick) => {

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

  return happId
}

const testPublicCall = () => {
  const happNick = 'basic-chat'
  const happEntry = shimHappByNick(happNick)!
  const dnaHash = happEntry.dnas[0]!.hash
  withConductor(async client => {
    const happId = await installFlow(client, happNick)
    
  })
}
