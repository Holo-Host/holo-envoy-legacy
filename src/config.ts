
import * as path from 'path'
import {homedir} from 'os'

export const conductorConfigDir = path.join(homedir(), '.holochain/holo')
export const conductorConfigPath = path.join(conductorConfigDir, 'conductor-config.toml')

