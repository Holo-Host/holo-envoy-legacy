import * as fs from 'fs'
import * as path from 'path'
import {execSync} from 'child_process'
import {bundle} from '../common'

const happs = ['./src/shims/happ-data/simple-app']

happs.forEach(dir => {
  try {
    fs.unlinkSync(path.join(dir, 'ui.tar'))
  } catch {}

  console.log('Packaging DNA...')
  execSync(`cd ${dir} && hc package --strip-meta`)
  console.log('Bundling UI...')
  bundle(path.join(dir, 'ui'), path.join(dir, 'ui.tar'))
})
console.log('All done!')
