import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import tar from 'tar-fs'

import {LookupHappResponse} from './types'
import {fail} from './common'


export default client => async ({}) => {
  // TODO: fetch data from somewhere, write fetched files to temp dir and extract
  // const {dnaLocators, uiLocator} = await lookupHoloApp({})
  // const ui = await axios.get(uiLocator)
  // const dnas = await Promise.all(dnaLocators.map(loc => axios.get(loc)))
  // const baseDir = fs.mkdtempSync('holo-app-bundle')
  
  const baseDir = './shims/happs/simple-app'
  const uiPath = path.join(baseDir, 'ui')
  const dnaPaths = ['dna1.json'].map(name => path.join(baseDir, name))

  dnaPaths.forEach(async dnaPath => {
    console.log('attempting to install dna: ', dnaPath)
    const dnaResult = await client.call('admin/dna/install_from_file', {
      id: 'TODO',
      path: dnaPath,
      copy: false, // TODO: change for production
    }).catch(fail)
    console.log('installed dna: ', dnaResult)
  })
  
  const uiResult = await client.call('admin/ui/install', {
    id: 'TODO',
    root_dir: uiPath
  }).catch(fail)
  console.log('installed ui: ', uiResult)
}

const lookupHoloApp = ({}): LookupHappResponse => {
  // TODO: make actual call to HHA
  // this is a dummy response for now
  // assuming DNAs are served as JSON packages
  // and UIs are served as ZIP archives
  return {
    dnaLocators: ['http://localhost:3333/dna.json'],
    uiLocator: 'http://localhost:3333/ui.zip',
  }
}


/**
 * TODO: save payload of UI/DNA fetch from HCHC, for installing
 * @type {[type]}
 */
const saveTempFile = () => {}

const bundleUi = (input, target) => 
  tar.pack(input).pipe(fs.createWriteStream(target))

const unbundleUi = (input, target) => 
  fs.createReadStream(input).pipe(tar.extract(target))
