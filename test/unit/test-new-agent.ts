import * as test from 'tape'
import * as sinon from 'sinon'

import {mockResponse, sinonTest, testEnvoyServer} from '../common'
import * as Config from '../../src/config'
import {EnvoyServer} from '../../src/server'
import * as M from '../../src/flows/new-agent'
import newAgentFlow from '../../src/flows/new-agent'
import {TEST_HAPPS} from '../test-happs'

// TODO: add tests for failure cases

const {basicChat, testApp3} = TEST_HAPPS

sinonTest('can host new agent', async T => {
  const {envoy, masterClient, publicClient, internalClient} = testEnvoyServer()
  await M.createAgent(masterClient, 'agentId')

  T.callCount(masterClient.call, 2)
  T.calledWith(masterClient.call.firstCall, 'admin/agent/list')
  T.calledWith(masterClient.call.secondCall, 'admin/agent/add', {
    holo_remote_key: "agentId",
    id: "agentId",
    keystore_file: "IGNORED",
    name: "agentId",
    public_address: "agentId"
  })
})

sinonTest('can idempotently add existing agent', async T => {
  const {envoy, masterClient, publicClient, internalClient} = testEnvoyServer()
  await M.createAgent(masterClient, 'existing-agent-id')

  T.callCount(masterClient.call, 1)
  T.calledWith(masterClient.call.firstCall, 'admin/agent/list')
})

sinonTest('can only host agent for enabled app (1 DNA)', async T => {
  const {envoy, masterClient, publicClient, internalClient} = testEnvoyServer()
  const agentId = 'agentId'
  const dnaHash = basicChat.dnas[0].hash
  await newAgentFlow(masterClient)({
    agentId,
    happId: basicChat.happId,
    signature: 'TODO unused signature'
  })

  // 8 calls:
  // 1 for get_enabled_app_list
  // 2 for createAgent
  // 2 for lookupAppEntryInHHA
  // 4 for each DNA (x1)
  // NB: the particulars of setupInstance are tested in test-install-happ
  T.callCount(masterClient.call, 9)
  T.calledWith(masterClient.call.firstCall, 'call', {
    instance_id: Config.holoHostingAppId.instance,
    zome: 'host',
    function: 'get_enabled_app_list',
    params: {}
  })
  T.calledWith(masterClient.call, 'admin/instance/add', {
    id: `${dnaHash}::${agentId}`,
    dna_id: dnaHash,
    agent_id: agentId,
  })
})

sinonTest('can only host agent for enabled app (3 DNAs)', async T => {
  const {envoy, masterClient, publicClient, internalClient} = testEnvoyServer()
  const agentId = 'agentId'
  await newAgentFlow(masterClient)({
    agentId,
    happId: testApp3.happId,
    signature: 'TODO unused signature'
  })

  // 16 calls:
  // 1 for get_enabled_app_list
  // 2 for createAgent
  // 2 for lookupAppEntryInHHA
  // 4 for each DNA (x3)
  // NB: the particulars of setupInstance are tested in test-install-happ
  T.callCount(masterClient.call, 17)
  T.calledWith(masterClient.call.firstCall, 'call', {
    instance_id: Config.holoHostingAppId.instance,
    zome: 'host',
    function: 'get_enabled_app_list',
    params: {}
  })
  T.calledWith(masterClient.call, 'admin/instance/add', {
    id: `${testApp3.dnas[0].hash}::${agentId}`,
    dna_id: testApp3.dnas[0].hash,
    agent_id: agentId,
  })
  T.calledWith(masterClient.call, 'admin/instance/add', {
    id: `${testApp3.dnas[1].hash}::${agentId}`,
    dna_id: testApp3.dnas[1].hash,
    agent_id: agentId,
  })
  T.calledWith(masterClient.call, 'admin/instance/add', {
    id: `${testApp3.dnas[2].hash}::${agentId}`,
    dna_id: testApp3.dnas[2].hash,
    agent_id: agentId,
  })
})
