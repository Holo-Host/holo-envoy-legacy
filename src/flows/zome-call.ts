
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
  
  instanceId?: string,
  zome: string,
  function: string,
  args?: any,
  
  signature: string,
  handle?: string,
  params?: any,
}

export type CallResponse = any

export default ( masterClient, publicClient, internalClient ) => {
  return async ( call: CallRequest ) => {
    // Known input
    //
    //   - hApp ID	(hash)
    //   - agent ID	(hash)
    //   - DNA ID	(hash)
    //   - zome name
    //   - zome function name
    //   - argument data
    //   
    // Unknown input
    // 
    //   - instance ID
    //   - signature (this won't be known until client side holochain is implmented "light-client")
    //   
    
    // TODO: add replay attack protection? nonce?
    // TODO: figure out actual payload, especially after conductor RPC call is refactored

    if ( call.params ) {
      log.warn("Call request input 'params' is deprecated, use 'args' to pass zome function argument data");
    }

    log.debug("Unpacking call request: %s", call );
    const agentId			= call.agentId;
    const happId			= call.happId;

    // TODO: 'instanceId' should be 'dnaId'.  Only Envoy needs to know the instance naming scheme.
    // The client knows the hApp ID and DNA(s) without asking Envoy.  Meaning, if the call request
    // contains a hApp ID and a DNA ID, Envoy can determine the hosted instance.
    const dnaId				= call.instanceId;
    log.info("Agent '%s' is calling DNA '%s' that belongs to hApp '%s'", agentId, dnaId, happId );
    
    const zomeName			= call.zome;
    const funcName			= call.function;
    const args				= call.args || call.params;
    log.info("Agent '%s' is calling %50s:%-50s with (%s) arguments", agentId, zomeName, funcName, Object.keys(args).length );

    let signature			= call.signature

    //
    // Preprocess call request input
    //
    //   handle		- What are handles?  Perhaps some legacy terminology
    //   signature	- We are not expecting signatures
    //   
    if ( call.handle ) {
      log.warn("Call request contains handle '%s', but we don't know what it is for", call.handle );
    }
    
    if ( signature === undefined ) {
      log.silly("Signature was not sent with call request");
    }
    else if ( typeof signature !== 'string' ) {
      log.warn("Unexpected signature type '%s'.  Ignoring for now...", typeof signature );
    }
    else {
      log.error("How are we getting a signature (type %s)?  Light-client has not been implemented yet", typeof signature );
    }

    //
    // Process call request
    //
    //   1. Verify that this hApp is still being paid for
    //      - Look up provider information by hApp ID
    //   2. Verify that we have an instance for this Agent/DNA
    //      - Convert hApp ID to DNA(s)
    //   3. Log service request
    //   4. Make the call to conductor
    //   5. Log service response
    //   6. Return conductor response
    //
    // Required input for conductor zome call:
    //
    //   - instance ID
    //   - zome name
    //   - zome function name
    //   - argument data
    //

    // see if this instance is actually hosted, we may have to get the host's instance if not
    const instance			= await lookupHoloInstance(
      masterClient,
      { agentId, "dnaHash": dnaId }
    );
    
    // use the looked-up instance info, not the info passed in to the zome call
    const instanceId			= instanceIdFromAgentAndDna( instance )

    const requestData			= buildServiceLoggerRequestPackage({
      "dnaHash":	dnaId,
      "zome":		zomeName,
      "function":	funcName,
      			args,
    });
    
    const requestEntryHash		= await logServiceRequest( internalClient, {
      happId, agentId, "dnaHash": dnaId, requestData, zomeName, funcName, signature
    });
    
    const result			= await zomeCallByInstance(
      publicClient,
      { instanceId, zomeName, funcName, args }
    );
    
    const responseData			= buildServiceLoggerResponsePackage(result)
    const metrics			= calcMetrics(requestData, responseData)
    const responseEntryHash		= await logServiceResponse(internalClient, {
      happId, requestEntryHash, responseData, metrics
    });

    return result;
  }
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
