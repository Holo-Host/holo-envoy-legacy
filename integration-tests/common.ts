import axios from 'axios'
import * as test from 'tape'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {exec} from 'child_process'
import * as rimraf from 'rimraf'
import * as S from '../src/server'
import * as T from '../src/types'
import {serializeError, whenReady} from '../src/common'
import {shimHappByNick} from '../src/shims/happ-server'
import * as HH from '../src/flows/holo-hosting'

import * as Config from '../src/config'
import {initializeConductorConfig, cleanConductorStorage, spawnConductor, keygen} from '../src/conductor'
import startEnvoy from '../src/server'


export const adminHostCall = (uri, data) => {
  return axios.post(`http://localhost:${Config.PORTS.admin}/${uri}`, data)
}

export const getTestClient = async (): Promise<any> => {
  const client = S.makeClient(`ws://localhost:${Config.PORTS.external}`, {
    reconnect: false
  })
  client.on('error', msg => console.error("WS Client error: ", msg))
  await whenReady(client)
  return client
}

/**
 * @deprecated
 */
export const withEnvoyClient = async (fn) => {
  const client = await getTestClient()
  return fn(client).finally(() => client.close())
}

/**
 * Fire up a conductor and create a WS client to it.
 * NB: there cannot be more than one conductor running at a time since they currently occupy
 * a fixed set of ports and a fixed config file path, etc.
 */
export const withConductor = async (t, fn) => {
  // TODO: how to shut down last run properly in case of failure?
  exec('killall holochain')
  const tmpBase = path.join(os.tmpdir(), 'holo-envoy')
  fs.mkdirSync(tmpBase, {recursive: true})
  const baseDir = fs.mkdtempSync(path.join(tmpBase, 'test-storage-'))
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

  const envoy = startEnvoy(Config.PORTS.external)
  await envoy.connections.ready()

  await fn(envoy)
    .catch(e => {
      const axiosErr = parseAxiosError(e)
      if (axiosErr) {
        console.error("envoy error! (axios error detected, limiting output)")
        console.error(axiosErr)
      } else {
        console.error("envoy error:", e)
      }
      t.fail("Exception was thrown during test execution")
    })
    .finally(() => {
      console.log("Shutting down everything...")
      conductor.kill()
      envoy.close()
    })
  // Give envoy time to shut down (TODO, remove)
  await delay(1000)
}

// print less of the enormous axios error object
const parseAxiosError = e => {
  if (e.config && e.request && e.response) {
    return {
      request: {
        method: e.config.method,
        url: e.config.url,
        data: e.config.data,
      },
      response: {
        status: e.response.status,
        statusText: e.response.statusText,
        data: e.response.data,
      }
    }
  } else {
    return null
  }
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

////////////////////////////////////////////

export const doRegisterHost = async () => {
  const client = S.getMasterClient(false)
  await HH.SHIMS.registerAsProvider(client)
  await HH.registerAsHost(client)
  client.close()
  await delay(1000)
}

export const doRegisterApp = async (happEntry: T.HappEntry): Promise<string> => {
  const masterClient = S.getMasterClient(false)
  const happId = await HH.SHIMS.createAndRegisterHapp(masterClient, happEntry)
  console.log("registered hApp: ", happId)

  masterClient.close()

  return happId
}

export const doInstallAndEnableApp = async (masterClient, happId) => {
  const {status, statusText} = await adminHostCall('holo/happs/install', {happId: happId})
  if (status != 200) {
    throw `Could not install hApp ${happId}, got status ${status} ${statusText}`
  }
  const enableResult = await HH.enableHapp(masterClient, happId)
  console.log(`enabled ${happId}: `, enableResult)
}


export const doAppSetup = async (happNick: string) => {
  const happEntry = shimHappByNick(happNick)!
  const dnaHashes = happEntry.dnas.map(dna => dna.hash)
  const uiHash = happEntry.ui ? happEntry.ui.hash : null
  const client = S.getMasterClient(false)

  const happId = await doRegisterApp(happEntry)

  const happResult = await doInstallAndEnableApp(client, happId)
  client.close()

  return {happId, dnaHashes, uiHash}
}


export const zomeCaller = (client, {happId, agentId, dnaHash, zome}) => (func, params) => {
  return client.call('holo/call', {
    happId, agentId, dnaHash,
    zome: zome,
    function: func,
    params: params,
    signature: 'TODO',
  })
}

