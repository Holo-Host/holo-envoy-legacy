import * as test from 'tape'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'
import {EventEmitter} from 'events'

import {IntrceptrServer} from '../src/server'


const TestClient = sinon.stub(RpcClient)
const testClient = () => new TestClient()

const testRpcServer = () => sinon.stub({
  register: () => {},
  close: () => {},
})

const testServer = () => new IntrceptrServer(testRpcServer(), testClient())

const testSocket = (server) => new EventEmitter()

test('can manage several connections for the same agent', t => {
  const server = testServer()

  const ws1 = testSocket(server)
  const ws2 = testSocket(server)

  server.addAgent('agent', ws1)
  server.addAgent('agent', ws2)

  t.deepEqual(server.sockets, {'agent': [ws1, ws2]})

  ws1.emit('close')
  ws2.emit('close')

  t.deepEqual(server.sockets, {'agent': []})

  t.end()
})

test('can manage connections for several agents', t => {
  const server = testServer()

  const ws1 = testSocket(server)
  const ws2 = testSocket(server)
  const ws3 = testSocket(server)
  const ws4 = testSocket(server)
  const ws5 = testSocket(server)

  server.addAgent('amity', ws1)
  server.addAgent('amity', ws2)
  t.deepEqual(server.sockets.amity, [ws1, ws2])

  server.addAgent('beatrice', ws3)
  t.deepEqual(server.sockets.beatrice, [ws3])

  server.addAgent('amity', ws4)
  ws2.emit('close')
  t.deepEqual(server.sockets.amity, [ws1, ws4])

  server.addAgent('beatrice', ws5)
  t.deepEqual(server.sockets.beatrice, [ws3, ws5])

  ws1.emit('close')
  ws3.emit('close')
  ws4.emit('close')
  ws5.emit('close')

  t.deepEqual(server.sockets, {amity: [], beatrice: []})

  t.end()
})