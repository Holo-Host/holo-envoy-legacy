
import {Instance, HappID} from '../types'
import {errorResponse, fail, InstanceIds, zomeCallByDna} from '../common'
import {serviceLoggerInstanceId} from '../config'

export type CallRequest = {
  agentId: string,
  happId: HappID,
  dnaHash: string,
  zome: string,
  function: string,
  params: any,
  signature: string,
}

export type CallResponse = any

export default (publicClient, internalClient) => async ({
  agentId,
  happId,
  dnaHash,
  zome,
  function: func, 
  params,
  signature,
}: CallRequest) => {
  console.log('starting zome call...')
  // TODO: add replay attack protection? nonce?
  // TODO: figure out actual payload, especially after conductor RPC call is refactored
  const requestData = {func, params}
  const requestEntryHash = await logServiceRequest(internalClient,
    {happId, dnaHash, requestData})

  const result = await zomeCallByDna(publicClient, {agentId, dnaHash, zomeName: zome, funcName: func, params})
  const responseData = result
  const metrics = calcMetrics(requestData, responseData)
  const responseEntryHash = await logServiceResponse(internalClient,
    {happId, requestEntryHash, responseData, metrics})

  return result
}

///////////////////////////////////////////////
// Service Logs

type ServiceMetrics = {
  bytesIn: number,
  bytesOut: number,
}


const logServiceRequest = async (client, {happId, dnaHash, requestData}) => {
  const instanceId = serviceLoggerInstanceId(happId)
  const hash = await client.call(`${instanceId}/service/log_request`, {
    agent_id: 'TODO',
    zome_call_spec: 'TODO',
    dna_hash: dnaHash,
    client_signature: 'TODO',
  })
  return hash
}

const logServiceResponse = async (client, {happId, requestEntryHash, responseData, metrics}) => {
  const instanceId = serviceLoggerInstanceId(happId)
  const hash = await client.call(`${instanceId}/service/log_response`, {
    request_hash: requestEntryHash,
    hosting_stats: metrics,
    response_log: responseData,  // TODO, make sure this is calculated correctly
    host_signature: 'TODO, probably should be signed by servicelogger, not externally', 
  })
  return hash
}

const logServiceSignature = async (client, {happId, responseEntryHash, signature}) => {
  const instanceId = serviceLoggerInstanceId(happId)
  const hash = await client.call(`${instanceId}/service/log_service`, {
    response_hash: responseEntryHash,
    client_signature: signature
  })
  return null
}

const calcMetrics = (request, response): ServiceMetrics => ({
  bytesIn: request.length,
  bytesOut: response.length
})
