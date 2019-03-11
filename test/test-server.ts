import * as test from 'tape'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'
import {EventEmitter} from 'events'

import {IntrceptrServer} from '../src/server'

import {testClient, testServer} from './common'

const amity = {agentId: 'amity'}
const beatrice = {agentId: 'beatrice'}

const testSocket = (server) => new EventEmitter()

test('can manage connections for several agents', t => {
  const server = testServer()

  t.end()
})