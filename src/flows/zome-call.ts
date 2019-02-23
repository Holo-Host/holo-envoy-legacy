
import {Instance, CallRequest, CallResponse} from '../types'
import {errorResponse, fail} from '../common'


export default client => async ({agent, happId, dnaHash, function: func, params}: CallRequest) => {
  let instance = await lookupInstance(client)({dnaHash, agent})
  console.log('instance found: ', instance)
  if (instance) {
    const method = `${instance.id}/${func}`
    const result = await client.call(method, params).catch(fail)
    console.log('result: ', result)
    return result
  } else {
    return errorResponse("No instance found")
  }
}

const lookupInstance = client => async ({dnaHash, agent}): Promise<Instance | null> => {
  const instances = await client.call('info/instances').catch(fail)
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dnaHash === dnaHash && inst.agent === agent) || null
}
