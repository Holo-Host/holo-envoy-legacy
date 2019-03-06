
import * as tar from 'tar-fs'
import * as fs from 'fs'

import {Instance, HappID} from './types'

export const errorResponse = msg => ({error: msg})

export const fail = e => console.error("FAIL: ", e)

export const bundle = (input, target) =>
  tar.pack(input).pipe(fs.createWriteStream(target))

export const unbundle = (input, target) =>
  fs.createReadStream(input).pipe(tar.extract(target))

// from https://decembersoft.com/posts/promises-in-serial-with-array-reduce/
export const sequentialPromises = tasks => tasks.reduce((promiseChain, currentTask) => {
  return promiseChain.then(chainResults =>
    currentTask.then(currentResult =>
      [ ...chainResults, currentResult ]
    )
  );
}, Promise.resolve([]))

///////////////////////////////////////////////////////////////////
///////////////////////     CONFIG     ////////////////////////////
///////////////////////////////////////////////////////////////////

export const InstanceIds = {
  holoHosting: `holo-hosting`,
  serviceLogs: happId => `service-logs-${happId}`
}


///////////////////////////////////////////////////////////////////
///////////////////////      UTIL      ////////////////////////////
///////////////////////////////////////////////////////////////////

export const agentIdFromKey = key => key

export const zomeCallByDna = async (client, {agentId, dnaHash, func, params}) => {
  let instance = await lookupInstance(client, {dnaHash, agentId})
  console.log('instance found: ', instance)
  if (instance) {
    return await zomeCallByInstance(client, {instanceId: instance.id, func, params})
  } else {
    return errorResponse(`No instance found 
      where agentId == '${agentId}' 
      and   dnaHash == '${dnaHash}'
    `)
  }
}

export const zomeCallByInstance = async (client, {instanceId, func, params}) => {
  const method = `${instanceId}/${func}`
  try {
    console.debug("Calling...", method)
    return JSON.parse(await client.call(method, params))
  } catch(e) {
    console.error("function call failed: ", func)
    throw e
  }
}

export const lookupInstance = async (client, {dnaHash, agentId}): Promise<Instance | null> => {
  const instances = await client.call('info/instances').catch(fail)
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dna === dnaHash && inst.agent === agentId) || null
}
