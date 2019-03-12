import * as test from 'tape'
import * as sinon from 'sinon'

import {testRpcClient, testRpcServer} from './common'
import {IntrceptrServer} from '../src/server'

const setup = () => {
  const masterClient = testRpcClient()
  const publicClient = testRpcClient()
  const internalClient = testRpcClient()
  const intrceptr = new IntrceptrServer({
    masterClient: testRpcClient(),
    publicClient: testRpcClient(),
    internalClient: testRpcClient(),
  })
  intrceptr.server = testRpcServer()
  return {intrceptr, masterClient, publicClient, internalClient}
}

test('can call public zome function', t => {
  const {intrceptr, masterClient, publicClient, internalClient} = setup()
  


  t.end()
})