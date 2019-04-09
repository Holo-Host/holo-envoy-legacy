
import * as archiver from 'archiver'
import * as extract from 'extract-zip'
import * as fs from 'fs-extra'
import * as Config from './config'

import {InstanceInfo, InstanceType, HappID} from './types'

/**
 * The canonical error response when catching a rejection or exception
 * TODO: use this more often!
 */
export const errorResponse = msg => ({error: msg})

/**
 * A consistent way to reject promises
 */
export const fail = e => console.error("FAIL: ", e)


export const serializeError = e => typeof e === 'object' ? JSON.stringify(e) : e
/**
 * Useful for handling express server failure
 */
export const catchHttp = next => e => {
  const err = serializeError(e)
  console.error("HTTP error caught:")
  next(err)
}

/**
 * The method of bundling UIs into a single bundle
 */
export const bundleUI = (input, target) => new Promise((resolve, reject) => {
  const output = fs.createWriteStream(target)
  const archive = archiver('zip')
  output.on('finish', () => resolve(target))
  output.on('error', reject)
  archive.on('error', reject)

  archive.pipe(output)
  archive.directory(input, false)
  archive.finalize()
})

/**
 * The opposite of `bundleUI`
 */
export const unbundleUI = (input, target) => new Promise((resolve, reject) => {
  console.debug("Unbundling...")
  extract(input, {dir: target}, function (err) {
    if (err) {
      reject(err)
    } else {
      resolve(target)
    }
   // extraction is complete. make sure to handle the err
  })
})

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
  let instance = await lookupHoloInstance(client, {dnaHash, agentId})
  const instanceId = instanceIdFromAgentAndDna(instance.agentId, instance.dnaHash)
  return zomeCallByInstance(client, {instanceId, zomeName, funcName, params})
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
    const result = (resultRaw && typeof resultRaw === 'string') ? JSON.parse(resultRaw) : resultRaw
    if (!result) {
      throw `falsy result! (${resultRaw})`
    } else if (!("Ok" in result)) {
      throw result
    } else {
      return result.Ok
    }
  } catch(e) {
    console.error("ZOME CALL FAILED")
    console.error(e)
    console.error("payload:", payload)
    console.error("raw result:", resultRaw)
    throw e
  }
}

/**
 * Look for an instance config via AgentID and DNA hash
 * If no such instance exists, look for the public instance for that DNA
 * If neither exist, reject the promise
 */
export const lookupHoloInstance = async (client, {dnaHash, agentId}): Promise<InstanceInfo> => {
  const instances: Array<InstanceInfo> = (await callWhenConnected(client, 'info/instances', {}))
    .map(({dna, agent}) => ({
      dnaHash: dna,
      agentId: agent
    }))
  const hosted = instances.find(inst => inst.dnaHash === dnaHash && inst.agentId === agentId)
  if (hosted) {
    console.debug("Found instance for hosted agent: ", hosted)
    return Object.assign(hosted, {type: InstanceType.Hosted})
  } else {
    const pub = instances.find(inst => inst.dnaHash === dnaHash && inst.agentId === Config.hostAgentId)
    if (pub) {
      console.debug("Found public instance: ", pub)
      return Object.assign(pub, {type: InstanceType.Public})
    } else {
      throw `No instance found
        where agentId == '${agentId}' || agentId == '${Config.hostAgentId}'
        and   dnaHash == '${dnaHash}'
      `
    }
  }
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
    return client.call(method, payload)
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

export const whenReady = async client => {
  if(!client.ready) {
    return new Promise(resolve => {
      client.once('open', resolve)
    })
  }
}
