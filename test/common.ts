import * as sinon from 'sinon'
import {Client as RpcClient, Server as RpcServer} from 'rpc-websockets'

import {IntrceptrServer} from '../src/server'

export const testRpcClient = () => sinon.stub(new RpcClient())

export const testRpcServer = () => sinon.stub(new RpcServer({noServer: true}))
