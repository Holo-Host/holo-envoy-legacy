
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
export const uiIdFromHappId = happId => happId + '-ui'
export const instanceIdFromAgentAndDna = (agentId, dnaId) => `${agentId}::${dnaId}`

export const removeInstanceFromCallString = callString => {
  return callString.split('/').slice(1).join('/')
}

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

export const zomeCallByInstance = async (client, {instanceId, zomeName, funcName, params}) => {
  const payload = {
    instance_id: instanceId,
    zome: zomeName, 
    function: funcName,
    params
  }

  try {
    console.info("Calling zome...", payload, client.call)
    const response = await client.call('call', payload)
    return response
  } catch(e) {
    console.error("Zome call failed: ", payload, e)
    throw e
  }
}

export const lookupInstance = async (client, {dnaHash, agentId}): Promise<Instance | null> => {
  const instances = await client.call('info/instances').catch(fail)
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dna === dnaHash && inst.agent === agentId) || null
}
