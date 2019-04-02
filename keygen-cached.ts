import * as fs from 'fs'
import {
	keygen,
} from './src/conductor'
import * as Config from './src/config'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:", reason)
  throw ("Initialization threw exception, see reason above ^^")
})

const run = async () => {
  console.log("Generating keys. This will take a few moments...")
  const keyData = keygen()
  fs.writeFileSync(Config.keyConfigFile, JSON.stringify(keyData, null, 2))
  console.log("Created keyfile at", keyData.keyFile, "\nand cached data at", Config.keyConfigFile)
}

run()
