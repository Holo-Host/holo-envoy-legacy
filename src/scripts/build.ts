import * as fs from 'fs-extra'
import * as path from 'path'
import {execSync} from 'child_process'
import {bundleUI} from '../common'

const happs = [
  {
    dnas: ['./src/dnas/servicelogger/']
  },
  {
    dnas: ['./src/dnas/Holo-Hosting-App/dna-src/']
  },
  // {
  //   dnas: ['./src/shims/happ-data/simple-app/'],
  //   ui: './src/shims/happ-data/simple-app/ui'
  // },
  {
    dnas: ['./src/shims/happ-data/holochain-basic-chat/dna-src/'],
    ui: './src/shims/happ-data/holochain-basic-chat/ui'
  },
]

const uiBundlePromises = ([] as any)

happs.forEach(happ => {
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
})

Promise.all(uiBundlePromises).then((results) => {
  console.log('All done!')
  if (results.length) {
    console.log('UI bundles: ', results)
  }
})
