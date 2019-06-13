import axios from 'axios'
import * as colors from 'colors'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

import {HappID, HappResource, HappEntry} from '../types'
import {
  downloadFile,
  fail,
  unbundleUI,
  uiIdFromHappId,
  zomeCallByInstance,
  instanceIdFromAgentAndDna,
  serviceLoggerDnaIdFromHappId,
  serviceLoggerInstanceIdFromHappId,
} from '../common'
import * as Config from '../config'
import {HAPP_DATABASE} from '../shims/happ-server'

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
  const agentId = Config.hostAgentName
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
    dnas.map(dna => {
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
  const installedDnas = await client.call('admin/dna/list', {})
  // TODO: make sure the true DNA hash and ID really match here.
  // for now this is checking with ID since for testing I'm not using real DNA hashes
  return (installedDnas.find(({id}) => id === dnaId))
}

export const installDna = async (client, {hash, path, properties}) => {
  if (await isDnaInstalled(client, hash)) {
    console.log(`DNA with ID ${hash} already installed; skipping.`)
    return {success: true}
  } else {
    let args: any = {
      id: hash,
      path: path,
      copy: true,
      properties,
    }

    if (hash === 'TODO-FIX-HAPP-STORE') {
      console.log(colors.red.bgWhite.inverse("!!! Hash checking is temporarily disabled until hApp Store stores DNA hashes !!!"))
    } else {
      args.expected_hash = hash
    }
    return client.call('admin/dna/install_from_file', args)
  }
}

/**
 * Just like `installDna`, but without the expected_hash
 */
export const installCoreDna = async (client, {dnaId, path, properties}) => {
  if (await isDnaInstalled(client, dnaId)) {
    console.log(`DNA with ID ${dnaId} already installed; skipping.`)
    return {success: true}
  } else {
    return client.call('admin/dna/install_from_file', {
      id: dnaId,
      path: path,
      copy: true,
      properties,
    })
  }
}

type SetupInstanceArgs = {instanceId: string, agentId: string, dnaId: string, conductorInterface: Config.ConductorInterface, replace?: string}

export const setupInstance = async (client, {instanceId, agentId, dnaId, conductorInterface, replace}: SetupInstanceArgs) => {

  const instanceList = await client.call('admin/instance/list', {})
  if (instanceList.find(({id}) => id === instanceId)) {
    if (replace) {
      throw "Instance setup with replacement not yet supported"
    } else {
      console.log(`Instance with ID ${instanceId} already set up; skipping.`)
      return {success: true}
    }
  }

  // TODO handle case where instance exists
  const addInstance = await client.call('admin/instance/add', {
    id: instanceId,
    agent_id: agentId,
    dna_id: dnaId,
  })

  const addToInterface = await client.call('admin/interface/add_instance', {
    instance_id: instanceId,
    interface_id: conductorInterface,
  })

  const startInstance = await client.call('admin/instance/start', {
    id: instanceId
  })

  return ([
    addInstance, addToInterface, startInstance
  ])
}

export const setupHolofuelBridge = async (client, {callerInstanceId}) => {
  return client.call('admin/bridge/add', {
    handle: 'holofuel-bridge',
    caller_id: callerInstanceId,
    callee_id: Config.holofuelId.instance,
  })
}

export const setupInstances = async (client, opts: {happId: string, agentId: string, conductorInterface: Config.ConductorInterface}): Promise<void> => {
  const {happId, agentId, conductorInterface} = opts
  // NB: we don't actually use the UI info because we never install it into the conductor
  const {dnas, ui: _} = await lookupAppEntryInHHA(client, {happId})

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

export const setupServiceLogger = async (masterClient, {hostedHappId}) => {
  const {path} = Config.DEPENDENCIES.resources.serviceLogger.dna
  const dnaId = serviceLoggerDnaIdFromHappId(hostedHappId)
  const instanceId = serviceLoggerInstanceIdFromHappId(hostedHappId)
  const agentId = Config.hostAgentName
  const properties = {
    forApp: hostedHappId
  }
  await installCoreDna(masterClient, {dnaId, path, properties})
  await setupInstance(masterClient, {
    instanceId,
    dnaId,
    agentId,
    conductorInterface: Config.ConductorInterface.Internal
  })
  await setupHolofuelBridge(masterClient, {callerInstanceId: instanceId})

  // TODO: make initial call to serviceLogger to set up preferences?
}

export const lookupAppEntryInHHA = async (client, {happId}: LookupHappRequest): Promise<HappEntry> => {

  const appHash = await getHappHashFromHHA(client, happId)
  if (! appHash) {
    throw `hApp is not registered by a provider! (happId == ${happId})`
  }

  // TODO: look up actual web 2.0 hApp store via HTTP
  const happ = await lookupAppInStore(client, appHash)
  if (happ) {
    return happ.appEntry
  } else {
    throw `happId not found in hApp Store: happId == ${happId}, app store hash == ${appHash}`
  }
}


export const lookupAppInStore = (client, appHash) => {
  return zomeCallByInstance(client, {
    instanceId: Config.happStoreId.instance,
    zomeName: 'happs',
    funcName: 'get_app',
    params: {app_hash: appHash}
  })
}

const getHappHashFromHHA = async (client, happId) => {
  try {
    const entry = await zomeCallByInstance(client, {
      instanceId: Config.holoHostingAppId.instance,
      zomeName: 'provider',
      funcName: 'get_app_details',
      params: {app_hash: happId}
    })
    return entry.app_bundle.happ_hash
  } catch (e) {
    console.error("getHappHashFromHHA returned error: ", e)
    console.error("This might be a real error or it could simply mean that the entry was not found. TODO: differentiate the two.")
    return null
  }
}

const downloadAppResources = async (client, happId): Promise<DownloadResult> => {
  const {dnas, ui} = await lookupAppEntryInHHA(client, {happId})

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
  const resourcePath: string = path.join(baseDir, res.hash + suffix)
  return downloadFile({url: res.location, path: resourcePath})
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
