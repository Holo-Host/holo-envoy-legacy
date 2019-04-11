import * as axios from 'axios'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as sinon from 'sinon'
import {EventEmitter} from 'events'

import {mockResponse, sinonTest, testIntrceptr, getEnabledAppArgs, isAppRegisteredArgs} from './common'
import {bundleUI, unbundleUI, instanceIdFromAgentAndDna, serviceLoggerInstanceIdFromHappId} from '../src/common'
import * as Common from '../src/common'
import * as Config from '../src/config'
import {shimHappByNick} from '../src/shims/happ-server'

import installHapp, * as M from '../src/flows/install-happ'

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

const simpleApp = shimHappByNick('simple-app')!

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
  const {masterClient} = testIntrceptr()

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
  const {masterClient} = testIntrceptr()
  await T.rejects(
    M.installDnasAndUi(masterClient, 'test-dir', {happId: 'invalid'}),
    /hApp is not registered.*/
  )
  T.callCount(masterClient.call, 1)
})

sinonTest('throws error for unreachable resources', async T => {
  const {masterClient} = testIntrceptr()

  const axiosStub = sinon.stub(axios, 'request').resolves(axiosResponse(404))
  const happId = simpleApp.happId

  await T.rejects(
    M.installDnasAndUi(masterClient, 'test-dir', {happId}),
    /Could not fetch.*404/
  )
  T.callCount(masterClient.call, 1)

  axiosStub.restore()
})

sinonTest('can install dnas and ui for hApp', async T => {
  const {masterClient} = testIntrceptr()

  const axiosStub = sinon.stub(axios, 'request').resolves(axiosResponse(200))
  const happId = simpleApp.happId
  const dnaHash = simpleApp.dnas[0].hash
  const uiHash = simpleApp.ui!.hash
  const result = M.installDnasAndUi(masterClient, 'test-dir', {happId})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 3)

  T.calledWith(masterClient.call.getCall(0), 'call', isAppRegisteredArgs(happId))
  T.calledWith(masterClient.call.getCall(1), 'admin/dna/list')
  T.calledWith(masterClient.call.getCall(2), 'admin/dna/install_from_file', {
    copy: true,
    expected_hash: dnaHash,
    id: dnaHash,
    path: `tempdir/${dnaHash}.dna.json`,
    properties: undefined
  })

  // const uiDir = `${happId}`
  const uiDir = `tempdir/QmSimpleAppFakeHash`
  T.calledWith(Common.unbundleUI, `${uiDir}.zip`, uiDir)
  T.calledWith(
    fs.copy,
    `${uiDir}`,
    path.join(Config.uiStorageDir('test-dir'), happId)
  )

  axiosStub.restore()
})

sinonTest('can setup instances', async T => {
  const {masterClient} = testIntrceptr()

  const happId = simpleApp.happId
  const dnaHash = simpleApp.dnas[0].hash
  const agentId = 'fake-agent-id'
  const instanceId = instanceIdFromAgentAndDna(agentId, dnaHash)
  const result = M.setupInstances(masterClient, {happId, agentId, conductorInterface: Config.ConductorInterface.Public})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 5)

  T.calledWith(masterClient.call.getCall(0), 'call', isAppRegisteredArgs(happId))
  T.calledWith(masterClient.call.getCall(1), 'admin/instance/list')
  T.calledWith(masterClient.call.getCall(2), 'admin/instance/add', {
    agent_id: agentId,
    dna_id: dnaHash,
    id: instanceId,
  })
  T.calledWith(masterClient.call.getCall(3), 'admin/interface/add_instance', {
    instance_id: instanceId,
    interface_id: Config.ConductorInterface.Public,
  })
  T.calledWith(masterClient.call.getCall(4), 'admin/instance/start', {
    id: instanceId,
  })
})

sinonTest('can setup servicelogger', async T => {
  const {masterClient} = testIntrceptr()

  const serviceLogger = Config.DNAS.serviceLogger
  const happId = simpleApp.happId
  const dnaHash = simpleApp.dnas[0].hash
  const agentId = 'fake-agent-id'
  const instanceId = instanceIdFromAgentAndDna(agentId, dnaHash)
  const serviceLoggerId = serviceLoggerInstanceIdFromHappId(happId)
  const result = M.setupServiceLogger(masterClient, {hostedHappId: happId})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 7)

  T.calledWith(masterClient.call, 'admin/dna/list', {})
  T.calledWith(masterClient.call, 'admin/dna/install_from_file', {
    copy: true,
    expected_hash: serviceLogger.hash,
    id: serviceLogger.hash,
    path: serviceLogger.path,
    properties: { forApp: simpleApp.happId }
  })
  T.calledWith(masterClient.call, 'admin/instance/list')
  T.calledWith(masterClient.call, 'admin/instance/add', {
    agent_id: Config.hostAgentId,
    dna_id: serviceLogger.hash,
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
