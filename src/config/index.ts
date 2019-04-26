import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
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

/**
 * @deprecated
 */
type DnaConfig = {
  path: string,
}

type UiConfig = {
  path: string,
  port: number,
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

/**
 * @deprecated
 */
type DnaConfigMap = {[handle: string]: DnaConfig}

const testResourceConfig: ResourceConfig = {
  serviceLogger: {
    dna: {
      path: '/path/to/happs/servicelogger/dist/servicelogger.dna.json',
    }
  },
  holofuel: {
    dna: {
      path: '/path/to/happs/holofuel/dist/holofuel.dna.json',
    }
  },
  holoHosting: {
    dna: {
      path: '/path/to/happs/Holo-Hosting-App/dna-src/dist/dna-src.dna.json',
    },
    ui: {
      path: '/path/to/happs/holo-hosting-app_GUI/ui',
      port: 8800,
    },
  },
  happStore: {
    dna: {
      path: '/path/to/happs/HApps-Store/dna-src/dist/dna-src.dna.json',
    },
    ui: {
      path: '/path/to/happs/HApps-Store/ui',
      port: 8880,
    },
  }
}

const updateDnaConfigToResourceConfig = (config: DnaConfigMap): ResourceConfig => {
  const newConfig = {} as ResourceConfig
  Object.entries(config).forEach(([name, c]) => {
    newConfig[name] = {
      dna: {
        path: c.path
      }
    }
  })
  return newConfig
}

let outdatedDnaConfig

try {
  outdatedDnaConfig = require('./dna-config').default
} catch {
  console.info("")
}

const readOutdatedDnaConfig = (): (DnaConfigMap | null) => {
  try {
    return require('./dna-config').default
  } catch {
    return null
  }
}

/**
 * Read the resource-config.ts file, with the ability to
 * @type {[type]}
 */
const readResourceConfig = () => {

  let readResourceConfigCount = 0
  const run = (): ResourceConfig => {
    if (++readResourceConfigCount > 2) {
      console.error("Could not auto-create resource-config.ts file, or remove dna-config.ts and create resource-config.ts yourself")
      process.exit(-1)
    }
    try {
      // Load core DNA paths from special untracked file
      return require('./resource-config').default
    } catch (e) {
      // In CI tests, we won't have this file, so just use a dummy object
      if (testMode) {
        return testResourceConfig
      } else {
        const oudatedDnaConfig = readOutdatedDnaConfig()
        if (outdatedDnaConfig) {
          const resourceConfig = updateDnaConfigToResourceConfig(outdatedDnaConfig)
          resourceConfig.happStore.ui = {
            path: '<<FILL ME IN>>',
            port: 8880,
          }
          resourceConfig.holoHosting.ui = {
            path: '<<FILL ME IN>>',
            port: 8800,
          }
          const resourceConfigPath = path.join(__dirname, 'resource-config.ts')
          const contents = `
// Be sure to fill in the blanks for the UI paths!
export default ${JSON.stringify(resourceConfig, null, 2)}

// Automatically ported from original DNA config. You may delete this.
const portedConfig = ${JSON.stringify(outdatedDnaConfig, null, 2)}

`
          fs.writeFileSync(resourceConfigPath, contents)
          console.log()
          console.log("----------------------------------------------------------------------------")
          console.log("Deprecated dna-config.ts file found, moving info over to resource-config.ts")
          console.log("Be sure to update your resource-config.ts to include UI paths!")
          console.log("Deleting your dna-config.ts file now...")
          console.log("----------------------------------------------------------------------------")
          console.log()

          const outdatedDnaConfigPath = path.join(__dirname, 'dna-config.ts')
          fs.unlinkSync(outdatedDnaConfigPath)

          return run()
        }
        console.error(`You must provide a src/config/resource-config.ts file pointing to the core DNA packages.
    Example:

    export default ${JSON.stringify(testResourceConfig)}
      `)
        return process.exit(-1)
      }
    }
  }

  return run()
}

export const RESOURCES: ResourceConfig = readResourceConfig()

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
  const coreApp = Object.entries(RESOURCES).find(entry => entry[1].hash === dnaHash)
  const externalApp = nickDatabase.find(entry => Boolean(entry.knownDnaHashes.find(hash => hash === dnaHash)))
  return coreApp ? dnaNicks[coreApp[0]] : externalApp ? externalApp.nick : null
}
