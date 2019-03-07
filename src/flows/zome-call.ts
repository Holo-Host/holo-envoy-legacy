
import {Instance, HappID} from '../types'
import {errorResponse, fail, InstanceIds, zomeCallByDna} from '../common'


export type CallRequest = {
  agentKey: string,
  happId: HappID,
  dnaHash: string,
  function: string,
  params: any,
  signature: string,
}

export type CallResponse = any

export default client => async ({
  agentKey, 
  happId, 
  dnaHash, 
  function: func, 
  params,
  signature,
}: CallRequest, _ws) => {
  // TODO: add replay attack protection? nonce?
  // TODO: figure out actual payload, especially after conductor RPC call is refactored
  // const requestData = {func, params}
  // const requestEntryHash = await logServiceRequest(client,
  //   {happId, dnaHash, requestData})

  const result = await zomeCallByDna(client, {agentKey, dnaHash, func, params})
  // const responseData = result
  // const metrics = calcMetrics(requestData, responseData)
  // const responseEntryHash = await logServiceResponse(client,
  //   {happId, requestEntryHash, responseData, metrics})
  return result
}

///////////////////////////////////////////////
// Service Logs

type ServiceMetrics = {
  bytesIn: number,
  bytesOut: number,
}

const logServiceRequest = async (client, {happId, dnaHash, requestData}) => {
  const instanceId = InstanceIds.serviceLogs(happId)
  // const hash = await client.call(`${instanceId}/logs/request`, {
  const hash = 'TODO'; console.warn('TODO, call: ', `${instanceId}/logs/request`, {
    dnaHash,
    requestData,
  })
  return hash
}

const logServiceResponse = async (client, {happId, requestEntryHash, responseData, metrics}) => {
  const instanceId = InstanceIds.serviceLogs(happId)
  // const hash = await client.call(`${instanceId}/logs/response`, {
  const hash = 'TODO'; console.warn('TODO, call: ', `${instanceId}/logs/response`, {
    requestEntryHash,
    responseData,
    metrics,
  })
  return hash
}

const logServiceSignature = async (client, {happId, responseEntryHash, signature}) => {
  const instanceId = InstanceIds.serviceLogs(happId)
  // const hash = await client.call(`${instanceId}/logs/signature`, {
  const hash = 'TODO'; console.warn('TODO, call: ', `${instanceId}/logs/signature`, {
    responseEntryHash,
    signature
  })
  return null
}

const calcMetrics = (request, response): ServiceMetrics => ({
  bytesIn: request.length,
  bytesOut: response.length
})
