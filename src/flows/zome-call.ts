
import * as Config from '../config'
import {HappID} from '../types'
import {
  lookupHoloInstance,
  instanceIdFromAgentAndDna,
  serviceLoggerInstanceIdFromHappId,
  zomeCallByInstance,
  zomeCallSpec,
} from '../common'

import {lookupDnaByHandle} from './install-happ'
import * as Logger from '@whi/stdlog'

const log = Logger('zome-call', { level: process.env.LOG_LEVEL || 'fatal' });


export type CallRequest = {
  agentId: string,
  happId: HappID,
  handle?: string,
  instanceId?: string,
  zome: string,
  function: string,
  params?: any,
  args?: any,
  signature: string,
}

export type CallResponse = any

export default (masterClient, publicClient, internalClient) => async (call: CallRequest) => {
  // TODO: add replay attack protection? nonce?
  // TODO: figure out actual payload, especially after conductor RPC call is refactored

  const args = call.args || call.params || {}

  if (call.params) {
    log.warn("Warning: `params` is deprecated, use `args`")
  }

  const {
    agentId,
    happId,
    zome: zomeName,
    function: funcName,
  } = call

  // TODO: pick one or the other once we standardize across holochain, hc-web-client etc.
  // 
  // NOTE: Matthew Brisebois - Manually configured 'holofuel-dna-handle' to get Holofuel test
  // running
  // 
  const handle =  call.handle || call.instanceId
  if (!handle) {
    throw new Error("No `handle` or `instanceId` specified!")
  }

  let signature = call.signature

  log.debug("holo/call input: %s", call );

  if (typeof signature !== 'string') {
    log.warn("hClient sent weird signature! TODO find out why")
    signature = 'TODO-look-into-hClient-signature'
  }

  // const dna = await lookupDnaByHandle(masterClient, happId, handle)
  // const dnaHash = dna.hash
  const dnaHash = call.instanceId!.split('::')[0]; // dna.hash
  // see if this instance is actually hosted, we may have to get the host's instance if not
  const instance = await lookupHoloInstance(publicClient, {agentId, dnaHash})
  // use the looked-up instance info, not the info passed in to the zome call
  const instanceId = instanceIdFromAgentAndDna(instance)

  const requestData = buildServiceLoggerRequestPackage({
    dnaHash,
    zome: zomeName,
    function: funcName,
    args,
  })
  const requestEntryHash = await logServiceRequest(internalClient,
    {happId, agentId, dnaHash, requestData, zomeName, funcName, signature})
  const result = await zomeCallByInstance(publicClient, {
    instanceId, zomeName, funcName, args
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
    args: {
      entry: {
        agent_id: agentId,
        dna_hash: dnaHash,
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
    args: {
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
    args: {
      entry: {
        response_hash: responseEntryHash,
        client_signature: signature
      }
    }
  })
  return null
}

// TODO: make sure this is tested
export const buildServiceLoggerRequestPackage = ({dnaHash, zome, function: func, args}) => {
  return {
    function: `${dnaHash}/${zome}/${func}`,
    args
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
