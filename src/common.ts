
import * as tar from 'tar-fs'
import * as fs from 'fs-extra'

import {Instance, HappID} from './types'

/**
 * The canonical error response when catching a rejection or exception
 * TODO: use this more often!
 */
export const errorResponse = msg => ({error: msg})

/**
 * A consistent way to reject promises
 */
export const fail = e => console.error("FAIL: ", e)

/**
 * The method of bundling UIs into a single bundle
 */
export const bundle = (input, target) =>
  tar.pack(input).pipe(fs.createWriteStream(target))

/**
 * The opposite of `bundle`
 */
export const unbundle = (input, target) =>
  fs.createReadStream(input).pipe(tar.extract(target))

///////////////////////////////////////////////////////////////////
///////////////////////      UTIL      ////////////////////////////
///////////////////////////////////////////////////////////////////

/**
 * The UI instance ID for a given hApp
 */
export const uiIdFromHappId = (
  happId => happId + '-ui'
)

/**
 * The instance ID for a given AgentID and DNA hash
 */
export const instanceIdFromAgentAndDna = (agentId, dnaHash) => (
  `${agentId}::${dnaHash}`
)

/**
 * The instance ID for the per-hApp servicelogger
 */
export const serviceLoggerInstanceIdFromHappId = hostedHappId => (
  `servicelogger-${hostedHappId}`
)

/**
 * The string used in servicelogger requests to specify the zome function called
 */
export const zomeCallSpec = ({zomeName, funcName}) => (
  `${zomeName}/${funcName}`
)

/**
 * Make a zome call through the WS client, identified by AgentID + DNA Hash
 */
export const zomeCallByDna = async (client, {agentId, dnaHash, zomeName, funcName, params}) => {
  // let instance = await lookupInstance(client, {dnaHash, agentId})
  const instanceId = instanceIdFromAgentAndDna(agentId, dnaHash)
  console.log('instance found: ', instanceId)
  if (instanceId) {
    return await zomeCallByInstance(client, {instanceId, zomeName, funcName, params})
  } else {
    return errorResponse(`No instance found
      where agentId == '${agentId}'
      and   dnaHash == '${dnaHash}'
    `)
  }
}

/**
 * Make a zome call through the WS client, identified by instance ID
 */
export const zomeCallByInstance = async (client, {instanceId, zomeName, funcName, params}) => {
  const payload = {
    instance_id: instanceId,
    zome: zomeName,
    function: funcName,
    params
  }
  let resultRaw
  try {
    console.info("Calling zome...", payload)
    resultRaw = await callWhenConnected(client, 'call', payload)
    const result = resultRaw && typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw
    if (!("Ok" in result)) {
      throw result
    }
    return result.Ok
  } catch(e) {
    console.error("ZOME CALL FAILED")
    console.error(e)
    console.error("payload:", payload)
    console.error("raw result:", resultRaw)
    throw e
  }
}

/**
 * Get an instance config via AgentID and DNA hash, if exists
 */
export const lookupInstance = async (client, {dnaHash, agentId}): Promise<Instance | null> => {
  const instances = await callWhenConnected(client, 'info/instances', {}).catch(fail)
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dna === dnaHash && inst.agent === agentId) || null
}

/**
 * If the WS client is connected to the server, make the RPC call immediately
 * Otherwise, wait for connection, then make the call
 * Return a promise that resolves when the call is complete
 * TODO: may eventually be superseded by ConnectionManager
 */
export const callWhenConnected = async (client, method, payload) => {
  if(client.ready) {
    console.info("calling (already connected)", method, payload)
    return await client.call(method, payload)
  } else {
    console.info("waiting to connect, so as to call...")
    return new Promise((resolve, reject) => {
      client.once('open', () => {
        console.info("connected, calling...", method, payload)
        client.call(method, payload).then(resolve).catch(reject)
      })
    })
  }
}
