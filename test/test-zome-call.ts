import * as test from 'tape'
import * as sinon from 'sinon'

import * as Config from '../src/config'
import {lookupHoloInstance} from '../src/common'
import {InstanceType} from '../src/types'
import {testInstances, baseClient} from './common'

import {
  mockResponse,
  sinonTest,
  testIntrceptr,
} from './common'
import {
  instanceIdFromAgentAndDna,
  serviceLoggerInstanceIdFromHappId,
} from '../src/common'
import {IntrceptrServer} from '../src/server'
import * as Z from '../src/flows/zome-call'

test('can calculate metrics', t => {
  const request = {giveMe: 'what i want'}
  const response = {here: 'you go'}
  const metrics = Z.calcMetrics(request, response)
  t.deepEqual(metrics, {
    bytes_in: 24,
    bytes_out: 17,
    cpu_seconds: 0.1111111,
  })
  t.end()
})

test('lookupHoloInstance can find an instance', async t => {
  const instances = [
    {agent: Config.hostAgentId, dna: 'new-dna'},  // the public instance
    {agent: 'hosted-agent', dna: 'new-dna'},  // the hosted instance
  ]
  const client = baseClient()
  client.call.withArgs('info/instances').resolves(instances)
  const resultHosted = await lookupHoloInstance(client, {agentId: 'hosted-agent', dnaHash: 'new-dna'}).catch(t.fail)
  const resultPublic = await lookupHoloInstance(client, {agentId: 'missing-agent', dnaHash: 'new-dna'}).catch(t.fail)
  t.equal(resultHosted.type, InstanceType.Hosted)
  t.equal(resultHosted.agentId, 'hosted-agent')
  t.equal(resultPublic.type, InstanceType.Public)
  t.equal(resultPublic.agentId, Config.hostAgentId)
  t.end()
})

// TODO: add tests for failure cases

sinonTest('can call public zome function', async T => {
  const {intrceptr, masterClient, publicClient, internalClient} = testIntrceptr()

  internalClient.call.withArgs('call').onFirstCall().returns({Ok: "requestHash"})
  internalClient.call.withArgs('call').onSecondCall().returns({Ok: "responseHash"})

  const agentId = 'some-ad-hoc-agent-id'
  const dnaHash = 'test-dna-hash-1a'
  const happId = 'test-app-1'
  const serviceLoggerInstanceId = serviceLoggerInstanceIdFromHappId(happId)
  const request = {params: 'params'}
  const call = {
    happId,
    agentId,
    dnaHash,
    zome: 'zome',
    function: 'function',
    params: request,
    signature: 'signature',
  }
  const response = await intrceptr.zomeCall(call)
  const requestPackage = Z.buildServiceLoggerRequestPackage(call)
  const responsePackage = Z.buildServiceLoggerResponsePackage(response)
  const metrics = Z.calcMetrics(requestPackage, responsePackage)

  T.equal(response, mockResponse.Ok)

  T.callCount(internalClient.call, 2)
  T.callCount(publicClient.call, 2)

  T.calledWith(internalClient.call, 'call', {
    instance_id: serviceLoggerInstanceId,
    zome: 'service',
    function: 'log_request',
    params: {
      entry: {
        agent_id: agentId,
        zome_call_spec: 'zome/function',
        dna_hash: dnaHash,
        client_signature: 'signature',
      }
    }
  })

  T.calledWith(internalClient.call, 'call', {
    instance_id: serviceLoggerInstanceId,
    zome: 'service',
    function: 'log_response',
    params: {
      entry: {
        request_hash: 'requestHash',
        hosting_stats: metrics,
        response_data_hash: "TODO: response_data_hash",
        response_log: 'TODO: response_log',
        host_signature: 'TODO: remove this and have servicelogger make signature internally',
      }
    }
  })

  T.calledWith(publicClient.call, 'info/instances')

  // NB: the instance is called with the host agent ID, not the ad-hoc one!!
  T.calledWith(publicClient.call, 'call', {
    instance_id: instanceIdFromAgentAndDna(Config.hostAgentId, dnaHash),
    params: request,
    function: 'function',
    zome: 'zome',
  })
})

sinonTest('can sign things across the wormhole', async T => {
  const {intrceptr} = testIntrceptr()
  const agentId = 'agentId'
  const entry = {entry: 'whatever'}
  const spy0 = sinon.spy()
  const spy1 = sinon.spy()
  intrceptr.startHoloSigningRequest(agentId, entry, spy0)
  intrceptr.startHoloSigningRequest(agentId, entry, spy1)
  T.callCount(spy0, 0)
  T.callCount(spy1, 0)
  T.deepEqual(Object.keys(intrceptr.signingRequests), ['0', '1'])

  intrceptr.wormholeSignature({signature: 'sig 1', requestId: 0})
  T.calledWith(spy0, 'sig 1')
  T.callCount(spy1, 0)
  T.deepEqual(Object.keys(intrceptr.signingRequests), ['1'])

  intrceptr.wormholeSignature({signature: 'sig 2', requestId: 1})
  T.calledWith(spy1, 'sig 2')
  T.deepEqual(Object.keys(intrceptr.signingRequests), [])
})

sinonTest('can sign responses for servicelogger later', async T => {
  const {intrceptr, internalClient} = testIntrceptr()
  const happId = 'happId'

  internalClient.call.withArgs('call', {
    instance_id: serviceLoggerInstanceIdFromHappId(happId),
    zome: 'service',
    function: 'log_service',
    params: {
      response_hash: 'hash',
      client_signature: 'signature',
    }
  }).resolves({Ok: 'whatever'})

  await intrceptr.serviceSignature({
    happId,
    responseEntryHash: 'hash',
    signature: 'signature',
  })

  T.callCount(internalClient.call, 1)
  T.calledWith(internalClient.call, 'call', {
    zome: "service",
    function: "log_service",
    instance_id: "servicelogger-happId",
    params: {
      entry: { client_signature: "signature", response_hash: "hash" }
    }
  })
})
