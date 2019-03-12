import * as axios from 'axios'
import * as fs from 'fs'
import * as sinon from 'sinon'
import {EventEmitter} from 'events'

import {mockResponse, sinonTest, testIntrceptr} from './common'
import {bundle, unbundle} from '../src/common'
import {serviceLoggerInstanceIdFromHappId} from '../src/config'

import installHapp, * as M from '../src/flows/install-happ'

sinon.stub(fs, 'mkdtempSync').returns('tempdir')
sinon.stub(fs, 'createReadStream').returns({
  pipe: sinon.stub()
})
sinon.stub(fs, 'createWriteStream').returns(new EventEmitter())
sinon.stub(fs, 'renameSync')
sinon.stub(bundle)
sinon.stub(unbundle)

const axiosResponse = (status) => {
  return {
    status,
    data: {
      pipe: writer => writer.emit('finish')
    }
  }
}

sinonTest('can install dnas', async T => {
  const {masterClient} = testIntrceptr()

  await M.installDna(masterClient, {
    hash: 'hash',
    path: 'path',
    properties: null,
  })

  T.callCount(masterClient.call, 1)
  T.calledWith(masterClient.call, 'admin/dna/install_from_file', {
    id: 'hash',
    path: 'path',
    expected_hash: 'hash',
    copy: true,
    properties: null
  })
})

sinonTest('throws error for invalid happId', async T => {
  const {masterClient} = testIntrceptr()
  await T.rejects(
    M.installDnasAndUi(masterClient, {happId: 'invalid'}),
    /happId not found.*/
  )
  T.callCount(masterClient.call, 1)
})

sinonTest('can install dnas and ui for hApp', async T => {
  const {masterClient} = testIntrceptr()
  T.comment('TODO: needs stub for HHA-enabled apps')

  const axiosStub = sinon.stub(axios, 'request').resolves(axiosResponse(200))
  
  const result = M.installDnasAndUi(masterClient, {happId: 'simple-app'})
  await T.doesNotReject(result)
  T.callCount(masterClient.call, 4)

  axiosStub.restore()
})
