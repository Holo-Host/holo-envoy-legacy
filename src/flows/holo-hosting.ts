
import * as C from '../config'
import {zomeCallByInstance} from '../common'
import {HappEntry} from '../types'

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

  createAndRegisterHapp: async (client, entry: HappEntry) => {

    if (entry.dnas.length != 1) {
      throw "hApp Store currently only supports exactly one DNA per hApp."
    }

    if (!entry.ui) {
      throw "hApp Store currently requires all hApps to have a UI specified"
    }

    const dna = entry.dnas[0]
    const ui = entry.ui

    const title = "TODO"
    const description = "TODO"
    const thumbnail_url = "TODO.gif"
    const homepage_url = "TODO.com"

    const happHash = await zomeCallByInstance(client, {
      instanceId: C.happStoreId.instance,
      zomeName: 'happs',
      funcName: 'create_app',
      params: {
        title, description, thumbnail_url, homepage_url,
        ui_url: ui!.location || "",
        dna_url: dna.location,
      }
    })

    const dns_name = "TODO.whatever.xyz"

    return zomeCallByInstance(client, {
      instanceId: C.holoHostingAppId.instance,
      zomeName: 'provider',
      funcName: 'register_app',
      params: {
        app_bundle: {
          happ_hash: happHash
        },
        domain_name: { dns_name },
      }
    })
  }
}
