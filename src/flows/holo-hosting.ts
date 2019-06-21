
import * as C from '../config'
import {zomeCallByInstance} from '../common'
import {HappStoreEntry} from '../types'

export const enableHapp = (client, happId) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId.instance,
    zomeName: 'host',
    funcName: 'enable_app',
    args: {
      app_hash: happId
    }
  })
}

export const disableHapp = (client, happId) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId.instance,
    zomeName: 'host',
    funcName: 'disable_app',
    args: {
      app_hash: happId
    }
  })
}

export const registerAsHost = (client) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId.instance,
    zomeName: 'host',
    funcName: 'register_as_host',
    args: {
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
      args: {
        provider_doc: {
          kyc_proof: "TODO this proves nothing",
        }
      }
    })
  },

  createAndRegisterHapp: async (client, entry: HappStoreEntry) => {
    const title = "TODO"
    const description = "TODO"
    const thumbnail_url = "TODO.gif"
    const homepage_url = "TODO.com"

    const happHash = await zomeCallByInstance(client, {
      instanceId: C.happStoreId.instance,
      zomeName: 'happs',
      funcName: 'create_app',
      args: {
        title, description, thumbnail_url, homepage_url,
        ui: entry.ui,
        dnas: entry.dnas,
      }
    })

    const dns_name = "TODO.whatever.xyz"

    return zomeCallByInstance(client, {
      instanceId: C.holoHostingAppId.instance,
      zomeName: 'provider',
      funcName: 'register_app',
      args: {
        app_bundle: {
          happ_hash: happHash
        },
        domain_name: { dns_name },
      }
    })
  }
}
