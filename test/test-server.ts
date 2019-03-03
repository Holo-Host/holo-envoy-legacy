import * as test from 'tape'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'
import {EventEmitter} from 'events'

import {IntrceptrServer} from '../src/server'

const testClient = () => sinon.stub(new RpcClient())

const testRpcServer = () => sinon.stub(new RpcServer({noServer: true}))

const testServer = () => new IntrceptrServer({
  server: testRpcServer(), 
  adminClient: testClient(),
  happClient: testClient(),
})

const amity = {agentKey: 'amity'}
const beatrice = {agentKey: 'beatrice'}

const testSocket = (server) => new EventEmitter()

test('can manage several connections for the same agent', t => {
  const server = testServer()

  const ws1 = testSocket(server)
  const ws2 = testSocket(server)

  server.identifyAgent(amity, ws1)
  server.identifyAgent(amity, ws2)

  t.deepEqual(server.sockets, {amity: [ws1, ws2]})

  ws1.emit('close')
  ws2.emit('close')

  t.deepEqual(server.sockets, {amity: []})

  t.end()
})

test('can manage connections for several agents', t => {
  const server = testServer()

  const ws1 = testSocket(server)
  const ws2 = testSocket(server)
  const ws3 = testSocket(server)
  const ws4 = testSocket(server)
  const ws5 = testSocket(server)

  server.identifyAgent(amity, ws1)
  server.identifyAgent(amity, ws2)
  t.deepEqual(server.sockets.amity, [ws1, ws2])

  server.identifyAgent(beatrice, ws3)
  t.deepEqual(server.sockets.beatrice, [ws3])

  server.identifyAgent(amity, ws4)
  ws2.emit('close')
  t.deepEqual(server.sockets.amity, [ws1, ws4])

  server.identifyAgent(beatrice, ws5)
  t.deepEqual(server.sockets.beatrice, [ws3, ws5])

  ws1.emit('close')
  ws3.emit('close')
  ws4.emit('close')
  ws5.emit('close')

  t.deepEqual(server.sockets, {amity: [], beatrice: []})

  t.end()
})