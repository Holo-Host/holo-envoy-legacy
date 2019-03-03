
import {Instance, HappID} from '../types'
import {errorResponse, fail, InstanceIds, agentIdFromKey} from '../common'
import {setupInstances} from './install-happ'


export type NewAgentRequest = {
  agentKey: string,
  happId: HappID,
  signature: string,
}

export type NewAgentResponse = void

export default (adminClient) => async ({
  agentKey, 
  happId, 
  signature,
}: NewAgentRequest, _ws): Promise<NewAgentResponse> => {
  await createAgent(adminClient, agentKey)
  await setupInstances(adminClient, {happId, agentId: agentIdFromKey(agentKey)})
}


export const createAgent = async (adminClient, agentKey) => {
  // TODO: pick different id / name, or leave as agent public address?
  // TODO: deal with it if agent already exists (due to being hosted by another app)
  await adminClient.call('admin/agent/add', {
    id: agentKey,
    name: agentKey,
    public_address: agentKey,
    key_file: 'IGNORED',
    holo_remote_key: true,
  })
}