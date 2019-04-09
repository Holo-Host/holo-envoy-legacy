import axios from 'axios'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

import {HappID} from '../types'
import {
  callWhenConnected,
  fail,
  unbundleUI,
  uiIdFromHappId,
  zomeCallByInstance,
  instanceIdFromAgentAndDna,
  serviceLoggerInstanceIdFromHappId,
} from '../common'
import * as Config from '../config'
import {HAPP_DATABASE, shimHappById, HappResource, HappEntry} from '../shims/happ-server'

enum ResourceType {HappUi, HappDna}

type LookupHappRequest = {
  happId: string,
}

export type InstallHappRequest = {
  happId: HappID,
}

type HappDownloadedResource = {
  path: string,
  hash: string,
}

type DownloadResult = {
  ui: HappDownloadedResource | void,
  dnas: Array<HappDownloadedResource>,
}

export type InstallHappResponse = void

export default (masterClient, baseDir) => async ({happId}: InstallHappRequest): Promise<InstallHappResponse> => {
  const agentId = Config.hostAgentId
  await installDnasAndUi(masterClient, baseDir, {happId})
  await setupInstances(masterClient, {
    happId,
    agentId,
    conductorInterface: Config.ConductorInterface.Public,
  })
  await setupServiceLogger(masterClient, {hostedHappId: happId})
}

export const installDnasAndUi = async (client, baseDir, opts: {happId: string, properties?: any}): Promise<void> => {
  // TODO: fetch data from somewhere, write fetched files to temp dir and extract
  // TODO: used cached version if possible
  const {happId, properties} = opts
  console.log('Installing hApp ', happId)
  const {ui, dnas} = await downloadAppResources(client, happId)

  console.log('  DNAs: ', dnas.map(dna => dna.path))
  if (ui) {
    console.log('  UI:   ', ui.path)
  }

  const dnaResults = await Promise.all(
    dnas.map(async (dna) => {
      if (await isDnaInstalled(client, dna.hash)) {
        console.log(`DNA with ID ${dna.hash} already installed; skipping.`)
        return {success: true}
      }
      return installDna(client, {
        hash: dna.hash,
        path: dna.path,
        properties: undefined,
      })
    })
  )

  const results = ([] as any[]).concat(dnaResults)

  if (ui) {
    const uiResult = await installUi(baseDir, {ui, happId})
    results.concat([uiResult])
  }

  const errors = results.filter(r => !r.success)

  if (errors.length > 0) {
    throw({
      reason: 'hApp installation failed!',
      errors
    })
  }
  console.log("Installation successful!")
}

const installUi = async (baseDir, {ui, happId}) => {
  const target = path.join(Config.uiStorageDir(baseDir), happId)
  console.log("Installing UI (by copying from temp dir):", ui, target)
  await fs.copy(ui.path, target)
  return {success: true}
}

const isDnaInstalled = async (client, dnaId) => {
  const installedDnas = await callWhenConnected(client, 'admin/dna/list', {})
  // TODO: make sure the true DNA hash and ID really match here.
  // for now this is checking with ID since for testing I'm not using real DNA hashes
  return (installedDnas.find(({id}) => id === dnaId))
}

export const installDna = (client, {hash, path, properties}) => {
  return callWhenConnected(client, 'admin/dna/install_from_file', {
    id: hash,
    path: path,
    expected_hash: hash,
    copy: true,
    properties,
  })
}

export const setupInstance = async (client, {instanceId, agentId, dnaId, conductorInterface}) => {

  const instanceList = await callWhenConnected(client, 'admin/instance/list', {})
  if (instanceList.find(({id}) => id === instanceId)) {
    console.log(`Instance with ID ${instanceId} already set up; skipping.`)
    return {success: true}
  }

  // TODO handle case where instance exists
  const addInstance = await callWhenConnected(client, 'admin/instance/add', {
    id: instanceId,
    agent_id: agentId,
    dna_id: dnaId,
  })

  const addToInterface = await callWhenConnected(client, 'admin/interface/add_instance', {
    instance_id: instanceId,
    interface_id: conductorInterface,
  })

  const startInstance = await callWhenConnected(client, 'admin/instance/start', {
    id: instanceId
  })

  return ([
    addInstance, addToInterface, startInstance
  ])
}

export const setupInstances = async (client, opts: {happId: string, agentId: string, conductorInterface: Config.ConductorInterface}): Promise<void> => {
  const {happId, agentId, conductorInterface} = opts
  // NB: we don't actually use the UI info because we never install it into the conductor
  const {dnas, ui: _} = await lookupHoloApp(client, {happId})

  const dnaPromises = dnas.map(async (dna) => {
    const dnaId = dna.hash
    const instanceId = instanceIdFromAgentAndDna(agentId, dnaId)
    return setupInstance(client, {
      dnaId,
      agentId,
      instanceId,
      conductorInterface
    })
  })
  const dnaResults = await Promise.all(dnaPromises)

  // flatten everything out
  const results = ([] as any[]).concat(...dnaResults)
  const errors = results.filter(r => !r.success)

  if (errors.length > 0) {
    throw({
      reason: 'hApp instance setup failed!',
      errors
    })
  }
  console.log("Instance setup successful!")
}

export const setupServiceLogger = async (internalClient, {hostedHappId}) => {
  const {hash, path} = Config.DNAS.serviceLogger
  const instanceId = serviceLoggerInstanceIdFromHappId(hostedHappId)
  const agentId = Config.hostAgentId
  const properties = {
    forApp: hostedHappId
  }
  await installDna(internalClient, {hash, path, properties})
  await setupInstance(internalClient, {
    instanceId,
    dnaId: hash,
    agentId,
    conductorInterface: Config.ConductorInterface.Internal
  })

  // TODO:
  // - Open client to Internal interface
  // - Make initial call to serviceLogger
}

export const lookupHoloApp = async (client, {happId}: LookupHappRequest): Promise<HappEntry> => {
  // this is a shim response for now
  // assuming DNAs are served as JSON packages
  // and UIs are served as ZIP archives

  if (! await happIsRegistered(client, happId)) {
    throw `hApp is not registered by a provider! (happId = ${happId})`
  }

  // TODO: look up actual web 2.0 hApp store via HTTP
  const happ = shimHappById(happId)
  if (happ) {
    return happ
  } else {
    throw `happId not found in shim database: ${happId}`
  }
}

const happIsRegistered = async (client, happId) => {
  try {
    await zomeCallByInstance(client, {
      instanceId: Config.holoHostingAppId,
      zomeName: 'provider',
      funcName: 'get_app_details',
      params: {app_hash: happId}
    })
    return true
  } catch (e) {
    console.error("happIsRegistered returned error: ", e)
    console.error("This might be a real error or it could simply mean that the entry was not found. TODO: differentiate the two.")
    return false
  }
}

export const listHoloApps = () => {
  // TODO: call HHA's `get_my_registered_app` for real data
  const fakeApps = ([] as any).concat(HAPP_DATABASE)
  for (const i in fakeApps) {
    fakeApps[i].ui_hash = fakeApps[i].ui
    fakeApps[i].dna_list = fakeApps[i].dnas
  }
  return Promise.resolve(fakeApps)
}

const downloadAppResources = async (_client, happId): Promise<DownloadResult> => {
  const {dnas, ui} = await lookupHoloApp(_client, {happId})

  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'happ-bundle-'))
  console.debug('using tempdir ', baseDir)

  let uiResource: HappDownloadedResource | void
  if (ui) {
    console.debug("Downloading UI: ", ui)
    const uiTarPath = await downloadResource(baseDir, ui, ResourceType.HappUi)
    const uiDir = await unbundleUi(uiTarPath)
    uiResource = {
      hash: ui.hash,
      path: uiDir,
    }
  }
  const dnaResources = await Promise.all(dnas.map(async (dna): Promise<HappDownloadedResource> => ({
    hash: dna.hash,
    path: await downloadResource(baseDir, dna, ResourceType.HappDna)
  })))
  return {ui: uiResource, dnas: dnaResources}
}

const downloadResource = async (baseDir: string, res: HappResource, type: ResourceType): Promise<string> => {
  const suffix = type === ResourceType.HappDna ? '.dna.json' : '.zip'
  const resourcePath = path.join(baseDir, res.hash + suffix)
  const response: any = await axios.request({
    url: res.location,
    method: 'GET',
    responseType: 'stream',
    maxContentLength: 999999999999,
  }).catch(e => {
    console.warn('axios error: ', e)
    return e.response
  })
  return new Promise((fulfill, reject) => {
    if (response.status != 200) {
      reject(`Could not fetch ${res.location}: ${response.statusText} ${response.status}`)
    } else {
      const writer = fs.createWriteStream(resourcePath)
        .on("finish", () => fulfill(resourcePath))
        .on("error", reject)
      console.debug("Starting streaming download...")
      response.data.pipe(writer)
    }
  })
}

const unbundleUi = async (source: string) => {
  const [target, end] = source.split('.zip')
  if (target == source) {
    throw "Could not unbundle UI. Check that the resource is a .zip file: " + source
  }
  await unbundleUI(source, target)
  return target
}


/**
 * TODO: save payload of UI/DNA fetch from HCHC, for installing
 * @type {[type]}
 */
const saveTempFile = () => {}
