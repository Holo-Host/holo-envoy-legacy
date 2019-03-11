import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'

import {IntrceptrServer} from '../src/server'

export const testClient = () => sinon.stub(new RpcClient())

const testRpcServer = () => sinon.stub(new RpcServer({noServer: true}))

export const testServer = () => new IntrceptrServer({
  server: testRpcServer(), 
  adminClient: testClient(),
  happClient: testClient(),
})
