
import * as C from '../config'
import {zomeCallByInstance} from '../common'


export const registerHapp = (client, {uiHash, dnaHashes}) => {
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

export const enableHapp = (client, happId) => {
  return zomeCallByInstance(client, {
    instanceId: C.holoHostingAppId,
    zomeName: 'host',
    funcName: 'enable_app',
    params: {
      app_hash: happId
    }
  })
}
