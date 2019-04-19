import * as fs from 'fs-extra'
import * as path from 'path'
import {execSync} from 'child_process'
import {bundleUI} from '../common'
import * as Config from '../config'

type AppBuildConfig = {
  dnas: Array<string>,
  ui: string | null,
}

const hostedHapps: Array<AppBuildConfig> = [
  {
    dnas: ['./src/shims/happ-data/holochain-basic-chat/dna-src/'],
    ui: './src/shims/happ-data/holochain-basic-chat/ui'
  },
]

const coreHapps = Object.values(Config.DNAS).map(entry => {
  // peel off two layers of directories to get to the actual dna source root
  const dir = path.dirname(path.dirname(entry.path))
  return {
    dnas: [dir],
    ui: null,
  }
})

const uiBundlePromises = ([] as any)

const buildHapp = happ => {
  if (happ.ui) {
    const zipPath = path.join(happ.ui, '..', 'ui.zip')
    try {
      fs.unlinkSync(zipPath)
    } catch {
      console.warn(`No ${zipPath}, skipping...`)
    }

    console.log(`Bundling UI for ${happ.ui} ...`)
    const promise = bundleUI(happ.ui, zipPath)
    uiBundlePromises.push(promise)
  }

  happ.dnas.forEach(dir => {
    console.log(`Packaging DNA for '${dir}'...`)
    execSync(`find $dir -name Cargo.lock -delete`)
    execSync(`cd ${dir} && hc package --strip-meta`)
  })
}

const cleanHapp = happ => {
  happ.dnas.forEach(dir => {
    const dist = path.join(dir, 'dist/*')
    try {
      execSync(`rm ${dist}`)
      console.log("Removed", dist)
    } catch (e) {
      console.warn("Could not remove", dist)
    }
  })
}

export const build = () => {
  console.log("Building core hApps...")
  coreHapps.forEach(buildHapp)

  console.log("Building hosted hApps...")
  hostedHapps.forEach(buildHapp)

  Promise.all(uiBundlePromises).then((results) => {
    console.log('All done!')
    if (results.length) {
      console.log('UI bundles: ', results)
    }
  })
}

export const clean = () => {
  console.log("Cleaning core hApps...")
  coreHapps.forEach(cleanHapp)

  console.log("Cleaning hosted hApps...")
  hostedHapps.forEach(cleanHapp)
}

if (process.argv[2] === 'build') {
  build()
} else if (process.argv[2] === 'clean') {
  clean()
}