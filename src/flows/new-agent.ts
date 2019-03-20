
import {Instance, HappID} from '../types'
import {callWhenConnected, errorResponse, fail, zomeCallByInstance} from '../common'
import {ConductorInterface} from '../config'
import * as Config from '../config'
import {setupInstances} from './install-happ'


export type NewAgentRequest = {
  agentId: string,
  happId: HappID,
  signature: string,
}

export type NewAgentResponse = void

export default (masterClient) => async ({
  agentId,
  happId,
  signature,
}: NewAgentRequest): Promise<NewAgentResponse> => {
  const enabledApps = await zomeCallByInstance(masterClient, {
    instanceId: Config.holoHostingAppId,
    zomeName: 'host',
    funcName: 'get_enabled_app',
    params: {}
  })
  if (enabledApps.find(app => app.address === happId)) {
    await createAgent(masterClient, agentId)
    await setupInstances(masterClient, {happId, agentId, conductorInterface: ConductorInterface.Public})
  } else {
    throw `App is not enabled for hosting: ${happId}`
  }
}


export const createAgent = async (masterClient, agentId): Promise<void> => {
  // TODO: pick different id / name, or leave as agent public address?
  // TODO: deal with it if agent already exists (due to being hosted by another app)

  const agents = await callWhenConnected(masterClient, 'admin/agent/list', {})
  if (agents.find(agent => agent.id === agentId)) {
    console.warn(`Agent ${agentId} already exists, skipping...`)
  } else {
    await callWhenConnected(masterClient, 'admin/agent/add', {
      id: agentId,
      name: agentId,
      public_address: agentId,
      key_file: 'IGNORED',
      holo_remote_key: true,
    })
  }
}
