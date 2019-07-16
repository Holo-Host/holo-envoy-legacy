import axios from 'axios'
import * as _ from 'lodash'
import * as colors from 'colors'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import * as Logger from '@whi/stdlog'

const log = Logger('install-happs', { level: process.env.LOG_LEVEL || 'fatal' });

import {HappID, HappStoreResource, HappStoreEntry} from '../types'
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

export default (masterClient, baseDir) => {
  return async ({ happId }: InstallHappRequest): Promise<InstallHappResponse> => {
    const agentId = Config.hostAgentName

    log.info("Installing hApp ID %s for agent ID %s", happId, agentId );
    log.debug("Using client '%s'", masterClient.name );
    await installDnasAndUi(masterClient, baseDir, {happId})
    await setupInstances(masterClient, {
      happId,
      agentId,
      conductorInterface: Config.ConductorInterface.Public,
    })
    
    await setupServiceLogger(masterClient, {hostedHappId: happId})
  }
}

export const installDnasAndUi = async (client, baseDir, opts: {happId: string, properties?: any}): Promise<void> => {
  // TODO: fetch data from somewhere, write fetched files to temp dir and extract
  // TODO: used cached version if possible
  const {happId, properties} = opts
  
  log.info("Installing DNAs and UI for %s with properties %s", happId, properties );
  log.debug("Using client '%s'", client.name );
  const {ui, dnas} = await downloadAppResources(client, happId)
  log.debug("App resources ->");
  log.debug('  DNAs: %s', dnas.map(dna => dna.path) );
  log.debug('    UI: %s', typeof ui === 'object' ? ui.path : ui );

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
  log.normal("Installation successful! hApp ID: %s", happId );
}

const installUi = async (baseDir, {ui, happId}) => {
  const target = path.join(Config.uiStorageDir(baseDir), happId)
  log.info("Installing UI (by copying from temp dir): %s -> %s", ui, target)
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
    log.warn(`DNA with ID ${hash} already installed; skipping.`);
    return {success: true}
  } else {
    let args: any = {
      id: hash,
      path: path,
      copy: true,
      properties,
    }

    if (hash === 'TODO-FIX-HAPP-STORE') {
      log.warn(colors.red.bgWhite.inverse("!!! Hash checking is temporarily disabled until hApp Store stores DNA hashes !!!"))
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
    log.warn(`DNA with ID ${dnaId} already installed; skipping.`)
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
  log.info("Setting up instance ID %s for Agent/DNA (%s/%s)", instanceId, agentId, dnaId );
  const instanceList = await client.call('admin/instance/list', {});
  const instance = instanceList.find( ({ id }) => id === instanceId );
  
  if ( instance ) {
    if (replace) {
      throw "Instance setup with replacement not yet supported"
    } else {
      log.warn(`Instance with ID ${instanceId} already set up; skipping.`)
      return {success: true}
    }
  }

  // TODO handle case where instance exists
  log.debug("Add instance %s for Agent/DNA (%s/%s)", instanceId, agentId, dnaId );
  const addInstance = await client.call('admin/instance/add', {
    id: instanceId,
    agent_id: agentId,
    dna_id: dnaId,
  })

  log.debug("Add instance (%s) to interface: %s", instanceId, conductorInterface );
  const addToInterface = await client.call('admin/interface/add_instance', {
    instance_id: instanceId,
    interface_id: conductorInterface,
  })

  log.debug("Start instance (%s)", instanceId );
  const startInstance = await client.call('admin/instance/start', {
    id: instanceId
  })

  return ([
    addInstance, addToInterface, startInstance
  ])
}

export const setupHolofuelBridge = async (client, {callerInstanceId, replace}) => {
  const bridgeConfig = {
    handle: 'holofuel-bridge',
    caller_id: callerInstanceId,
    callee_id: Config.holofuelId.instance,
  }

  const bridges = await client.call('admin/bridge/list', {})
  if (bridges.find(b => _.isEqual(b, bridgeConfig))) {
    if (replace) {
      throw "Bridge setup with replacement not yet supported"
    } else {
      log.warn(`The following bridge was already set up; skipping:`)
      log.silly(JSON.stringify(bridgeConfig, null, 2))
      return {success: true}
    }
  }
  return client.call('admin/bridge/add', bridgeConfig)
}

export const setupInstances = async (client, opts: {happId: string, agentId: string, conductorInterface: Config.ConductorInterface}): Promise<void> => {
  const {happId, agentId, conductorInterface} = opts
  // NB: we don't actually use the UI info because we never install it into the conductor
  const {dnas, ui: _} = await lookupAppEntryInHHA(client, {happId})

  log.info("Setting up instances for %s DNAs", dnas.length );
  const dnaPromises = dnas.map(async (dna) => {
    const dnaId = dna.hash
    const instanceId = instanceIdFromAgentAndDna({agentId, dnaHash: dnaId})
    
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
  
  log.normal("Instance(s) setup successful!");
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
  await setupHolofuelBridge(masterClient, {callerInstanceId: instanceId, replace: false})

  // TODO: make initial call to serviceLogger to set up preferences?
}

export const lookupAppEntryInHHA = async (client, {happId}: LookupHappRequest): Promise<HappStoreEntry> => {
  log.info("Looking up app entry in HHA");
  let appHash
  try {
    appHash = await getHappHashFromHHA(client, happId)
  } catch (e) {
    throw `hApp is not registered by a provider! (happId == ${happId}). More info:\n${e}`
  }

  // TODO: look up actual web 2.0 hApp store via HTTP
  try {
    const happ = await lookupAppInStoreByHash(client, appHash)
    log.debug("Found app entry %s", JSON.stringify(happ.appEntry,null,4) );
    return happ.appEntry
  } catch (e) {
    throw `happId not found in hApp Store: happId == ${happId}, app store hash == ${appHash}. More info:\n${e}`
  }
}


export const lookupAppInStoreByHash = (client, appHash) => {
  log.info("Fetching app in store by hash: %s", appHash );
  log.debug("Using client '%s'", client.name );
  return zomeCallByInstance(client, {
    instanceId: Config.happStoreId.instance,
    zomeName: 'happs',
    funcName: 'get_app',
    args: {app_hash: appHash}
  })
}

export const lookupDnaByHandle = async (client, happId, handle): Promise<{hash: string}> => {
  log.info("Looking up handle (%s) for hApp ID: %s", handle, happId );
  
  log.debug("Get app hash using ID: %s", happId );
  const appHash = await getHappHashFromHHA(client, happId)
  log.debug("Get app with hash: %s", appHash );
  const app = await lookupAppInStoreByHash(client, appHash)
  log.debug("Find DNA using handle: %s", handle );
  const dna = app.appEntry.dnas.find(dna => dna.handle === handle)
  if (!dna) {
    throw new Error(`DNA not found for appHash '${appHash}' and handle '${handle}'`)
  }
  return dna
}

const getHappHashFromHHA = async (client, happId) => {
  log.info("Fetching app hash for hApp ID: %s", happId );
  try {
    const entry = await zomeCallByInstance(client, {
      instanceId: Config.holoHostingAppId.instance,
      zomeName: 'provider',
      funcName: 'get_app_details',
      args: {app_hash: happId}
    });
    
    return entry.app_bundle.happ_hash
  } catch (e) {
    
    if ( e.Err && e.Err.Internal === "No entry at this address" )
      log.error("No entry for hash: %s", happId );
    else
      log.error("getHappHashFromHHA returned error: %s", e );
    
    throw e
  }
}

const downloadAppResources = async (client, happId): Promise<DownloadResult> => {
  const {dnas, ui} = await lookupAppEntryInHHA(client, {happId})

  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'happ-bundle-'))

  let uiResource: HappDownloadedResource | void
  if (ui) {
    log.info("Downloading UI '%s' from %s (handle: %s) into %s",
	     ui.hash, ui.location, ui.handle, baseDir );
    const uiTarPath = await downloadResource(baseDir, ui, ResourceType.HappUi)
    const uiDir = await unbundleUi(uiTarPath)
    uiResource = {
      hash: ui.hash,
      path: uiDir,
    }
  }
  
  log.debug("DNAs (length %d): %s", dnas.length, dnas );
  const dnaResources = await Promise.all(
    dnas.map(async (dna): Promise<HappDownloadedResource> => {
      log.debug("DNA pack: %s", dna );
      log.info("Downloading DNA '%s' from %s (handle: %s) into %s",
	       dna.hash, dna.location, dna.handle, baseDir );
      return ({
	hash: dna.hash,
	path: await downloadResource(baseDir, dna, ResourceType.HappDna)
      })
    })
  );
  return {ui: uiResource, dnas: dnaResources}
}

const downloadResource = async (baseDir: string, res: HappStoreResource, type: ResourceType): Promise<string> => {
  const suffix = type === ResourceType.HappDna ? '.dna.json' : '.zip'
  const resourcePath: string = path.join(baseDir, res.hash + suffix)
  log.debug("Downloading resource '%s' to '%s'", res.location, resourcePath );
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
