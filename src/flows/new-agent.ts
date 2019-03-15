
import {Instance, HappID} from '../types'
import {callWhenConnected, errorResponse, fail, InstanceIds, zomeCallByInstance} from '../common'
import {ConductorInterface} from '../config'
import {setupInstances} from './install-happ'


export type NewAgentRequest = {
  agentId: string,
  happId: HappID,
  signature: string,
}

export type NewAgentResponse = void

export default (adminClient) => async ({
  agentId, 
  happId, 
  signature,
}: NewAgentRequest): Promise<NewAgentResponse> => {
  // const enabledApps = await zomeCallByInstance(adminClient, {
  //   instanceId: 'holo-hosting-instance-TODO-real-id', 
  //   func: 'host/get_enabled_app',
  //   params: {}
  // })
  // if (enabledApps.find(app => console.log(`TODO check if app is enabled`, app))) {
    await createAgent(adminClient, agentId)
    await setupInstances(adminClient, {happId, agentId, conductorInterface: ConductorInterface.Public})
  // } else {
  //   throw `App is not enabled for hosting: ${happId}`
  // }
}


export const createAgent = async (adminClient, agentId) => {
  // TODO: pick different id / name, or leave as agent public address?
  // TODO: deal with it if agent already exists (due to being hosted by another app)
  await callWhenConnected(adminClient, 'admin/agent/add', {
    id: agentId,
    name: agentId,
    public_address: agentId,
    key_file: 'IGNORED',
    holo_remote_key: true,
  })
}