
import * as C from '../config'
import {zomeCallByInstance} from '../common'

export const enableHapp = (client, happId) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId.instance,
    zomeName: 'host',
    funcName: 'enable_app',
    params: {
      app_hash: happId
    }
  })
}

export const disableHapp = (client, happId) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId.instance,
    zomeName: 'host',
    funcName: 'disable_app',
    params: {
      app_hash: happId
    }
  })
}

export const registerAsHost = (client) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId.instance,
    zomeName: 'host',
    funcName: 'register_as_host',
    params: {
      host_doc: {
        kyc_proof: "TODO this proves nothing",
      }
    }
  })
}

export const SHIMS = {

  registerAsProvider: (client) => {
    return zomeCallByInstance(client, {
      instanceId: C.holoHostingAppId.instance,
      zomeName: 'provider',
      funcName: 'register_as_provider',
      params: {
        provider_doc: {
          kyc_proof: "TODO this proves nothing",
        }
      }
    })
  },

  registerHapp: (client, {uiHash, dnaHashes}) => {
    return zomeCallByInstance(client, {
      instanceId: C.holoHostingAppId.instance,
      zomeName: 'provider',
      funcName: 'register_app',
      params: {
        ui_hash: uiHash || "",
        dna_list: dnaHashes,
      }
    })
  }
}
