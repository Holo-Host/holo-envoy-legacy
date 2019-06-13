import axios from 'axios'
const fs = require('fs').promises

import * as Config from '../config'
import {downloadFile, parseAxiosError, unbundleUI} from '../common'

const downloadDeps = async (): Promise<Array<any>> => {
  const resources = Config.DEPENDENCIES.resources

  try {
    await fs.mkdir(Config.resourcePath, {recursive: true})
  } catch (e) {}

  const dnas = [
    resources.holofuel.dna,
    resources.serviceLogger.dna,
    resources.holoHosting.dna,
    resources.happStore.dna,
  ]

  const uis = [
    resources.holoHosting.ui,
    resources.happStore.ui,
  ]
  const dnaPromises = dnas.map(dep => downloadFile({ url: dep.location, path: dep.path }))
  const uiPromises = uis.map(async dep => {
    const dir = dep.path
    const zipPath = dir + '.zip'
    await downloadFile({url: dep.location, path: zipPath})
    await unbundleUI(zipPath, dir)
    await fs.unlink(zipPath)
    return dir
  })
  return Promise.all(dnaPromises.concat(uiPromises))
}

const main = () => {
  downloadDeps().then(results => {
    console.log(`Downloaded all ${results.length} dependencies`)
    // if (results.some(r => r)) {}
  }).catch(err => {
    console.error("Could not download dependencies: ", (err))
    process.exit(-1)
  })
}

main()