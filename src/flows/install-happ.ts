import axios from 'axios'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {HappID} from '../types'
import {
  callWhenConnected,
  fail, 
  unbundle, 
  uiIdFromHappId, 
  zomeCallByInstance, 
  instanceIdFromAgentAndDna
} from '../common'
import * as Config from '../config'
import {HAPP_DATABASE, HappResource, HappEntry} from '../shims/happ-server'

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

export default client => async ({happId}: InstallHappRequest): Promise<InstallHappResponse> => {
  const agentId = Config.hostAgentId
  await installDnasAndUi(client, {happId})
  await setupInstances(client, {
    happId,
    agentId,
    conductorInterface: Config.ConductorInterface.Public,
  })
  // TODO: is this the right place?
  // await setupServiceLogger(client, {hostedHappId: happId})
}

export const installDnasAndUi = async (client, opts: {happId: string, properties?: any}): Promise<void> => {
  // TODO: fetch data from somewhere, write fetched files to temp dir and extract
  // TODO: used cached version if possible
  const {happId, properties} = opts
  console.log('Installing hApp ', happId)
  const {ui, dnas} = HAPP_DATABASE[happId]
  // const {ui, dnas} = await downloadAppResources(client, happId)

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
    const uiResult = await callWhenConnected(client, 'admin/ui/install', {
      id: uiIdFromHappId(happId),
      root_dir: ui.path
    })
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

const setupInstance = async (client, {instanceId, agentId, dnaId, conductorInterface}) => {

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

const setupServiceLogger = async (masterClient, {hostedHappId}) => {
  const {hash, path} = Config.DNAS.serviceLogger
  const instanceId = Config.serviceLoggerInstanceIdFromHappId(hostedHappId)
  const agentId = Config.hostAgentId
  const properties = {
    forApp: hostedHappId
  }
  await installDna(masterClient, {hash, path, properties})
  await setupInstance(masterClient, {instanceId, dnaId: hash, agentId, conductorInterface: Config.ConductorInterface.Internal })

  // TODO NEXT: 
  // - Open client to Internal interface
  // - Make initial call to serviceLogger
}

export const lookupHoloApp = async (client, {happId}: LookupHappRequest): Promise<HappEntry> => {
  // TODO: make actual call to HHA
  // this is a dummy response for now
  // assuming DNAs are served as JSON packages
  // and UIs are served as ZIP archives

  // const _info = await zomeCallByInstance(client, {
  //   instanceId: Config.holoHostingAppId, 
  //   zomeName: 'hosts',
  //   funcName: 'TODO',
  //   params: {happId}
  // })
  if (!(happId in HAPP_DATABASE)) {
    throw `happId not found in shim database: ${happId}`
  }
  return HAPP_DATABASE[happId]
}

export const listHoloApps = () => {
  // TODO: call HHA's `get_my_registered_app` for real data
  const fakeApps = Object.assign({}, HAPP_DATABASE)
  for (const id in fakeApps) {
    fakeApps[id].ui_hash = fakeApps[id].ui
    fakeApps[id].dna_list = fakeApps[id].dnas
  }
  return Promise.resolve(fakeApps)
}

const downloadAppResources = async (_client, happId): Promise<DownloadResult> => {
  const {dnas, ui} = await lookupHoloApp(_client, {happId})

  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'happ-bundle-'))
  console.debug('using tempdir ', baseDir)

  let uiResource: HappDownloadedResource | void
  if (ui) {
    const uiPath = await downloadResource(baseDir, ui, ResourceType.HappUi)
    unbundleUi(uiPath)
    uiResource = {
      hash: ui.hash,
      path: uiPath,
    }
  }
  const dnaResources = await Promise.all(dnas.map(async (dna): Promise<HappDownloadedResource> => ({
    hash: dna.hash,
    path: await downloadResource(baseDir, dna, ResourceType.HappDna)
  })))
  return {ui: uiResource, dnas: dnaResources}
}

const downloadResource = async (baseDir: string, res: HappResource, type: ResourceType): Promise<string> => {
  const suffix = type === ResourceType.HappDna ? '.dna.json' : ''
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
      response.data.pipe(writer)
    }
  })
}

const unbundleUi = (target: string) => {
  const source = target + '.tar'
  fs.renameSync(target, source)
  unbundle(source, target)
}


/**
 * TODO: save payload of UI/DNA fetch from HCHC, for installing
 * @type {[type]}
 */
const saveTempFile = () => {}
