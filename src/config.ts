import * as path from 'path'
import {homedir} from 'os'

export const conductorConfigDir = path.join(homedir(), '.holochain/holo')
export const conductorConfigPath = path.join(conductorConfigDir, 'conductor-config.toml')

export const hostAgentId = 'host-agent'
export const keyConfigFile = 'src/shims/intrceptr-host-key.json'

export enum ConductorInterface {
  Master = 'master-interface',
  Public = 'public-interface',
  Internal = 'internal-interface',
}

export const DNAS = {
  serviceLogger: {
    path: 'src/dnas/servicelogger/dist/servicelogger.dna.json',
    hash: 'QmSfVCAibdfEAACx7UZ7kgTBKrDSKmBUrbKgTYMweN8frQ',
  }
}

export const PORTS = {
  wormhole: 8888,
  admin: 9999,
  shim: 3333,
  ui: 7000,
  intrceptr: 3000,
  masterInterface: 7777,
  publicInterface: 4444,
  internalInterface: 2222,
}

export const serviceLoggerInstanceId = hostedHappId => `servicelogger-${hostedHappId}`