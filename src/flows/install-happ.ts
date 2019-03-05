import axios from 'axios'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {HappID} from '../types'
import {fail, unbundle} from '../common'
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
  await setupInstances(client, {happId, agentId})
}

export const installDnasAndUi = async (client, {happId}) => {
  // TODO: fetch data from somewhere, write fetched files to temp dir and extract
  // TODO: used cached version if possible
  const {ui, dnas} = await downloadAppResources(happId)

  console.log('Installing hApp (TODO real happId)', happId)
  console.log('  DNAs: ', dnas.map(dna => dna.path))
  if (ui) {
    console.log('  UI:   ', ui.path)
  }

  const dnaResults = await Promise.all(
    dnas.map((dna) => {
      const dnaId = dna.hash
      return client.call('admin/dna/install_from_file', {
        id: dnaId,
        path: dna.path,
        copy: false,
      })
    })
  )

  const results = ([] as any[]).concat(dnaResults)

  if (ui) {
    const uiResult = await client.call('admin/ui/install', {
      id: `${happId}-ui`,
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

export const setupInstances = async (client, {happId, agentId}) => {
  const {dnas, ui} = await lookupHoloApp({happId})

  const dnaPromises = dnas.map(async (dna) => {
    const dnaId = dna.hash
    const instanceId = `${agentId}::${dnaId}`

    // TODO handle case where instance exists
    const addInstance = await client.call('admin/instance/add', {
      id: instanceId,
      agent_id: agentId,
      dna_id: dnaId,
    })

    const addToInterface = await client.call('admin/interface/add_instance', {
      instance_id: instanceId,
      interface_id: Config.happInterfaceId
    })

    const startInstance = await client.call('admin/instance/start', {
      id: instanceId
    })

    return ([
      addInstance, addToInterface, startInstance
    ])
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

const lookupHoloApp = ({happId}: LookupHappRequest): Promise<HappEntry> => {
  // TODO: make actual call to HHA
  // this is a dummy response for now
  // assuming DNAs are served as JSON packages
  // and UIs are served as ZIP archives

  if (!(happId in HAPP_DATABASE)) {
    throw `happId not found in shim database: ${happId}`
  }
  return Promise.resolve(HAPP_DATABASE[happId])
}

const downloadAppResources = async (happId): Promise<DownloadResult> => {
  const {dnas, ui} = await lookupHoloApp({happId})

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
  const response: any = await axios({
    url: res.location,
    method: 'GET',
    responseType: 'stream',
    maxContentLength: 999999999999,
  }).catch(e => e.response)
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
