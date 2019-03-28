import * as fs from 'fs-extra'
import * as path from 'path'
import {execSync} from 'child_process'
import {bundle} from '../common'

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
    const tarPath = path.join(happ.ui, '..', 'ui.tar')
    try {
      fs.unlinkSync(tarPath)
    } catch {
      console.warn(`No ${tarPath}, skipping...`)
    }

    console.log(`Bundling UI for ${happ.ui} ...`)
    const promise = bundle(happ.ui, tarPath)
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
