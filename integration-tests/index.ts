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
import {shimHappById, shimHappByNick, HappEntry} from '../src/shims/happ-server'
import {withConductor, getTestClient, adminHostCall, delay, doRegisterApp, doRegisterHost, doAppSetup, zomeCaller} from './common'

import startWormholeServer from '../src/wormhole-server'
import startAdminHostServer from '../src/admin-host-server'
import startShimServers from '../src/shims/happ-server'



require('./test-hosted-zome-call')



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
