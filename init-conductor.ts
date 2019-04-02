import * as fs from 'fs'
import {
	cleanConductorStorage,
	initializeConductorConfig,
} from './src/conductor'
import * as Config from './src/config'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:", reason)
  throw ("Initialization threw exception, see reason above ^^")
})

const init = async () => {
  await cleanConductorStorage(Config.defaultIntrceptrHome)
  // TODO: actually generate new key, this is just here because keygen is so (intentionally) slow
  const {keyFile, publicAddress} = JSON.parse(fs.readFileSync(Config.keyConfigFile, 'utf8'))
  await initializeConductorConfig(Config.defaultIntrceptrHome, {keyFile, publicAddress})
  console.log("Conductor initialization complete.")
}

init()
