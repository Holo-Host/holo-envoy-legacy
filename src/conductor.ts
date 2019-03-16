
import {spawn} from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'
import * as Config from './config'
import * as H from './flows/install-happ'


export const initializeConductorConfig = () => {
  console.log("Creating conductor config at: ", Config.conductorConfigPath)
  try {
    fs.mkdirSync(Config.conductorConfigDir, {recursive: true})
  } catch(e) {}
  let toml = initialTomlConfig()
  fs.writeFileSync(Config.conductorConfigPath, toml)
}

export const cleanConductorStorage = () => {
  rimraf.sync(path.join(Config.conductorConfigDir, 'storage'))
}

export const installHoloHostingApp = async (masterClient) => {
  const {hash, path} = Config.DNAS.holoHosting
  const instanceId = Config.holoHostingAppId
  const agentId = Config.hostAgentId
  console.log(`Installing Holo Hosting App from ${path}...`)
  await H.installDna(masterClient, {hash, path, properties: null})
  await H.setupInstance(masterClient, {
    instanceId,
    dnaId: hash,
    agentId,
    conductorInterface: Config.ConductorInterface.Master
  })
  console.log("HHA installation complete!")
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


  // TODO: add DNAs for
  // - signed service logs
  // - holo hosting
  // - HCHC

  return `
dnas = []
bridges = []

persistence_dir = "${Config.conductorConfigDir}"
signing_service_uri = "http://localhost:${Config.PORTS.wormhole}"

[[agents]]
id = "${Config.hostAgentId}"
name = "Intrceptr Host"
key_file = "${keyFile}"  # ignored due to holo_remote_key
public_address = "${publicAddress}"

[[interfaces]]
id = "${Config.ConductorInterface.Master}"
admin = true

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
