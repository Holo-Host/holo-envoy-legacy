import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import _ from 'lodash'
import {nickDatabase} from '../shims/nick-database'

export const devUI = process.env.ENVOY_UI || ""
const testMode = Boolean(process.env.ENVOY_TEST)

if (devUI) {
  console.log("Using hApp ID for dev UI: ", devUI)
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

type DnaConfig = {
  location: string,
  path: string,
}

type UiConfig = {
  location: string,
  path: string,
  port: number,
}

type DependencyConfig = {
  holochainVersion: string,
  resources: ResourceConfig
}

type ResourceConfig = {
  serviceLogger: {
    dna: DnaConfig
  },
  holofuel: {
    dna: DnaConfig
  },
  holoHosting: {
    dna: DnaConfig,
    ui: UiConfig,
  },
  happStore: {
    dna: DnaConfig,
    ui: UiConfig,
  }
}

type UserConfig = {
  resources: ResourceConfig
}

export const resourcePath = path.join(__dirname, './.envoy-deps')

export const DEPENDENCIES: DependencyConfig = require('./dependencies').default(resourcePath)

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

// Get the nick for a DNA from the nickDatabase (another hack), if a DNA from the app store.
// TODO: remove once we have proper app bundles with handles for DNAs
export const getNickByDna = dnaHash => {
  const externalApp = nickDatabase.find(entry => Boolean(entry.knownDnaHashes.find(hash => hash === dnaHash)))
  return externalApp ? externalApp.nick : null
}
