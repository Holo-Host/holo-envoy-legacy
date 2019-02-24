
import {spawn} from 'child_process'
import * as fs from 'fs'
import * as C from './config'


export const initializeConductorConfig = () => {
  console.log("Creating conductor config at: ", C.conductorConfigPath)
  try {
    fs.mkdirSync(C.conductorConfigDir, {recursive: true})
  } catch(e) {}
  let toml = initialTomlConfig()
  fs.writeFileSync(C.conductorConfigPath, toml)  
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
  const {keyFile, publicAddress} = JSON.parse(fs.readFileSync('shims/intrceptr-host-key.json', 'utf8'))


  // TODO: add DNAs for
  // - signed service logs
  // - holo hosting
  // - HCHC

  return `
dnas = []
bridges = []

persistence_dir = "${C.conductorConfigDir}"

[[agents]]
id = "host-agent"
key_file = "${keyFile}"
name = "Intrceptr Host"
public_address = "${publicAddress}"

[[interfaces]]
admin = true
id = "admin-interface"

[interfaces.driver]
port = 8888
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