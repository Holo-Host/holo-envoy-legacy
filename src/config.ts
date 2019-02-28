import * as path from 'path'
import {homedir} from 'os'

export const conductorConfigDir = path.join(homedir(), '.holochain/holo')
export const conductorConfigPath = path.join(conductorConfigDir, 'conductor-config.toml')

export const hostAgentId = 'host-agent'
export const happInterfaceId = 'happ-interface'
export const adminInterfaceId = 'admin-interface'

export const PORTS = {
  wormhole: 8888,
  shim: 3333,
  ui: 7000,
  intrceptr: 3000,
  adminInterface: 7777,
  happInterface: 4444,
}
