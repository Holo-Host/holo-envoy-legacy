import axios from 'axios'
import * as archiver from 'archiver'
import * as colors from 'colors'
import * as extract from 'extract-zip'
import * as fs from 'fs-extra'
import * as Config from './config'
import * as Logger from '@whi/stdlog'

import {InstanceInfo, InstanceType, HappID} from './types'

const log = Logger('envoy-common', { level: process.env.LOG_LEVEL || 'fatal' });

/**
 * The canonical error response when catching a rejection or exception
 * TODO: use this more often!
 */
export const errorResponse = msg => ({error: msg})

/**
 * A consistent way to reject promises
 */
export const fail = e => {
  log.error("FAIL:".red);
  log.error(e);
};


export const serializeError = e => (
  typeof e === 'object' && !(e instanceof Error)
  ? JSON.stringify(e)
  : e
)
/**
 * Useful for handling express server failure
 */
export const catchHttp = next => e => {
  const err = e instanceof Error ? e : Error( JSON.stringify(e) );
  log.error("HTTP error caught: %s".red, String(err) );
  
  next( err );
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
  log.debug("Unbundling %s %s", input, target );
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
  log.info("Downloading resource from: %s", url );
  let response;
  try {
    response = await axios.request({
      url: url,
      method: 'GET',
      responseType: 'stream',
      maxContentLength: 999999999999,
    })
  }
  catch (err) {
    log.fatal('Axios error: %s', parseAxiosError(err));
    return err.response
  }

  return new Promise((fulfill, reject) => {
    if (response.status != 200) {
      reject(`Could not fetch ${url}, response was ${response.statusText} ${response.status}`)
    } else {
      log.debug("Start streaming download %s", path );
      const writer = fs.createWriteStream(path)
        .on("finish", () => fulfill(path))
        .on("error", reject)
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
    return e
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
export const instanceIdFromAgentAndDna = ({ agentId, dnaHash }) => {
  const isHost			= agentId === Config.hostAgentName;
  
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
  const {instanceId, zomeName, funcName, args = {}} = callParams
  
  const payload = {
    instance_id: instanceId,
    zome: zomeName,
    function: funcName,
    args: args || {},
  }
  
  log.info("Zome call by instance %70s -> %s:%s({ %s })", instanceId, zomeName, funcName, Object.keys(args).join(', ') );
  let result
  try {
    result = await client.call('call', payload)
    if (!result) {
      throw `falsy result! (${result})`
    }
  } catch(e) {
    log.error("ZOME CALL FAILED")
    log.error(e)
    log.error("payload: %s", payload)
    log.error("result: %s", result)
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
export const lookupHoloInstance = async (client, { dnaHash, agentId }): Promise<InstanceInfo> => {
  const instances		 = await client.call('info/instances', {});
    // .map( ({dna, agent}) => {
    //   return {
    // 	dnaHash: dna,
    // 	agentId: agent
    //   };
    // });

  log.info("Find hosted instance for Agent/DNA: %s/%s", agentId, dnaHash );
  const hosted			= instances.find( ( inst ) => {
    log.silly("DNA match:   %64.64s === %s", inst.dna, dnaHash );
    log.silly("Agent match: %64.64s === %s", inst.agent, agentId );
    return inst.dna === dnaHash && inst.agent === agentId;
  });
  
  if ( hosted ) {
    log.debug("Found instance for hosted agent: %s", hosted.id );
    return {
      "id": hosted.id,
      "agentId": hosted.agent,
      "dnaHash": hosted.dna,
      "type": InstanceType.Hosted,
    };
  }
  else {
    const pub			= instances.find( ( inst ) => {
      log.silly("DNA match:   %64.64s === %s", inst.dna, dnaHash );
      log.silly("Agent match: %64.64s === %s", inst.agent, Config.hostAgentName );
      return inst.dna === dnaHash && inst.agent === Config.hostAgentName;
    });
    
    if ( pub ) {
      log.debug("Found host instance: %s", pub.id );
      return {
	"id": pub.id,
	"agentId": pub.agent,
	"dnaHash": pub.dna,
	"type": InstanceType.Public,
      };
    }
    else {
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
