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

type UserConfig = {
  resources: ResourceConfig
}

/**
 * @deprecated
 */
type DnaConfigMap = {[handle: string]: DnaConfig}

const testUserConfig: UserConfig = {
  resources: {
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
}

const updateDnaConfigToUserConfig = (config: DnaConfigMap): UserConfig => {
  const newConfig = {} as ResourceConfig
  Object.entries(config).forEach(([name, c]) => {
    newConfig[name] = {
      dna: {
        path: c.path
      }
    }
  })
  return {resources: newConfig}
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
 * Read the user-config.ts file, with the ability to
 * @type {[type]}
 */
const readUserConfig = (): UserConfig => {

  let readUserConfigCount = 0
  const run = (): UserConfig => {
    if (++readUserConfigCount > 2) {
      console.error("Could not auto-create user-config.ts file, or remove dna-config.ts and create user-config.ts yourself")
      process.exit(-1)
    }
    try {
      // Load core DNA paths from special untracked file
      return require('./user-config').default
    } catch (e) {
      // In CI tests, we won't have this file, so just use a dummy object
      if (testMode) {
        return testUserConfig
      } else {
        const oudatedDnaConfig = readOutdatedDnaConfig()
        if (outdatedDnaConfig) {
          const userConfig = updateDnaConfigToUserConfig(outdatedDnaConfig)
          userConfig.resources.happStore.ui = {
            path: '<<FILL ME IN>>',
            port: 8880,
          }
          userConfig.resources.holoHosting.ui = {
            path: '<<FILL ME IN>>',
            port: 8800,
          }
          const userConfigPath = path.join(__dirname, 'user-config.ts')
          const contents = `
export default ${JSON.stringify(userConfig, null, 2)}


// YOU MAY DELETE EVERYTHING BELOW THIS LINE
// Be sure to fill in the blanks for the UI paths above!


// Automatically migrated original DNA config, listed below for safety.
const portedConfig = ${JSON.stringify(outdatedDnaConfig, null, 2)}

`
          fs.writeFileSync(userConfigPath, contents)
          console.log()
          console.log("----------------------------------------------------------------------------")
          console.log("Deprecated dna-config.ts file found, moving info over to user-config.ts")
          console.log("Be sure to update your user-config.ts to include UI paths!")
          console.log("Deleting your dna-config.ts file now...")
          console.log("----------------------------------------------------------------------------")
          console.log()

          const outdatedDnaConfigPath = path.join(__dirname, 'dna-config.ts')
          fs.unlinkSync(outdatedDnaConfigPath)

          return run()
        }
        console.error(`You must provide a src/config/user-config.ts file pointing to the core DNA packages.
    Example:

    export default ${JSON.stringify(testUserConfig)}
      `)
        return process.exit(-1)
      }
    }
  }

  return run()
}

export const RESOURCES: ResourceConfig = readUserConfig().resources

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
  // **TODO** Removed core app check, because core apps no longer reference their hashes!
  // Only look in nickDatabase. Make sure this is still correct:
  const externalApp = nickDatabase.find(entry => Boolean(entry.knownDnaHashes.find(hash => hash === dnaHash)))
  return externalApp ? externalApp.nick : null
}
