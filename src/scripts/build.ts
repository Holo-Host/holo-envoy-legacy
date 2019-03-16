import * as fs from 'fs'
import * as path from 'path'
import {execSync} from 'child_process'
import {bundle} from '../common'

const happs = [
  {
    dnas: ['./src/shims/happ-data/simple-app/'],
    ui: './src/shims/happ-data/simple-app/ui/'
  },
  {
    dnas: ['./src/dnas/servicelogger/']
  },
  {
    dnas: ['./src/dnas/Holo-Hosting-App/']
  },
  {
    dnas: ['./src/shims/happ-data/holochain-basic-chat/dna-src/'],
    ui: './src/shims/happ-data/holochain-basic-chat/ui/'
  },
  // {
  //   dnas: ['./src/shims/happ-data/Holo-Hosting-App/dna-src/']
  // }
]

happs.forEach(happ => {
  if (happ.ui) {
    const dir = happ.ui
    execSync(`cd ${dir} && hc package --strip-meta`)

    try {
      fs.unlinkSync(path.join(dir, 'ui.tar'))
    } catch {}

    console.log(`Bundling UI for ${dir} ...`)
    bundle(dir, path.join(dir, '..', 'ui.tar'))
  }

  happ.dnas.forEach(dir => {
    console.log(`Packaging DNA for '${dir}'...`)
    execSync(`cd ${dir} && hc package --strip-meta`)
  })
})
console.log('All done!')
