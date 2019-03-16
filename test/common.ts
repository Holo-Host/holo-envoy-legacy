import * as _tape from 'tape'
import tapePromise from 'tape-promise'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'

import * as Config from '../src/config'
import {IntrceptrServer} from '../src/server'
import {instanceIdFromAgentAndDna} from '../src/common'
import {HAPP_DATABASE} from '../src/shims/happ-server'

const tape = tapePromise(_tape)

export const mockResponse = {response: 'mock response'}

const baseClient = () => {
  const client = sinon.stub(new RpcClient())
  client.call = sinon.stub()
  client.ready = true
  return client
}

export const testMasterClient = () => {
  const client = baseClient()
  const success = {success: true}
    const getEnabledAppArgs = { 
    instance_id: Config.holoHostingAppId,
    zome: 'host',
    function: 'get_enabled_app',
    params: {} 
  }
  const testDnas = []
  // Stub HHA to say that all available apps are enabled
  const testApps = Object.keys(HAPP_DATABASE).map(happId => ({
    address: happId,
    entry: 'fake entry',
  }))

  client.call.withArgs('admin/agent/list').returns([{id: 'existing-agent-id'}])
  client.call.withArgs('admin/dna/list').returns(testDnas)
  client.call.withArgs('admin/dna/install_from_file').returns(success)
  client.call.withArgs('admin/ui/install').returns(success)
  client.call.withArgs('admin/instance/list').resolves([{
    id: instanceIdFromAgentAndDna('fake-agent', 'simple-app')
  }])
  client.call.withArgs('admin/instance/add').resolves(success)
  client.call.withArgs('admin/interface/add_instance').resolves(success)
  client.call.withArgs('admin/instance/start').resolves(success)
  client.call.withArgs('call', getEnabledAppArgs).resolves(testApps)
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
      promise.catch(t.fail).then(() => {
        s.pass = s.fail = () => { throw "sinon.assert has been tainted by `sinonTest`" }
        t.end()  
      })
    }
  })
}