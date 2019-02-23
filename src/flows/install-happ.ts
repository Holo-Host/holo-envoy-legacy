import axios from 'axios'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {InstallHappRequest} from '../types'
import {fail, unbundle} from '../common'

type HappResource = {
  location: string,
  hash: string,
}

enum ResourceType {HappUi, HappDna}

type LookupHappRequest = {

}

type LookupHappResponse = {
  dnas: Array<HappResource>,
  ui: HappResource,
}

export default client => async ({happId}: InstallHappRequest) => {
  // TODO: fetch data from somewhere, write fetched files to temp dir and extract
  

  const {uiPath, dnaPaths} = await downloadAppResources()

  console.log('Installing hApp ', happId)
  console.log('  DNAs: ', dnaPaths)
  console.log('  UI:   ', uiPath)
  const dnaPromises = dnaPaths.map(async dnaPath =>
    await client.call('admin/dna/install_from_file', {
      id: "TODO-CHANGE-TO-HASH",
      path: dnaPath,
      copy: false, // TODO: change for production
    }).catch(fail)
  )
  
  const uiPromises = await client.call('admin/ui/install', {
    id: `${happId}-ui`,
    root_dir: uiPath
  }).catch(fail)

  const results = await Promise.all(dnaPromises.concat([uiPromises]))
  const errors = results.filter(r => !r.success)
  if (errors.length > 0) {
    console.error('hApp installation failed!')
    console.error(errors)
    return false
  } else {
    console.log("Installation successful!")
    return true
  }
}

const lookupHoloApp = ({}: LookupHappRequest): LookupHappResponse => {
  // TODO: make actual call to HHA
  // this is a dummy response for now
  // assuming DNAs are served as JSON packages
  // and UIs are served as ZIP archives
  return {
    dnas: [
      {
        location: 'http://localhost:3333/simple-app/dist/simple-app.dna.json',
        hash: 'Qm_WHATEVER_TODO'
      }
    ],
    ui: {
      location: 'http://localhost:3333/simple-app/ui.tar',
      hash: 'Qm_ALSO_WHATEVER_TODO'
    },
  }
}

const downloadAppResources = async () => {
  const {dnas, ui} = await lookupHoloApp({})
  const [uiRequest, dnaRequests] = await Promise.all([
    await axios.get(ui.location),
    Promise.all(dnas.map(dna => axios.get(dna.location)))
  ])
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'happ-bundle-'))
  console.debug('using tempdir ', baseDir)
  
  const uiPath = await downloadResource(baseDir, ui, ResourceType.HappUi)
  const dnaPaths = await Promise.all(dnas.map(dna => downloadResource(baseDir, dna, ResourceType.HappDna)))
  unbundleUi(uiPath)
  return {uiPath, dnaPaths}
}

const downloadResource = async (baseDir: string, res: HappResource, type: ResourceType): Promise<string> => {
  const suffix = type === ResourceType.HappDna ? '.dna.json' : ''
  const resourcePath = path.join(baseDir, res.hash + suffix)
  const response = await axios({
    url: res.location,
    method: 'GET',
    responseType: 'stream',
    maxContentLength: 999999999999,
  })
  return new Promise((fulfill, reject) => {
    const writer = fs.createWriteStream(resourcePath)
      .on("finish", () => fulfill(resourcePath))
      .on("error", reject)
    response.data.pipe(writer)
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
