
import {Instance, CallRequest, CallResponse} from '../types'
import {errorResponse, fail, InstanceIds} from '../common'

export default client => async ({
  agentId, 
  happId, 
  dnaHash, 
  function: func, 
  params,
  signature,
}: CallRequest, _ws) => {
  // TODO: add replay attack protection? nonce?
  let instance = await lookupInstance(client)({dnaHash, agentId}).catch(fail)
  console.log('instance found: ', instance)
  if (instance) {
    const method = `${instance.id}/${func}`
    const requestData = {method, params}
    const requestEntryHash = await logServiceRequest(client,
      {happId, dnaHash, requestData})

    let result
    try {
      console.debug("Calling...", method)
      result = await client.call(method, params).catch(fail)
    } catch(e) {
      console.error("function not found: ", func)
      throw e
    }

    const responseData = result
    const metrics = calcMetrics(requestData, responseData)
    const responseEntryHash = await logServiceResponse(client,
      {happId, requestEntryHash, responseData, metrics})
    return result
  } else {
    return errorResponse(`No instance found for happId '${happId}' 
      where agentId == '${agentId}' 
      and   dnaHash == '${dnaHash}'
    `)
  }
}

const lookupInstance = client => async ({dnaHash, agentId}): Promise<Instance | null> => {
  const instances = await client.call('info/instances').catch(fail)
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dna === dnaHash && inst.agent === agentId) || null
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
