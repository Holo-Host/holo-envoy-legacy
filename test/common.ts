import * as _tape from 'tape'
import tapePromise from 'tape-promise'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'

import * as Config from '../src/config'
import {IntrceptrServer} from '../src/server'
import {instanceIdFromAgentAndDna} from '../src/common'
import {HAPP_DATABASE} from '../src/shims/happ-server'

const tape = tapePromise(_tape)

export const mockResponse = {Ok: 'mock response'}

const success = {success: true}

const getEnabledAppArgs = { 
  instance_id: Config.holoHostingAppId,
  zome: 'host',
  function: 'get_enabled_app',
  params: {} 
}

const testDnas = []

// Stub HHA to say that all available apps are enabled
const testApps = HAPP_DATABASE.map(({happId}) => ({    
  address: happId,
  entry: 'fake entry',
}))

// Stub to pretend that all DNAs are installed and have public instances
export const testInstances = (() => {
  const dnaHashes: Array<string> = []
  HAPP_DATABASE.forEach(({dnas, ui}) => {
    dnas.forEach(dna => {
      dnaHashes.push(dna.hash)
    })
  })
  return dnaHashes.map(hash => ({
    agent: Config.hostAgentId,
    dna: hash
  }))
})()

export const baseClient = () => {
  const client = sinon.stub(new RpcClient())
  client.call = sinon.stub()
  client.ready = true
  return client
}

export const testMasterClient = () => {
  const client = baseClient()
 
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
  client.call.withArgs('call', getEnabledAppArgs).resolves({Ok: testApps})
  return client
}

export const testInternalClient = () => {
  const client = baseClient()
  client.call.withArgs('call').resolves(mockResponse)
  return client
}

export const testPublicClient = () => {
  const client = baseClient()
  client.call.withArgs('call').resolves(mockResponse)
  client.call.withArgs('info/instances').resolves(testInstances)
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

const _sinonTest = (tapeRunner, description, testFn) => {
  tapeRunner(description, async t => {
    // Here we smoosh tape's `t` object and sinon's `sinon.assert`
    // into a single mega-object, so that sinon and tape assertions
    // can both be used easily
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

export const sinonTest = (description, testFn) => _sinonTest(tape, description, testFn)
sinonTest.only = (description, testFn) => _sinonTest(tape.only, description, testFn)