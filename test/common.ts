import * as tape from 'tape'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'

import {IntrceptrServer} from '../src/server'

export const mockResponse = {response: 'mock response'}

export const testMasterClient = () => sinon.stub(new RpcClient())

export const testInternalClient = () => sinon.stub(new RpcClient())

export const testPublicClient = () => {
  const client = sinon.stub(new RpcClient())
  client.call = sinon.stub().withArgs('call').returns(mockResponse)
  return client
}

export const testRpcServer = () => sinon.stub(new RpcServer({noServer: true}))

export const sinonTest = (description, test) => {
  tape(description, async t => {
    const s = Object.assign(sinon.assert, t)
    s.pass = t.pass
    s.fail = t.fail
    await test(s)
    s.pass = s.fail = () => { throw "sinon.assert has been tainted by `sinonTest`" }
    t.end()
  })
}