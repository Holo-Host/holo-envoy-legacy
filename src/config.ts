import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import {nickDatabase} from './shims/nick-database'

const devUI = process.env.INTRCEPTR_UI || ""

if (devUI) {
  console.log("Using dev UI hash: ", devUI)
}

export const defaultEnvoyHome = process.env.INTRCEPTR_PATH || path.join(os.homedir(), '.holochain/holo')
export const conductorConfigPath = (dir?) => path.join(dir || defaultEnvoyHome, 'conductor-config.toml')
export const uiStorageDir = (dir?) => path.join(dir || defaultEnvoyHome, 'ui-store', devUI)
export const chainStorageDir = (dir?) => path.join(dir || defaultEnvoyHome, 'storage')

export const testKeyDir = path.join(os.tmpdir(), 'holo-envoy', 'test-keydata')
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
export const keyConfigFile = 'src/shims/envoy-host-key.json'

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
  // Actual server ports, visible outside of this machine
  external: 48080,
  admin: 9999,

  // These will eventually go away
  wormhole: 8888,
  shim: 5555,

  // Websocket ports, interfaces into the running conductor
  masterInterface: 1111,
  publicInterface: 2222,
  internalInterface: 3333,
}

export const getNickByDna = dnaHash => {
  const coreApp = Object.values(DNAS).find(entry => entry.hash === dnaHash)
  const externalApp = nickDatabase.find(entry => Boolean(entry.knownDnaHashes.find(hash => hash === dnaHash)))
  return coreApp ? coreApp.nick : externalApp ? externalApp.nick : null
}