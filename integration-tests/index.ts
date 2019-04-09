import * as test from 'tape'
import * as sinon from 'sinon'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {exec} from 'child_process'
import {Client, Server} from 'rpc-websockets'
import * as rimraf from 'rimraf'


import * as HH from '../src/flows/holo-hosting'
import * as Config from '../src/config'
import * as S from '../src/server'
import {callWhenConnected} from '../src/common'
import {sinonTest} from '../test/common'
import {shimHappById, shimHappByNick, HappEntry} from '../src/shims/happ-server'
import {withConductor, getTestClient, adminHostCall, delay, doRegisterHost, doRegisterApp, doInstallAndEnableApp} from './common'

import startWormholeServer from '../src/wormhole-server'
import startAdminHostServer from '../src/admin-host-server'
import startShimServers from '../src/shims/happ-server'


const doAppSetup = async (happNick: string) => {
  const happEntry = shimHappByNick(happNick)!
  const dnaHashes = happEntry.dnas.map(dna => dna.hash)
  const uiHash = happEntry.ui ? happEntry.ui.hash : null
  const client = S.getMasterClient(false)

  const happId = await doRegisterApp(happEntry)

  const happResult = await doInstallAndEnableApp(client, happId)
  client.close()

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


/**
 * Encodes the process of upgrading from anonymous to holo-hosted client ("holofication").
 * In this function, an anonymous client is created on the fly, but this is not necessary in the real world,
 * i.e. it is fine to use an existing client to call holo/identify.
 * It's just that by starting with a fresh new client, we ensure that we can't holofy a client twice.
 *
 * The real process is:
 * 1. start with connected ws client
 * 2. generate new permanent keypair
 * 3. call `holo/identify`, using new permanent agentId
 * 4. client.subscribe('agent/<agentId>/sign')
 * 5. listen for signing requests via client.on('agent/<agentId>/sign')
 */
const holofiedClient = async (agentId): Promise<any> => {
  const eventName = `agent/${agentId}/sign`
  const client = await getTestClient()
  await client.call('holo/identify', {agentId})
  await client.subscribe(eventName)
  client.on(eventName, (params) => {
    console.debug('*** on agent/_/sign:', params)
    const {entry, id} = params
    client.call('holo/wormholeSignature', {
      signature: 'TODO-real-signature',
      requestId: id,
    })
  })
  console.debug('*** Subscribed to', eventName)
  return client
}


test('can do public zome call', t => {
  const happNick = 'basic-chat'
  const agentId = 'some-random-agent-id'
  withConductor(async () => {
    // setup host
    await doRegisterHost()
    const {happId, dnaHashes} = await doAppSetup(happNick)
    const dnaHash = dnaHashes[0]!

    const client = await getTestClient()
    const call = zomeCaller(client, {happId, agentId, dnaHash, zome: 'chat'})

    const address = await call('register', {
      name: 'chat noir',
      avatar_url: null,
    })
    const result = await call('get_all_public_streams', {})
    t.ok(address)
    t.deepEqual(result, [])
    t.end()
  })
})

// TODO remove only
sinonTest('can do hosted zome call', async T => {
  const happNick = 'basic-chat'
  const agentId = 'hosted-agent'
  await withConductor(async (intrceptr) => {
    // setup host
    await doRegisterHost()
    const {happId, dnaHashes} = await doAppSetup(happNick)
    const dnaHash = dnaHashes[0]!

    // setup some spies
    const spyIntrceptrEmit = sinon.spy(intrceptr.server, 'emit')
    const spySigningStart = sinon.spy(intrceptr, 'startHoloSigningRequest')
    const spySigningEnd = sinon.spy(intrceptr, 'wormholeSignature')

    // start anonymous browser session
    // const anonymousSocket = await getTestClient()
    // (do nothing with it)

    // start hosted session
    const holoClient = await holofiedClient(agentId)

    // TODO: expects error, make real signature
    // thread 'jsonrpc-eventloop-0' panicked at 'called `Result::unwrap()` on an `Err` value: ErrorGeneric("Signature syntactically invalid")', src/libcore/result.rs:997:5
    // make PR to hClient.js so real signing can be easily imported?
    const newAgentResponse = await holoClient.call('holo/agents/new', {agentId, happId})
    T.deepEqual(newAgentResponse, {success: true})

    const call = zomeCaller(holoClient, {happId, agentId, dnaHash, zome: 'chat'})

    const address = await call('register', {
      name: 'chat noir',
      avatar_url: null,
    })
    const result = await call('get_all_public_streams', {})

    T.ok(address)
    T.deepEqual(result, [])

    T.callOrder(spySigningStart, spySigningEnd)
    T.calledWith(spySigningStart, 0)
    T.calledWith(spySigningEnd, 0)
  })
})

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

test('rpc event sanity check', t => {
  const port = 1919
  const server = new Server({port, host: 'localhost'})
  const eventName = 'eee'
  server.event(eventName)

  const client = new Client('ws://localhost:' + port, {reconnect: false})

  t.equal(server.wss.clients.size, 0)
  client.once('open', async () => {
    t.equal(server.wss.clients.size, 1)
    await client.subscribe(eventName)
    client.on(eventName, x => {
      t.equal(x, 'hi')
      t.end()
      client.close()
      server.close()
    })
    server.emit(eventName, 'hi')
  })
})
