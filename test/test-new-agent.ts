import * as test from 'tape'
import * as sinon from 'sinon'

import {mockResponse, sinonTest, testIntrceptr} from './common'
import * as Config from '../src/config'
import {IntrceptrServer} from '../src/server'
import * as M from '../src/flows/new-agent'
import newAgentFlow from '../src/flows/new-agent'

// TODO: add tests for failure cases

sinonTest('can host new agent', async T => {
  const {intrceptr, masterClient, publicClient, internalClient} = testIntrceptr()
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
  const {intrceptr, masterClient, publicClient, internalClient} = testIntrceptr()
  await M.createAgent(masterClient, 'existing-agent-id')

  T.callCount(masterClient.call, 1)
  T.calledWith(masterClient.call.firstCall, 'admin/agent/list')
})

sinonTest('can only host agent for enabled app', async T => {
  const {intrceptr, masterClient, publicClient, internalClient} = testIntrceptr()
  await newAgentFlow(masterClient)({
    agentId: 'agentId',
    happId: 'test-app-3',
    signature: 'TODO unused signature'
  })

  // 16 calls:
  // 1 for get_enabled_app
  // 2 for createAgent
  // 1 for lookupHoloApp
  // 4 for each zome (x3)
  // NB: the particulars of setupInstance are tested in test-install-happ
  T.callCount(masterClient.call, 16)
  T.calledWith(masterClient.call.firstCall, 'call', {
    instance_id: Config.holoHostingAppId,
    zome: 'host',
    function: 'get_enabled_app',
    params: {}
  })
})
