// trigger rebuild

/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */


import startServer from './server'
import * as Config from './config'

Config.hcDependencyCheck()

// console.debug = () => {}

process.on('unhandledRejection', (reason, p) => {
  console.log("*** UNHANDLED REJECTION ***")
  console.log("reason: ", reason)
})

startServer(Config.PORTS.external)
