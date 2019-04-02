import * as test from 'tape'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {exec} from 'child_process'
import * as rimraf from 'rimraf'


import * as HH from '../src/flows/holo-hosting'
import * as Config from '../src/config'
import * as S from '../src/server'
import {callWhenConnected} from '../src/common'
import {shimHappById, shimHappByNick, HappEntry} from '../src/shims/happ-server'
import {conductorTest, adminHostCall, delay} from './common'

import startWormholeServer from '../src/wormhole-server'
import startAdminHostServer from '../src/admin-host-server'
import startShimServers from '../src/shims/happ-server'


const doRegisterAgent = async () => {
  await HH.SHIMS.registerAsProvider(S.getMasterClient(false))
  await HH.registerAsHost(S.getMasterClient(false))
  await delay(1000)
}

const doRegisterApp = async (happEntry: HappEntry): Promise<string> => {
  const masterClient = S.getMasterClient(false)
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

test('all components shut themselves down properly', async t => {
  const intrceptr = new S.IntrceptrServer({
    masterClient: null,
    publicClient: null,
    internalClient: null,
  })

  const client = S.getMasterClient(false)
  const httpServer = await intrceptr.buildHttpServer(null)
  const wss = await intrceptr.buildWebsocketServer(httpServer)
  const shimServer = startShimServers(Config.PORTS.shim)
  const adminServer = startAdminHostServer(Config.PORTS.admin, 'testdir', null)
  const wormholeServer = startWormholeServer(Config.PORTS.wormhole, intrceptr)

  httpServer.close()
  wss.close()
  shimServer.stop()
  adminServer.close()
  wormholeServer.close()
  client.close()

  setTimeout(() => {
    if(!t.ended) {
      t.fail("At least one component took too long to shut down!")
    }
  }, 5000)

  t.end()
})

test('can do public zome call', t => {
  const happNick = 'basic-chat'
  conductorTest(t, async client => {
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
  })
})

test.only('can do hosted zome call', t => {
  const happNick = 'basic-chat'
  conductorTest(t, async client => {
    await doRegisterAgent()
    const {happId, dnaHashes} = await doAppSetup(client, happNick)
    const dnaHash = dnaHashes[0]!
    const agentId = 'hosted-agent'
    const newAgentResponse = await client.call('holo/agents/new', {agentId, happId})
    t.ok(newAgentResponse.Ok)

    const identifyResponse = await client.call('holo/identify', {agentId})
    t.ok(identifyResponse.Ok)

    const call = zomeCaller(client, {happId, agentId, dnaHash, zome: 'chat'})

    const address = await call('register', {
      name: 'chat noir',
      avatar_url: null,
    })
    const result = await call('get_all_public_streams', {})
    t.ok(address)
    t.deepEqual(result, [])
  })
})

