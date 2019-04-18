import * as commander from 'commander'

import * as C from '../src/config'
import {fail, zomeCallByInstance} from '../src/common'
import {getMasterClient} from '../src/server'
import {shimHappByNick} from '../src/shims/happ-server'
import * as HH from '../src/flows/holo-hosting'

import {withEnvoyClient, adminHostCall, doRegisterHost, doRegisterApp, doInstallAndEnableApp} from './common'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:", reason)
  throw ("Command threw exception, see reason above ^^")
})

const simpleApp = shimHappByNick('simple-app')!
const simpleAppDnaHash = simpleApp.dnas[0].hash
const agentId = 'dummy-fake-not-real-agent-id'


//////////////////////////////////////////////////

const commandRegisterAsProvider = async () => {
  return await doRegisterHost()
}

const commandcreateAndRegisterHapp = async (happNick) => {
  const happEntry = shimHappByNick(happNick)!
  const happId = await doRegisterApp(happEntry)
  console.log("registered hApp: ", happId)
  return happId
}

const commandInstall = async (happNick) => {
  const client = getMasterClient(false)
  const {happId} = shimHappByNick(happNick)!
  const happResult = await doInstallAndEnableApp(client, happId)
  client.close()
  return happResult
}

const commandBootstrap = async (happNick) => {
  const client = getMasterClient(false)
  await commandRegisterAsProvider()
  await commandcreateAndRegisterHapp(happNick)
  await commandInstall(happNick)
  client.close()
  console.log("Bootstrap successful! Start using the hApp")
}

const commandNewAgent = (dir, cmd) => withEnvoyClient(async client => {
  await client.call('holo/identify', {agentId})
  await client.call('holo/agents/new', {agentId, happId: simpleApp.happId})
})

const commandZomeCallPublic = (dir, cmd) => withEnvoyClient(async client => {
  const result = await client.call('holo/call', {
    agentId: C.hostAgentName,
    happId: simpleApp.happId,
    dnaHash: simpleAppDnaHash,
    zome: 'simple',
    function: 'get_links',
    params: {base: 'TODO'},
    signature: 'TODO',
  })
  console.log("zome called:", result)
})

commander.version('0.0.1')
commander
  .command('register-provider')
  .description("Register host agent as both provider and host")
  .action(commandRegisterAsProvider)
commander
  .command('register-happ <happNick>')
  .description("Register hApp as hosted")
  .action(commandcreateAndRegisterHapp)
commander
  .command('install <happNick>')
  .description("Install app to filesystem and set up instances (/holo/happs/install)")
  .action(commandInstall)
commander
  .command('bootstrap <happNick>')
  .description("Perform all registration and installation necessary to get a hApp up and running immediately")
  .action(commandBootstrap)
commander
  .command('new-agent')
  .description("Request a new instance to be created to host an outside agent")
  .action(commandNewAgent)
commander
  .command('zome-call-public')
  .description("Make a sample zome call")
  .action(commandZomeCallPublic)
commander.parse(process.argv)

// there is no nice way to print help statements if a command is invalid >:(
const cmdValid = (cmd, name) => cmd === name || typeof cmd === 'object' && cmd._name === name
const commandNames = commander.commands.map(c => c._name)
if (!commandNames.some(name => commander.args.some(cmd => cmdValid(cmd, name)))) {
  console.log("Invalid usage.\n")
  commander.help()
}