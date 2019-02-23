import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

import {LookupHappRequest, LookupHappResponse, InstallHappRequest} from '../types'
import {fail} from '../common'


export default client => async ({happId}: InstallHappRequest) => {
  // TODO: fetch data from somewhere, write fetched files to temp dir and extract
  // const {dnaLocators, uiLocator} = await lookupHoloApp({})
  // const ui = await axios.get(uiLocator)
  // const dnas = await Promise.all(dnaLocators.map(loc => axios.get(loc)))
  // const baseDir = fs.mkdtempSync('holo-app-bundle')
  
  const baseDir = './shims/happs/simple-app'
  const uiPath = path.join(baseDir, 'ui')
  const dnaPaths = ['dna1.json'].map(name => path.join(baseDir, name))

  console.log('Installing hApp ', happId)
  console.log('  DNAs: ', dnaPaths)
  console.log('  UI:   ', uiPath)
  const dnaPromises = dnaPaths.map(async dnaPath =>
    await client.call('admin/dna/install_from_file', {
      id: 'TODO',
      path: dnaPath,
      copy: false, // TODO: change for production
    }).catch(fail)
  )
  
  const uiPromises = await client.call('admin/ui/install', {
    id: 'TODO',
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
    dnaLocators: ['http://localhost:3333/simple-app/dist/dna.json'],
    uiLocator: 'http://localhost:3333/simple-app/ui.tar',
  }
}


/**
 * TODO: save payload of UI/DNA fetch from HCHC, for installing
 * @type {[type]}
 */
const saveTempFile = () => {}
