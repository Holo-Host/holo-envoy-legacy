import * as axios from 'axios'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as tar from 'tar-fs'
import * as sinon from 'sinon'
import {EventEmitter} from 'events'

import {mockResponse, sinonTest, testIntrceptr} from './common'
import {bundle, unbundle, instanceIdFromAgentAndDna, serviceLoggerInstanceIdFromHappId} from '../src/common'
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
sinon.stub(tar, 'extract')
sinon.stub(tar, 'pack')
// sinon.stub(bundle)
// sinon.stub(unbundle)

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

const enabledAppCall = ({
  instance_id: Config.holoHostingAppId,
  function: "get_enabled_app",
  zome: "host",
  params: { },
})

sinonTest('can install dnas', async T => {
  const {masterClient} = testIntrceptr()

  await M.installDna(masterClient, {
    hash: 'hash',
    path: 'path',
    properties: null,
  })

  T.callCount(masterClient.call, 1)
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
    M.installDnasAndUi(masterClient, {happId: 'invalid'}),
    /hApp is not registered.*/
  )
  T.callCount(masterClient.call, 1)
})

sinonTest('throws error for unreachable resources', async T => {
  const {masterClient} = testIntrceptr()

  const axiosStub = sinon.stub(axios, 'request').resolves(axiosResponse(404))
  const happId = simpleApp.happId

  await T.rejects(
    M.installDnasAndUi(masterClient, {happId}),
    /Could not fetch.*404/
  )
  T.callCount(masterClient.call, 1)

  axiosStub.restore()
})

sinonTest('can install dnas and ui for hApp', async T => {
  const {masterClient} = testIntrceptr()
  T.comment('TODO: needs stub for HHA-enabled apps')

  const axiosStub = sinon.stub(axios, 'request').resolves(axiosResponse(200))
  const happId = simpleApp.happId
  const dnaHash = simpleApp.dnas[0].hash
  const uiHash = simpleApp.ui!.hash
  const result = M.installDnasAndUi(masterClient, {happId})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 3)

  T.calledWith(masterClient.call.getCall(0), 'call', enabledAppCall)
  T.calledWith(masterClient.call.getCall(1), 'admin/dna/list')
  T.calledWith(masterClient.call.getCall(2), 'admin/dna/install_from_file', {
    copy: true,
    expected_hash: dnaHash,
    id: dnaHash,
    path: `tempdir/${dnaHash}.dna.json`,
    properties: undefined
  })

  T.calledWith(fs.createReadStream, 'tempdir/QmSimpleAppFakeHash.tar')
  T.calledWith(tar.extract, 'tempdir/QmSimpleAppFakeHash')
  T.calledWith(
    fs.copy,
    'tempdir/QmSimpleAppFakeHash.tar', 
    path.join(Config.uiStorageDir, happId)
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

  T.calledWith(masterClient.call.getCall(0), 'call', enabledAppCall)
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
  T.callCount(masterClient.call, 5)

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
})
