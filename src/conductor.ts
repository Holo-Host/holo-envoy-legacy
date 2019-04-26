
import {spawn, execSync} from 'child_process'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as rimraf from 'rimraf'
import * as Config from './config'


export const cleanConductorStorage = (baseDir) => {
  rimraf.sync(Config.chainStorageDir(baseDir))
  rimraf.sync(Config.uiStorageDir(baseDir))
}

export const initializeConductorConfig = (baseDir, keyData) => {
  console.log("Creating conductor config at: ", Config.conductorConfigPath(baseDir))
  try {
    fs.mkdirSync(baseDir, {recursive: true})
  } catch(e) {}
  try {
    fs.mkdirSync(Config.chainStorageDir(baseDir), {recursive: true})
    fs.mkdirSync(Config.uiStorageDir(baseDir), {recursive: true})
  } catch(e) {}
  let toml = initialTomlConfig(baseDir, keyData)
  fs.writeFileSync(Config.conductorConfigPath(baseDir), toml)
}

export const keygen = (bundlePath?) => {
  const extraArgs = bundlePath ? `--path ${bundlePath}` : ''

  // TODO: use nullpass once it works, no stdin required, i.e.:
  // execSync(`hc keygen --nullpass --quiet ${extraArgs}`)
  const output = execSync(`hc keygen --quiet ${extraArgs}`, {
    input: `${Config.testKeyPassphrase}\n${Config.testKeyPassphrase}\n`
  })

  const [publicAddress, keyFile] = output.toString().split("\n")

  if (bundlePath && keyFile !== bundlePath) {
    console.warn("requested and actual keybundle paths differ: ")
    console.warn("", bundlePath, '!==', keyFile)
  }

  if (bundlePath) {
    // we already know the path, so don't return it again
    return {publicAddress}
  } else {
    // return both the path and the address if we let hc keygen pick the path
    return {keyFile, publicAddress}
  }

}

// TODO: allow optional temp path
export const spawnConductor = (baseDir) => {
  console.log("Using conductor binary: ", execSync('which holochain').toString())
  const conductor = spawn('holochain', ['-c', baseDir])
  conductor.stdout.on('data', data => console.log('(HC)', data.toString('utf8')))
  conductor.stderr.on('data', data => console.error('(HC) <E>', data.toString('utf8')))
  conductor.on('close', code => console.log('Conductor closed with code: ', code))
  return conductor
}

const initialTomlConfig = (baseDir, {keyFile, publicAddress}) => {

  // TODO: add DNA for HCHC when available
  return `
bridges = []
persistence_dir = "${baseDir}"
signing_service_uri = "http://localhost:${Config.PORTS.wormhole}"

[[agents]]
id = "${Config.hostAgentName}"
name = "Envoy Host"
keystore_file = "${keyFile}"
public_address = "${publicAddress}"


[[dnas]]
file = "${Config.DNAS.holoHosting.path}"
id = "${Config.holoHostingAppId.dna}"

[[dnas]]
file = "${Config.DNAS.happStore.path}"
id = "${Config.happStoreId.dna}"

[[dnas]]
file = "${Config.DNAS.holofuel.path}"
id = "${Config.holofuelId.dna}"


[[instances]]
agent = "${Config.hostAgentName}"
dna = "${Config.holoHostingAppId.dna}"
id = "${Config.holoHostingAppId.instance}"
[instances.storage]
path = "${path.join(Config.chainStorageDir(baseDir), Config.holoHostingAppId.instance)}"
type = "file"

[[instances]]
agent = "${Config.hostAgentName}"
dna = "${Config.happStoreId.dna}"
id = "${Config.happStoreId.instance}"
[instances.storage]
path = "${path.join(Config.chainStorageDir(baseDir), Config.happStoreId.instance)}"
type = "file"

[[instances]]
agent = "${Config.hostAgentName}"
dna = "${Config.holofuelId.dna}"
id = "${Config.holofuelId.instance}"
[instances.storage]
path = "${path.join(Config.chainStorageDir(baseDir), Config.holofuelId.instance)}"
type = "file"


[[interfaces]]
id = "${Config.ConductorInterface.Master}"
admin = true

[[interfaces.instances]]
id = "${Config.holoHostingAppId.instance}"
[[interfaces.instances]]
id = "${Config.happStoreId.instance}"

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
exclude = true
pattern = ".*"
`
}
