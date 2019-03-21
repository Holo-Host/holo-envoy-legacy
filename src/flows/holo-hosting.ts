
import * as C from '../config'
import {zomeCallByInstance} from '../common'


export const registerApp = (client, {uiHash, dnaHashes}) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId,
    zomeName: 'provider',
    funcName: 'register_app',
    params: {
      ui_hash: uiHash || "",
      dna_list: dnaHashes,
    }
  })
}

export const enableApp = (client, happId) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId,
    zomeName: 'host',
    funcName: 'enable_app',
    params: {
      app_hash: happId
    }
  })
}
