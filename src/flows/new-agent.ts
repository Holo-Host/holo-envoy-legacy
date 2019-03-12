
import {Instance, HappID} from '../types'
import {errorResponse, fail, InstanceIds, agentIdFromKey, zomeCallByInstance} from '../common'
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
}: NewAgentRequest, _ws): Promise<NewAgentResponse> => {
  // const enabledApps = await zomeCallByInstance(adminClient, {
  //   instanceId: 'holo-hosting-instance-TODO-real-id', 
  //   func: 'host/get_enabled_app',
  //   params: {}
  // })
  // if (enabledApps.find(app => console.log(`TODO check if app is enabled`, app))) {
    await createAgent(adminClient, agentId)
    await setupInstances(adminClient, {happId, agentId: agentIdFromKey(agentId), conductorInterface: ConductorInterface.Public})
  // } else {
  //   throw `App is not enabled for hosting: ${happId}`
  // }
}


export const createAgent = async (adminClient, agentId) => {
  // TODO: pick different id / name, or leave as agent public address?
  // TODO: deal with it if agent already exists (due to being hosted by another app)
  await adminClient.call('admin/agent/add', {
    id: agentId,
    name: agentId,
    public_address: agentId,
    key_file: 'IGNORED',
    holo_remote_key: true,
  })
}