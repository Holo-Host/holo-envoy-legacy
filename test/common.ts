import * as _tape from 'tape'
import tapePromise from 'tape-promise'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'

import {IntrceptrServer} from '../src/server'

const tape = tapePromise(_tape)

export const mockResponse = {response: 'mock response'}

const baseClient = () => {
  const client = sinon.stub(new RpcClient())
  client.call = sinon.stub()
  return client
}

export const testMasterClient = () => {
  const client = baseClient()
  client.call.withArgs('admin/dna/list').returns([])
  client.call.withArgs('admin/ui/install').returns({success: true})
  client.call.withArgs('admin/dna/install_from_file').returns({success: true})
  return client
}

export const testInternalClient = () => baseClient()

export const testPublicClient = () => {
  const client = baseClient()
  client.call.withArgs('call').returns(mockResponse)
  return client
}

export const testRpcServer = () => sinon.stub(new RpcServer({noServer: true}))

export const testIntrceptr = () => {
  const masterClient = testMasterClient()
  const publicClient = testPublicClient()
  const internalClient = testInternalClient()
  const intrceptr = new IntrceptrServer({masterClient, publicClient, internalClient})
  intrceptr.server = testRpcServer()
  return {intrceptr, masterClient, publicClient, internalClient}
}

export const sinonTest = (description, testFn) => {
  tape(description, async t => {
    const s = Object.assign(sinon.assert, t)
    s.pass = t.pass
    s.fail = t.fail
    let promise
    try {
      promise = testFn(s)
    } catch (e) {
      console.error("test function threw exception:", e)
      throw e
    } finally {
      await promise
      t.end()  
      s.pass = s.fail = () => { throw "sinon.assert has been tainted by `sinonTest`" }
    }
  })
}