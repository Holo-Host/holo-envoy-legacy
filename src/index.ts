/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */


import startServer from './server'
import * as C from './config'

// console.debug = () => {}

console.log('----------------------------------')

process.on('unhandledRejection', (reason, p) => {
  console.log("*** UNHANDLED REJECTION ***")
  console.log("reason: ", reason)
})

startServer(C.PORTS.external)
