import * as test from 'tape'
import axios from 'axios'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {exec} from 'child_process'
import * as rimraf from 'rimraf'
import {Client} from 'rpc-websockets'
import * as T from '../src/types'
import {serializeError} from '../src/common'

import * as Config from '../src/config'
import {initializeConductorConfig, cleanConductorStorage, spawnConductor, keygen} from '../src/conductor'
import startIntrceptr from '../src/server'


export const adminHostCall = (uri, data) => {
  return axios.post(`http://localhost:${Config.PORTS.admin}/${uri}`, data)
}

export const withIntrceptrClient = fn => new Promise((resolve, reject) => {
  const client = new Client(`ws://localhost:${Config.PORTS.intrceptr}`, {
    reconnect: false
  })
  client.on('error', msg => console.error("WS Client error: ", msg))
  client.once('open', async () => {
    // setup wormhole client dummy response
    // TODO: make it real
    client.subscribe('agent/sign')
    client.on('agent/sign', (params) => {
      console.log('on agent/sign:', params)
      const {entry, id} = params
      client.call('holo/wormholeSignature', {
        signature: 'TODO-signature',
        requestId: id,
      })
    })

    return fn(client)
      .catch(reject)
      .finally(() => client.close())
      .then(resolve)
  })
})

/**
 * Fire up a conductor and create a WS client to it.
 * NB: there cannot be more than one conductor running at a time since they currently occupy
 * a fixed set of ports and a fixed config file path, etc.
 */
export const conductorTest = async (t, fn) => {
  // TODO: how to shut down last run properly in case of failure?
  exec('killall holochain')
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'holo-intrceptr', 'test-storage-'))
  console.log('Created directory for integration tests: ', baseDir)
  cleanConductorStorage(baseDir)
  console.log("Cleared storage.")
  const keyData = getOrCreateKeyData()
  console.log("Generated keys.")
  initializeConductorConfig(baseDir, keyData)
  console.log("Generated config.")
  const conductor = spawnConductor(Config.conductorConfigPath(baseDir))
  await delay(1000)

  console.info("auto-entering passphrase...")
  conductor.stdin.write(Config.testKeyPassphrase + '\n')
  conductor.stdin.end()

  const intrceptr = startIntrceptr(Config.PORTS.intrceptr)
  await intrceptr.connections.ready()
  await delay(1000)
  console.log("intrceptr ready! running test.")
  await withIntrceptrClient(fn)
  .then(t.end)
  .catch(e => t.fail(serializeError(e)))
  .finally(() => {
    console.log("Shutting down everything...")
    intrceptr.close()
    conductor.kill()
  })
}


export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Read the cached test keyfile data from files, first creating said files if nonexistant
 */
const getOrCreateKeyData = (): T.KeyData => {
  const bundlePath = Config.testKeybundlePath
  const addressPath = Config.testAgentAddressPath
  if (fs.existsSync(bundlePath) && fs.existsSync(addressPath)) {
    console.log('Using existing key data at', Config.testKeyDir)
    const publicAddress = fs.readFileSync(addressPath, 'utf8')
    return {
      keyFile: bundlePath,
      publicAddress
    }
  } else {
    fs.mkdirSync(Config.testKeyDir, {recursive: true})
    console.log('Creating new key data at', Config.testKeyDir)
    const {publicAddress} = keygen(bundlePath)
    fs.writeFileSync(addressPath, publicAddress)
    return {publicAddress, keyFile: bundlePath}
  }
}

const deleteKeyData = () => rimraf.sync(Config.testKeyDir)
