import * as _tape from 'tape'
import tapePromise from 'tape-promise'
import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'

import * as Config from '../src/config'
import {EnvoyServer, makeClient} from '../src/server'
import {instanceIdFromAgentAndDna} from '../src/common'
import {HappStoreEntry} from '../src/types'
import {TEST_HAPPS} from './test-happs'

const tape = tapePromise(_tape)

export const mockResponse = {Ok: 'mock response'}

const success = {success: true}

export const getEnabledAppArgs = {
  instance_id: Config.holoHostingAppId.instance,
  zome: 'host',
  function: 'get_enabled_app_list',
  params: {}
}

export const getAppDetailsArgs = happId => ({
  instance_id: Config.holoHostingAppId.instance,
  zome: 'provider',
  function: 'get_app_details',
  params: {app_hash: happId}
})

export const lookupAppInStoreByHashArgs = appHash => ({
  instance_id: Config.happStoreId.instance,
  zome: 'happs',
  function: 'get_app',
  params: {app_hash: appHash}
})

const testDnas = []

// Stub HHA to say that all available apps are enabled
const testApps = Object.values(TEST_HAPPS).map(({happId}) => ({
  address: happId,
  entry: 'fake entry',
}))

// Stub to pretend that all DNAs are installed and have public instances
export const testInstances = (() => {
  const dnaHashes: Array<string> = []
  Object.values(TEST_HAPPS).forEach(({dnas, ui}) => {
    dnas.forEach(dna => {
      dnaHashes.push(dna.hash)
    })
  })
  return dnaHashes.map(hash => ({
    agent: Config.hostAgentName,
    dna: hash
  }))
})()

export const baseClient = () => {
  const client = makeClient(null, {})
  sinon.spy(client, 'call')
  client._call = sinon.stub()
  client.ready = true
  return client
}

/**
 * Creates a heavily stubbed master client, with full responses for apps
 * that should be considered registered.
 */
export const testMasterClient = () => {
  const client = baseClient()

  client._call.withArgs('admin/agent/list').returns([{id: 'existing-agent-id'}])
  client._call.withArgs('admin/dna/list').returns(testDnas)
  client._call.withArgs('admin/dna/install_from_file').returns(success)
  client._call.withArgs('admin/ui/install').returns(success)
  client._call.withArgs('admin/instance/list').resolves([{
    id: instanceIdFromAgentAndDna({agentId: 'fake-agent', dnaHash: 'basic-chat'})
  }])
  client._call.withArgs('admin/instance/add').resolves(success)
  client._call.withArgs('admin/interface/add_instance').resolves(success)
  client._call.withArgs('admin/instance/start').resolves(success)
  client._call.withArgs('call', getEnabledAppArgs).resolves({Ok: testApps})

  client._call.withArgs('call', getAppDetailsArgs('invalid')).resolves({
    Err: "this is not the real error, but it is an error"
  })
  client._call.withArgs('call', lookupAppInStoreByHashArgs('invalid')).resolves({
    Err: "this is not the real error, but it is an error"
  })

  // Stub out functions that normally go the hApp Store, using the shim database
  Object.values(TEST_HAPPS).forEach(entry => {
    client._call.withArgs('call', getAppDetailsArgs(entry.happId)).resolves({
      Ok: {app_bundle: {happ_hash: entry.happId}}
    })
    client._call.withArgs('call', lookupAppInStoreByHashArgs(entry.happId)).resolves({
      Ok: {appEntry: entry}
    })
  })
  return client
}

const testAppEntry: HappStoreEntry = ({
  dnas: [{location: 'wherever', hash: 'whatever', handle: 'whomever'}],
  ui: undefined
})

export const testInternalClient = () => {
  const client = baseClient()
  client._call.withArgs('call').resolves(mockResponse)
  return client
}

export const testPublicClient = () => {
  const client = baseClient()
  client._call.withArgs('call').resolves(mockResponse)
  client._call.withArgs('info/instances').resolves(testInstances)
  return client
}

export const testRpcServer = () => sinon.stub(new RpcServer({noServer: true}))

export const testEnvoyServer = () => {
  const masterClient = testMasterClient()
  const publicClient = testPublicClient()
  const internalClient = testInternalClient()
  const envoy = new EnvoyServer({masterClient, publicClient, internalClient})
  envoy.server = testRpcServer()
  return {envoy, masterClient, publicClient, internalClient}
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
      await testFn(s)
    } catch (e) {
      console.error("test function threw exception:", e)
      t.fail(e)
    } finally {
      s.pass = () => { throw "sinon.assert has been tainted by `sinonTest` (s.pass)" }
      s.fail = () => { throw "sinon.assert has been tainted by `sinonTest` (s.fail)" }
      t.end()
    }
  })
}

export const sinonTest = (description, testFn) => _sinonTest(tape, description, testFn)
sinonTest.only = (description, testFn) => _sinonTest(tape.only, description, testFn)