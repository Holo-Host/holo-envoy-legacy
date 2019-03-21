
import {
	cleanConductorStorage,
	initializeConductorConfig,
} from './src/conductor'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:", reason)
  throw ("Initialization threw exception, see reason above ^^")
})

const init = async () => {
  await cleanConductorStorage()
  await initializeConductorConfig()
}

init().then(() => console.log("Conductor initialization complete."))
