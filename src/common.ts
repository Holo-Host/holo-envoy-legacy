import axios from 'axios'
import * as archiver from 'archiver'
import * as colors from 'colors'
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


export const serializeError = e => (
  typeof e === 'object' && !(e instanceof Error)
  ? JSON.stringify(e)
  : e
)
/**
 * Useful for handling express server failure
 */
export const catchHttp = next => e => {
  console.error("HTTP error caught:".red)
  next(serializeError(e))
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

export const downloadFile = async ({url, path}: {url: string, path: string}): Promise<string> => {
  const response = await axios.request({
    url: url,
    method: 'GET',
    responseType: 'stream',
    maxContentLength: 999999999999,
  }).catch(e => {
    console.warn('axios error: ', parseAxiosError(e))
    return e.response
  })

  return new Promise((fulfill, reject) => {
    if (response.status != 200) {
      reject(`Could not fetch ${url}, response was ${response.statusText} ${response.status}`)
    } else {
      const writer = fs.createWriteStream(path)
        .on("finish", () => fulfill(path))
        .on("error", reject)
      console.debug("Starting streaming download...")
      response.data.pipe(writer)
    }
  })
}

// print less of the enormous axios error object
export const parseAxiosError = e => {
  if ('config' in e && 'request' in e && 'response' in e) {
    return {
      request: {
        method: e.config.method,
        url: e.config.url,
        data: e.config.data,
      },
      response: !e.response ? e.response : {
        status: e.response.status,
        statusText: e.response.statusText,
        data: e.response.data,
      }
    }
  } else {
    return null
  }
}

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
 * If this is the host's instance, the ID is just the DNA hash
 * Another agent's hosted instance gets their agentId appended to it with a ::
 */
export const instanceIdFromAgentAndDna = ({agentId, dnaHash}) => {
  const isHost = agentId === Config.hostAgentName
  return isHost ? dnaHash : `${dnaHash}::${agentId}`
}


/**
 * The instance ID for the per-hApp servicelogger
 */
export const serviceLoggerInstanceIdFromHappId = hostedHappId => (
  `servicelogger-${hostedHappId}`
)


/**
 * The DNA ID for the per-hApp servicelogger
 */
export const serviceLoggerDnaIdFromHappId = serviceLoggerInstanceIdFromHappId


/**
 * The string used in servicelogger requests to specify the zome function called
 */
export const zomeCallSpec = ({zomeName, funcName}) => (
  `${zomeName}/${funcName}`
)


type CallFnParams = {
  instanceId: string,
  zomeName: string,
  funcName: string,
  args: any
}

/**
 * Make a zome call through the WS client, identified by instance ID
 * TODO: maybe keep the Ok/Err wrapping, to differentiate between zome error and true exception
 */
export const zomeCallByInstance = async (client, callParams: CallFnParams) => {
  const {instanceId, zomeName, funcName, args} = callParams
  console.log("CALLPARAMS", callParams)
  console.log("ARGS", args)
  const payload = {
    instance_id: instanceId,
    zome: zomeName,
    function: funcName,
    args: args || {},
  }
  let result
  try {
    result = await client.call('call', payload)
    if (!result) {
      throw `falsy result! (${result})`
    }
  } catch(e) {
    console.error("ZOME CALL FAILED")
    console.error(e)
    console.error("payload:", payload)
    console.error("result: ", result)
    throw e
  }
  if (!("Ok" in result)) {
    throw result
  } else {
    return result.Ok
  }
}


/**
 * Look for an instance config via AgentID and DNA hash
 * If no such instance exists, look for the public instance for that DNA
 * If neither exist, reject the promise
 */
export const lookupHoloInstance = async (client, {dnaHash, agentId}): Promise<InstanceInfo> => {
  const instances: Array<InstanceInfo> = (await client.call('info/instances', {}))
    .map(({dna, agent}) => ({
      dnaHash: dna,
      agentId: agent
    }))
  const hosted = instances.find(inst => inst.dnaHash === dnaHash && inst.agentId === agentId)
  if (hosted) {
    console.debug("Found instance for hosted agent: ", hosted)
    return Object.assign(hosted, {type: InstanceType.Hosted})
  } else {
    const pub = instances.find(inst => inst.dnaHash === dnaHash && inst.agentId === Config.hostAgentName)
    if (pub) {
      console.debug("Found public instance: ", pub)
      return Object.assign(pub, {type: InstanceType.Public})
    } else {
      throw `No instance found
        where agentId == '${agentId}' || agentId == '${Config.hostAgentName}'
        and   dnaHash == '${dnaHash}'
      `
    }
  }
}

export const whenReady = async client => {
  if(!client.ready) {
    return new Promise(resolve => {
      client.once('open', resolve)
    })
  }
}

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
