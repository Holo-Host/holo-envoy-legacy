import * as test from 'tape'
import * as sinon from 'sinon'

import {mockResponse, sinonTest, testIntrceptr} from './common'
import {serviceLoggerInstanceIdFromHappId} from '../src/config'
import {IntrceptrServer} from '../src/server'
import * as Z from '../src/flows/zome-call'

// TODO: add tests for failure cases

sinonTest('can host new agent', async T => {
  const {intrceptr, masterClient, publicClient, internalClient} = testIntrceptr()
  T.fail("TODO")
})
