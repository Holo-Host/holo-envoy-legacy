import * as test from 'tape'
import * as sinon from 'sinon'

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
    bytesIn: 24,
    bytesOut: 17,
  })
  t.end()
})

// TODO: add tests for failure cases

sinonTest('can call public zome function', async T => {
  const {intrceptr, masterClient, publicClient, internalClient} = testIntrceptr()

  internalClient.call.withArgs('call').onFirstCall().returns('requestHash')
  internalClient.call.withArgs('call').onSecondCall().returns('responseHash')
  
  const happId = 'test-app-1'
  const serviceLoggerInstanceId = serviceLoggerInstanceIdFromHappId(happId)
  const request = {params: 'params'}
  const call = {
    happId,
    agentId: 'agentId',
    dnaHash: 'dnaHash',
    zome: 'zome',
    function: 'function',
    params: request,
    signature: 'signature',
  }
  const response = await intrceptr.zomeCall(call)
  const requestPackage = Z.buildServiceLoggerRequestPackage(call)
  const responsePackage = Z.buildServiceLoggerResponsePackage(response)
  const metrics = Z.calcMetrics(requestPackage, responsePackage)

  T.equal(response, mockResponse)

  T.callCount(internalClient.call, 2)

  T.calledWith(internalClient.call, 'call', {
    instance_id: serviceLoggerInstanceId,
    zome: 'service',
    function: 'log_request', 
    params: {
      agent_id: 'agentId',
      zome_call_spec: 'zome/function',
      dna_hash: 'dnaHash',
      client_signature: 'signature',
    }
  })

  T.calledWith(internalClient.call.getCall(1), 'call', {
    instance_id: serviceLoggerInstanceId,
    zome: 'service',
    function: 'log_response', 
    params: {
      request_hash: 'requestHash',
      hosting_stats: metrics,
      response_log: mockResponse,
    }
  })

  T.calledWith(publicClient.call, 'call', {
    instance_id: instanceIdFromAgentAndDna('agentId', 'dnaHash'),
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

sinonTest.only('can sign responses for servicelogger later', async T => {
  const {intrceptr, internalClient} = testIntrceptr()
  const agentId = 'agentId'
  const entry = {entry: 'whatever'}
  const spy0 = sinon.spy()
  const spy1 = sinon.spy()
  await intrceptr.serviceSignature({
    happId: 'happId', 
    responseEntryHash: 'hash', 
    signature: 'signature',
  })

  T.callCount(internalClient.call, 1)
  T.calledWith(internalClient.call, 'call', {
    zome: "service",
    function: "log_service",
    instance_id: "servicelogger-happId",
    params: { client_signature: "signature", response_hash: "hash" },
  })
})
