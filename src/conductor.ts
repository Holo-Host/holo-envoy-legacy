
import {spawn} from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'
import * as C from './config'


export const initializeConductorConfig = () => {
  console.log("Creating conductor config at: ", C.conductorConfigPath)
  try {
    fs.mkdirSync(C.conductorConfigDir, {recursive: true})
  } catch(e) {}
  let toml = initialTomlConfig()
  fs.writeFileSync(C.conductorConfigPath, toml)
}

export const cleanConductorStorage = () => {
  rimraf.sync(path.join(C.conductorConfigDir, 'storage'))
}

export const spawnConductor = () => {
  const conductor = spawn('holochain', ['-c', C.conductorConfigPath])
  conductor.stdout.on('data', data => console.log('(HC)', data))
  conductor.stderr.on('data', data => console.error('(HC) <E>', data))
  conductor.on('close', code => console.log('Conductor closed with code: ', code))
}

const initialTomlConfig = () => {

  // TODO: generate key here and use generated key path
  // this is temporary hard-coded config for now
  const {keyFile, publicAddress} = JSON.parse(fs.readFileSync(C.keyConfigFile, 'utf8'))


  // TODO: add DNAs for
  // - signed service logs
  // - holo hosting
  // - HCHC

  return `
dnas = []
bridges = []

persistence_dir = "${C.conductorConfigDir}"
signing_service_uri = "http://localhost:${C.PORTS.wormhole}"

[[agents]]
id = "${C.hostAgentId}"
name = "Intrceptr Host"
key_file = "${keyFile}"  # ignored due to holo_remote_key
public_address = "${publicAddress}"

[[interfaces]]
id = "${C.ConductorInterface.Master}"
admin = true

[interfaces.driver]
port = ${C.PORTS.masterInterface}
type = "websocket"

[[interfaces]]
id = "${C.ConductorInterface.Public}"

[interfaces.driver]
port = ${C.PORTS.publicInterface}
type = "websocket"

[[interfaces]]
id = "${C.ConductorInterface.Internal}"

[interfaces.driver]
port = ${C.PORTS.internalInterface}
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
