
import {HappID} from '../types'
import {
  errorResponse,
  fail,
  serviceLoggerInstanceIdFromHappId,
  zomeCallByDna,
  zomeCallByInstance,
  zomeCallSpec,
} from '../common'


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

export default (publicClient, internalClient) => async (call: CallRequest) => {
  // TODO: add replay attack protection? nonce?
  // TODO: figure out actual payload, especially after conductor RPC call is refactored

  const {
    agentId,
    happId,
    dnaHash,
    zome: zomeName,
    function: funcName,
    params,
  } = call

  let signature = call.signature

  console.debug("holo/call input: ", call)

  if (typeof signature !== 'string') {
    console.warn("hClient sent weird signature! TODO find out why")
    signature = 'TODO-look-into-hClient-signature'
  }

  const requestData = buildServiceLoggerRequestPackage(call)
  const requestEntryHash = await logServiceRequest(internalClient,
    {happId, agentId, dnaHash, requestData, zomeName, funcName, signature})
  const result = await zomeCallByDna(publicClient, {
    agentId, dnaHash, zomeName, funcName, params
  })
  const responseData = buildServiceLoggerResponsePackage(result)
  const metrics = calcMetrics(requestData, responseData)
  const responseEntryHash = await logServiceResponse(internalClient,
    {happId, requestEntryHash, responseData, metrics})

  return result
}

///////////////////////////////////////////////
// Service Logs

type ServiceMetrics = {
  bytes_in: number,
  bytes_out: number,
  cpu_seconds: number,
}


const logServiceRequest = async (client, payload) => {
  const {
    happId, agentId, dnaHash, requestData, signature, zomeName, funcName
  } = payload
  const instanceId = serviceLoggerInstanceIdFromHappId(happId)
  const hash = await zomeCallByInstance(client, {
    instanceId: instanceId,
    zomeName: 'service',
    funcName: 'log_request',
    params: {
      entry: {
        agent_id: agentId,
        dna_hash: dnaHash // testing out hf as hosted app: "QmYhReByy4kHs3tAdUGSSfUBhvkhTTcfFvnSBCqAr2KZpq",  // TODO: REPLACE hashSTring with previous var >>> dnaHash,
        zome_call_spec: zomeCallSpec({zomeName, funcName}),  // TODO, figure out zome call spec format
        client_signature: signature,
      }
    }
  })
  return hash
}

const logServiceResponse = async (client, {happId, requestEntryHash, responseData, metrics}) => {
  const instanceId = serviceLoggerInstanceIdFromHappId(happId)
  const hash = await zomeCallByInstance(client, {
    instanceId: instanceId,
    zomeName: 'service',
    funcName: 'log_response',
    params: {
      entry: {
        request_hash: requestEntryHash,
        hosting_stats: metrics,
        response_log: 'TODO: response_log',  // TODO, make sure this is calculated correctly
        response_data_hash: 'TODO: response_data_hash',
        host_signature: 'TODO: remove this and have servicelogger make signature internally',
      }
    }
  })
  return hash
}

/**
 * Gets called as a separate request from the UI, after the response has been delivered
 */
export const logServiceSignature = async (client, {happId, responseEntryHash, signature}) => {
  const instanceId = serviceLoggerInstanceIdFromHappId(happId)
  const hash = await zomeCallByInstance(client, {
    instanceId: instanceId,
    zomeName: 'service',
    funcName: 'log_service',
    params: {
      entry: {
        response_hash: responseEntryHash,
        client_signature: signature
      }
    }
  })
  return null
}

export const buildServiceLoggerRequestPackage = ({dnaHash, zome, function: func, params}: CallRequest) => {
  return {
    function: `${dnaHash}/${zome}/${func}`,
    params
  }
}

export const buildServiceLoggerResponsePackage = (response: CallResponse) => {
  return response
}

export const calcMetrics = (request, response): ServiceMetrics => ({
  bytes_in: JSON.stringify(request).length,
  bytes_out: JSON.stringify(response).length,
  cpu_seconds: 0.1111111,  // TODO
})
