import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import {nickDatabase} from '../shims/nick-database'

export const devUI = process.env.ENVOY_UI || ""
const testMode = Boolean(process.env.ENVOY_TEST)

if (devUI) {
  console.log("Using dev UI hash: ", devUI)
}

type DnaConfig = {
  path: string,
  hash: string,
}

export const defaultEnvoyHome = process.env.ENVOY_PATH || path.join(os.homedir(), '.holochain/holo')
export const conductorConfigPath = (dir?) => path.join(dir || defaultEnvoyHome, 'conductor-config.toml')
export const uiStorageDir = (dir?) => path.join(dir || defaultEnvoyHome, 'ui-store')
export const chainStorageDir = (dir?) => path.join(dir || defaultEnvoyHome, 'storage')

export const testKeyDir = path.join(os.tmpdir(), 'holo-envoy', 'test-keydata')
export const testKeybundlePath = path.join(testKeyDir, 'keybundle.json')
export const testAgentAddressPath = path.join(testKeyDir, 'ENVOY_AGENT_ADDRESS')
export const testKeyPassphrase = ''  // TODO: can go away once `hc keygen --nullpass` fully works

export const hostAgentName = 'host-agent'
export const holoHostingAppId = {
  instance: 'holo-hosting-app',
  dna: 'holo-hosting-app',
}
export const happStoreId = {
  instance: 'happ-store',
  dna: 'happ-store',
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

let dnaConfig
try {
  // Load core DNA paths from special untracked file
  dnaConfig = require('./dna-config').default
} catch (e) {
  // In CI tests, we won't have this file, so just use a dummy object
  if (testMode) {
    dnaConfig = {
      serviceLogger: {
        path: '/home/lisa/Documents/gitrepos/holochain/holo/envoy-intrceptr/envoy/src/dnas/servicelogger/dist/servicelogger.dna.json'
      },
      holoHosting: {
        path: '/home/lisa/Documents/gitrepos/holochain/holo/holo-hosting/Holo-Hosting-App/dna-src/dist/HoloHostingApp.dna.json'
      },
      holofuel: {
        path: '/home/lisa/Documents/gitrepos/holochain/holo/envoy-intrceptr/envoy/src/dnas/holofuel/dist/holofuel.dna.json'
      },
      happStore: {
        path: '/home/lisa/Documents/gitrepos/holochain/holo/simulation-holo/HApps-Store/dna/happ-store.dna.json'
      }
    }
  } else {
    console.error(`You must provide a src/config/dna-config.ts file pointing to the core DNA packages.
Example:

export default {
  serviceLogger: {
    path: '/home/lisa/happs/servicelogger/dist/servicelogger.dna.json'
  },
  holoHosting: {
    path: '/home/lisa/happs/Holo-Hosting-App/dna-src/dist/dna-src.dna.json'
  },
  holofuel: {
    path: '/home/lisa/happs/holofuel/dist/holofuel.dna.json'
  },
  happStore: {
    path: '/home/lisa/happs/happs-store/dist/happs-store.dna.json'
  },
}
  `)
    process.exit(-1)
  }
}

export const DNAS: {[handle: string]: DnaConfig} = dnaConfig

// The nicknames are a temporary thing, to complement the nicknames in
// `src/shims/nick-database`. They'll go away when we have "app bundles".
const dnaNicks = {
  servicelogger: 'servicelogger',
  holoHosting: 'holo-hosting-app',
  holofuel: 'holofuel',
  happStore: 'happ-store',
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

// Get the nick for a DNA from either
// - the `dnaNicks` object above, if a core DNA
// - or the nickDatabase, if a DNA from the app store
export const getNickByDna = dnaHash => {
  const coreApp = Object.entries(DNAS).find(entry => entry[1].hash === dnaHash)
  const externalApp = nickDatabase.find(entry => Boolean(entry.knownDnaHashes.find(hash => hash === dnaHash)))
  return coreApp ? dnaNicks[coreApp[0]] : externalApp ? externalApp.nick : null
}
