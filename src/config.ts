import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const devUI = process.env.INTRCEPTR_UI || ""

if (devUI) {
  console.log("Using dev UI hash: ", devUI)
}

export const defaultIntrceptrHome = process.env.INTRCEPTR_PATH || path.join(os.homedir(), '.holochain/holo')
export const conductorConfigPath = (dir?) => path.join(dir || defaultIntrceptrHome, 'conductor-config.toml')
export const uiStorageDir = (dir?) => path.join(dir || defaultIntrceptrHome, 'ui-store', devUI)
export const chainStorageDir = (dir?) => path.join(dir || defaultIntrceptrHome, 'storage')

export const testKeyDir = path.join(os.tmpdir(), 'holo-intrceptr', 'test-keydata')
export const testKeybundlePath = path.join(testKeyDir, 'keybundle.json')
export const testAgentAddressPath = path.join(testKeyDir, 'INTRCEPTR_AGENT_ADDRESS')
export const testKeyPassphrase = ''  // TODO: can go away once `hc keygen --nullpass` fully works

export const hostAgentName = 'host-agent'
export const holoHostingAppId = {
  instance: 'holo-hosting-app',
  dna: 'holo-hosting-app',
}
export const holofuelId = {
  instance: 'holofuel',
  dna: 'holofuel',
}
export const keyConfigFile = 'src/shims/intrceptr-host-key.json'

export enum ConductorInterface {
  Master = 'master-interface',
  Public = 'public-interface',
  Internal = 'internal-interface',
}

export const DNAS = {
  serviceLogger: {
    path: 'src/dnas/servicelogger/dist/servicelogger.dna.json',
    hash: 'QmQVBMotvRcGD28kr3XJ7LvMfzEqpBfNi3DoCLP6wqr8As',
    nick: 'servicelogger'
  },
  holoHosting: {
    path: 'src/dnas/Holo-Hosting-App/dna-src/dist/dna-src.dna.json',
    hash: 'QmXuPFimMCoYQrXqX9vr1vve8JtpQ7smfkw1LugqEhyWTr',
    nick: 'holo-hosting-app'
  },
  holofuel: {
    path: 'src/dnas/holofuel/dist/holofuel.dna.json',
    hash: 'QmNzGsdcvMymfbToJSNb8891XMzfF6QJAgZKX5HvakDHAp',
    nick: 'holofuel'
  },
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

export const getNickByDna = dnaHash => {
  const found = Object.values(DNAS).find(dna => dna.hash === dnaHash)
  return found ? found.nick : null
}