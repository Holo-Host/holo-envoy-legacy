import * as axios from 'axios'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as sinon from 'sinon'
import {EventEmitter} from 'events'

import {mockResponse, sinonTest, testEnvoyServer, getEnabledAppArgs, getAppDetailsArgs, lookupAppInStoreByHashArgs} from '../common'
import {bundleUI, unbundleUI, instanceIdFromAgentAndDna, serviceLoggerDnaIdFromHappId, serviceLoggerInstanceIdFromHappId} from '../../src/common'
import * as Common from '../../src/common'
import * as Config from '../../src/config'
import {TEST_HAPPS} from '../test-happs'

import installHapp, * as M from '../../src/flows/install-happ'

const emitterWithPipe = () => {
  return Object.assign(new EventEmitter(), {
    pipe: sinon.stub()
  })
}

sinon.stub(fs, 'mkdtempSync').returns('tempdir')
sinon.stub(fs, 'createReadStream').returns(emitterWithPipe())
sinon.stub(fs, 'createWriteStream').returns(new EventEmitter())
sinon.stub(fs, 'renameSync')
sinon.stub(fs, 'copy')
sinon.stub(Common, 'bundleUI')
sinon.stub(Common, 'unbundleUI')

const {basicChat} = TEST_HAPPS

const axiosResponse = (status) => {
  return {
    status,
    statusText: 'mocked statusText',
    data: {
      pipe: writer => writer.emit('finish')
    }
  }
}

sinonTest('can install dnas', async T => {
  const {masterClient} = testEnvoyServer()

  await M.installDna(masterClient, {
    hash: 'hash',
    path: 'path',
    properties: null,
  })

  T.callCount(masterClient.call, 2)
  T.calledWith(masterClient.call, 'admin/dna/list', {})
  T.calledWith(masterClient.call, 'admin/dna/install_from_file', {
    id: 'hash',
    path: 'path',
    expected_hash: 'hash',
    copy: true,
    properties: null
  })
})

sinonTest('throws error for non-hosted happId', async T => {
  const {masterClient} = testEnvoyServer()
  await T.rejects(
    M.installDnasAndUi(masterClient, 'test-dir', {happId: 'invalid'}),
    /hApp is not registered.*/
  )
  T.callCount(masterClient.call, 1)
  // TODO: explicitly test the call
})

sinonTest('throws error for unreachable resources', async T => {
  const {masterClient} = testEnvoyServer()
  const sandbox = sinon.createSandbox()
  // sandbox.stub(M, 'lookupAppEntryInHHA').resolves(basicChat)
  sandbox.stub(axios, 'request').resolves(axiosResponse(404))
  const happId = basicChat.happId

  await T.rejects(
    M.installDnasAndUi(masterClient, 'test-dir', {happId}),
    /Could not fetch.*404/
  )
  T.callCount(masterClient.call, 2)
  // TODO: explicitly test the calls

  sandbox.restore()
})

sinonTest('can install dnas and ui for hApp', async T => {
  const {masterClient} = testEnvoyServer()

  const sandbox = sinon.createSandbox()
  // sandbox.stub(M, 'lookupAppEntryInHHA').resolves(basicChat)
  sandbox.stub(axios, 'request').resolves(axiosResponse(200))
  const happId = basicChat.happId
  const dnaHash = basicChat.dnas[0].hash
  const uiHash = basicChat.ui!.hash
  const result = M.installDnasAndUi(masterClient, 'test-dir', {happId})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 4)

  T.calledWith(masterClient.call.getCall(0), 'call', getAppDetailsArgs(happId))
  T.calledWith(masterClient.call.getCall(1), 'call', lookupAppInStoreByHashArgs(happId))
  T.calledWith(masterClient.call.getCall(2), 'admin/dna/list')
  T.calledWith(masterClient.call.getCall(3), 'admin/dna/install_from_file', {
    copy: true,
    expected_hash: dnaHash,
    id: dnaHash,
    path: `tempdir/${dnaHash}.dna.json`,
    properties: undefined
  })

  // const uiDir = `${happId}`
  const uiDir = `tempdir/FAKEHASH`
  T.calledWith(Common.unbundleUI, `${uiDir}.zip`, uiDir)
  T.calledWith(
    fs.copy,
    `${uiDir}`,
    path.join(Config.uiStorageDir('test-dir'), happId)
  )

  sandbox.restore()
})

sinonTest('can setup instances', async T => {
  const {masterClient} = testEnvoyServer()

  const happId = basicChat.happId
  const dnaHash = basicChat.dnas[0].hash
  const agentId = 'fake-agent-id'
  const instanceId = instanceIdFromAgentAndDna({agentId, dnaHash})
  const result = M.setupInstances(masterClient, {happId, agentId, conductorInterface: Config.ConductorInterface.Public})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 6)

  T.calledWith(masterClient.call.getCall(0), 'call', getAppDetailsArgs(happId))
  T.calledWith(masterClient.call.getCall(1), 'call', lookupAppInStoreByHashArgs(happId))
  T.calledWith(masterClient.call.getCall(2), 'admin/instance/list')
  T.calledWith(masterClient.call.getCall(3), 'admin/instance/add', {
    agent_id: agentId,
    dna_id: dnaHash,
    id: instanceId,
  })
  T.calledWith(masterClient.call.getCall(4), 'admin/interface/add_instance', {
    instance_id: instanceId,
    interface_id: Config.ConductorInterface.Public,
  })
  T.calledWith(masterClient.call.getCall(5), 'admin/instance/start', {
    id: instanceId,
  })
})

sinonTest('can setup servicelogger', async T => {
  const {masterClient} = testEnvoyServer()

  const serviceLogger = Config.DEPENDENCIES.resources.serviceLogger.dna
  const happId = basicChat.happId
  const dnaHash = basicChat.dnas[0].hash
  const agentId = 'fake-agent-id'
  const instanceId = instanceIdFromAgentAndDna({agentId, dnaHash})
  const serviceLoggerDnaId = serviceLoggerDnaIdFromHappId(happId)
  const serviceLoggerId = serviceLoggerInstanceIdFromHappId(happId)
  const result = M.setupServiceLogger(masterClient, {hostedHappId: happId})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 7)

  T.calledWith(masterClient.call, 'admin/dna/list', {})
  T.calledWith(masterClient.call, 'admin/dna/install_from_file', {
    copy: true,
    id: serviceLoggerDnaId,
    path: serviceLogger.path,
    properties: { forApp: basicChat.happId }
  })
  T.calledWith(masterClient.call, 'admin/instance/list')
  T.calledWith(masterClient.call, 'admin/instance/add', {
    agent_id: Config.hostAgentName,
    dna_id: serviceLoggerDnaId,
    id: serviceLoggerId,
  })
  T.calledWith(masterClient.call, 'admin/interface/add_instance', {
    instance_id: serviceLoggerId,
    interface_id: Config.ConductorInterface.Internal,
  })
  T.calledWith(masterClient.call, 'admin/instance/start', {
    id: serviceLoggerId,
  })
  T.calledWith(masterClient.call, 'admin/bridge/add', {
    handle: 'holofuel-bridge',
    caller_id: serviceLoggerId,
    callee_id: Config.holofuelId.instance,
  })
})

sinonTest('can perform entire installation flow', async T => {
  const {masterClient} = testEnvoyServer()
  const serviceLogger = Config.DEPENDENCIES.resources.serviceLogger.dna
  const happId = basicChat.happId
  const dnaHash = basicChat.dnas[0].hash
  const agentId = 'fake-agent-id'
  const instanceId = instanceIdFromAgentAndDna({agentId, dnaHash})
  const serviceLoggerId = serviceLoggerInstanceIdFromHappId(happId)

  const spyInstallDnasAndUi = sinon.spy(M, 'installDnasAndUi')
  const spySetupInstances = sinon.spy(M, 'setupInstances')
  const spySetupServiceLogger = sinon.spy(M, 'setupServiceLogger')
  const axiosStub = sinon.stub(axios, 'request').resolves(axiosResponse(200))

  const promise = installHapp(masterClient, 'test-dir')({happId})
  await T.doesNotReject(promise)
  axiosStub.restore()

  T.callCount(spyInstallDnasAndUi, 1)
  T.callCount(spySetupInstances, 1)
  T.callCount(spySetupServiceLogger, 1)

  T.calledWith(masterClient.call, 'admin/instance/add', {
    id: dnaHash,
    agent_id: Config.hostAgentName,
    dna_id: dnaHash,
  })

})
