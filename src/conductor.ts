
import {spawn} from 'child_process'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as rimraf from 'rimraf'
import * as Config from './config'


export const initializeConductorConfig = () => {
  console.log("Creating conductor config at: ", Config.conductorConfigPath)
  try {
    fs.mkdirSync(Config.conductorConfigDir, {recursive: true})
  } catch(e) {}
  try {
    fs.mkdirSync(Config.uiStorageDir, {recursive: true})
  } catch(e) {}
  let toml = initialTomlConfig()
  fs.writeFileSync(Config.conductorConfigPath, toml)
}

export const cleanConductorStorage = () => {
  rimraf.sync(path.join(Config.conductorConfigDir, 'storage'))
  rimraf.sync(Config.uiStorageDir)
}

export const spawnConductor = () => {
  const conductor = spawn('holochain', ['-c', Config.conductorConfigPath])
  conductor.stdout.on('data', data => console.log('(HC)', data))
  conductor.stderr.on('data', data => console.error('(HC) <E>', data))
  conductor.on('close', code => console.log('Conductor closed with code: ', code))
}

const initialTomlConfig = () => {

  // TODO: generate key here and use generated key path
  // this is temporary hard-coded config for now
  const {keyFile, publicAddress} = JSON.parse(fs.readFileSync(Config.keyConfigFile, 'utf8'))

  // TODO: add DNA for HCHC when available
  return `
bridges = []

persistence_dir = "${Config.conductorConfigDir}"
signing_service_uri = "http://localhost:${Config.PORTS.wormhole}"

[[agents]]
id = "${Config.hostAgentId}"
name = "Intrceptr Host"
keystore_file = "${keyFile}"
public_address = "${publicAddress}"

[[dnas]]
file = "${Config.DNAS.holoHosting.path}"
hash = "${Config.DNAS.holoHosting.hash}"
id = "${Config.DNAS.holoHosting.hash}"

[[instances]]
agent = "${Config.hostAgentId}"
dna = "${Config.DNAS.holoHosting.hash}"
id = "${Config.holoHostingAppId}"

[instances.storage]
path = "${path.join(Config.conductorConfigDir, 'storage', Config.holoHostingAppId)}"
type = "file"

[[interfaces]]
id = "${Config.ConductorInterface.Master}"
admin = true

[[interfaces.instances]]
id = "${Config.holoHostingAppId}"

[interfaces.driver]
port = ${Config.PORTS.masterInterface}
type = "websocket"

[[interfaces]]
id = "${Config.ConductorInterface.Public}"

[interfaces.driver]
port = ${Config.PORTS.publicInterface}
type = "websocket"

[[interfaces]]
id = "${Config.ConductorInterface.Internal}"

[interfaces.driver]
port = ${Config.PORTS.internalInterface}
type = "websocket"

[logger]
type = "debug"
[[logger.rules.rules]]
color = "red"
exclude = false
pattern = "^err/"

[[logger.rules.rules]]
color = "white"
exclude = false
pattern = "^debug/dna"

[[logger.rules.rules]]
exclude = false
pattern = ".*"
`
}
