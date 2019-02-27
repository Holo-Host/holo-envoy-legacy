
import * as path from 'path'
import {homedir} from 'os'

export const conductorConfigDir = path.join(homedir(), '.holochain/holo')
export const conductorConfigPath = path.join(conductorConfigDir, 'conductor-config.toml')

export const hostAgentId = 'host-agent'

export const PORTS = {
  wormhole: 8888,
  shim: 3333,
  ui: 7000,
  intrceptr: 3000,
  adminInterface: 7777,
}