import * as path from 'path'
import {homedir} from 'os'

const devUI = process.env.INTRCEPTR_UI || ""
if (devUI) {
  console.log("Using dev UI hash: ", devUI)
}

export const conductorConfigDir = path.join(homedir(), '.holochain/holo')
export const conductorConfigPath = path.join(conductorConfigDir, 'conductor-config.toml')
export const uiStorageDir = path.join(conductorConfigDir, 'ui-store', devUI)

export const hostAgentId = 'host-agent'
export const holoHostingAppId = 'holo-hosting-app'
export const keyConfigFile = 'src/shims/intrceptr-host-key.json'

export enum ConductorInterface {
  Master = 'master-interface',
  Public = 'public-interface',
  Internal = 'internal-interface',
}

export const DNAS = {
  serviceLogger: {
    path: 'src/dnas/servicelogger/dist/servicelogger.dna.json',
    hash: 'QmUtZhnVQ4tAjdKmjuEibRwF12ejoXJ2iERcBzPRc3KPRP',
  },
  holoHosting: {
    path: 'src/dnas/Holo-Hosting-App/dna-src/dist/dna-src.dna.json',
    hash: 'QmXuPFimMCoYQrXqX9vr1vve8JtpQ7smfkw1LugqEhyWTr',
  }
}

export const PORTS = {
  wormhole: 8888,
  admin: 9999,
  shim: 3333,
  intrceptr: 3000,
  masterInterface: 7777,
  publicInterface: 4444,
  internalInterface: 2222,
}
