import * as test from 'tape'
import * as sinon from 'sinon'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {exec} from 'child_process'
import {Client, Server} from 'rpc-websockets'
import * as rimraf from 'rimraf'

import * as Config from '../src/config'
import * as S from '../src/server'
import {HappEntry} from '../src/types'
import {shimHappByNick} from '../src/shims/happ-server'
import {withConductor, getTestClient, adminHostCall, delay, doRegisterHost, doRegisterApp, doAppSetup, zomeCaller} from './common'

import startWormholeServer from '../src/wormhole-server'
import startAdminHostServer from '../src/admin-host-server'
import startShimServers from '../src/shims/happ-server'

const requiredHcVersion = Config.DEPENDENCIES.holochainVersion
exec(`holochain --version`, (err, stdout, stderr) => {
  const [_, installedVersion] = stdout.trim().split('holochain ')
  if (err) {
    console.error("Could not check Holochain error, is the `holochain` binary installed?")
    process.exit(-1)
  } else if (!installedVersion) {
    console.error("Could not figure out holochain version from command line! `holochain --version` produced:")
    console.error(stdout)
  } else if (installedVersion !== requiredHcVersion) {
    console.error(`Installed HC version '${installedVersion}' does not match required version '${requiredHcVersion}' as specified in dependencies config. Aborting.`)
    process.exit(-1)
  }
})

require('./test-hosted-zome-call')


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
  withConductor(t, async () => {
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


test('all components shut themselves down properly', async t => {

  // Give envoy time to shut down (TODO, remove)
  await delay(1000)

  const envoy = new S.EnvoyServer({
    masterClient: null,
    publicClient: null,
    internalClient: null,
  })

  const client = S.getMasterClient(false)
  const httpServer = await envoy.buildHttpServer(null)
  const wss = await envoy.buildWebsocketServer(httpServer)
  const shimServer = startShimServers(Config.PORTS.shim)
  const adminServer = startAdminHostServer(Config.PORTS.admin, 'testdir', null)
  const wormholeServer = startWormholeServer(Config.PORTS.wormhole, envoy)

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

  // Give envoy time to shut down (TODO, remove)
  await delay(1000)

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
