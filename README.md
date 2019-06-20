# Holo Envoy

[![CircleCI](https://circleci.com/gh/Holo-Host/envoy.svg?style=svg)](https://circleci.com/gh/Holo-Host/envoy)

The Holo Envoy is a nodejs program which provides publicly-exposed ports for browser users to connect to Holo Hosts. It also provides much of the "connective tissue" between various Holo core components: the Holo Hosting App, Signed Service Logs, DeepKey, and the Holochain Conductor itself.

Its primary function is as a websocket server which allows browser users to connect to a Holo Host's machine (HoloPort or otherwise). Envoy connects directly to a Holochain Conductor running on the same machine, serving as the intermediary between the Holo-hosted user in the browser and the Holo-agnostic DNA instances running in the Holochain Conductor.

It also provides an interface to the Holo Host, allowing them to manage installed hApps and view metrics on service activity.

## Architecture

Envoy is essentially a collection of independent web services that interact with a running Holochain Conductor as well as the filesystem.

### UI server

*port 48080*

Hosts currently serve both the UIs and the DNAs for the hApps they are hosting. A simple web server runs, allowing UI assets to be fetched at the URL based at the hApp ID. For instance, if a UI refers to a resource at the relative path `images/goku.jpg`, it can be retrieved via `GET http://localhost:48080/<happId>/images/goku.jpg`.

#### Websocket server

*port 48080* (same as UI server)

One of the services is a websocket server, which is the main interface to outside world. This is the service that clients (i.e. web UIs) use to instruct a Holo Host to call zome functions on their behalf. It runs on the same port as the websocket server, by design.

* `holo/call` - call a zome function, initiating a service request
* `holo/serviceSignature` - called subconsciously by hClient as the final step of the servicelogger request cycle, this is for providing the signature of the response after being served a zome call's results
* `holo/agents/new` - request this Host to create a source chain and host the remote agent
* `holo/wormholeSignature` - temporary hack, allowing the client to respond to signature requests from the Host. This will be obsoleted after the "web conductor" (light client) is implemented.

See [src/server.ts](src/server.ts) for implementations of both the UI server and websocket server 

#### Admin server

A separate HTTP server exists to perform certain admin functionality, used only by the Host on their own machine. 

* `POST holo/happs/install` - The is most significant admin endpoint, used to actually install a new hApp on this system,  This endpoint:
	- Downloads DNAs and UI for the hApp from the web onto the filesystem
	- Installs them via admin calls to the Conductor, modifying the Conductor config
	- Creates instances of the hosted hApp DNAs, as well as a new instance of the servicelogger
* `POST holo/happs/enable` - Update HHA to show that this app is enabled
* `POST holo/happs/disable` - Update HHA to show that this app is disabled

All requests should be JSON, i.e. use `Content-Type: application/json`. Currently CORS access is set to fully open.

See [src/server.ts](src/admin-host-server.ts) for implementation

#### Shim server (Deprecated)

A temporary server useful for development, this service mimics distributions of certain hApp DNAs and UI bundles. These apps are found in [src/shims/happ-data](src/shims/happ-data), are identified in [src/shims/happ-server.ts](src/shims/happ-server.ts), and are built via `npm run happs:build`

## Getting Started

Currently under development, so there is no production mode yet, only development mode. The rest of Holo is also in development, and since Envoy connects several pieces of Holo together, there are several temporary "shims" in place. As those pieces are built, the shims will go away.

## Installation

Let's start with the NPM dependencies:

	npm install

### Core and "shim" hApp installation 

There are two sets of DNAs and UIs that you should install.

#### Core DNAs and UIs

The "core" DNAs are necessary for Envoy's operation. They are currently the DNAs found in:

- [servicelogger](https://github.com/Holo-Host/servicelogger) (branch `develop`)
- [Holo Hosting App](https://github.com/Holo-Host/Holo-Hosting-App) (branch `develop`)
- [holofuel](https://github.com/Holo-Host/holofuel) (branch `develop`)
- [hApp Store](https://github.com/holochain/HApps-Store) (branch `develop`)

Two of these also have UIs that must be referenced as well:

- [hApp Store](https://github.com/holochain/HApps-Store) (same repository as DNA, branch `develop`)
    + Build this via `npm install && npm run build`
- [Holo Hosting App GUI](https://github.com/Holo-Host/holo-hosting-app_GUI/tree/interceptor-tester) (branch `interceptor-tester`)
    + Build this via `cd ui-src && npm install && npm run build-HHA`

These will all eventually come built into the NixOS image. For now, you must have packages/builds of all of these DNAs and UIs somewhere on your local filesystem, and then point to them in a special config file named `src/config/user-config.ts`. It should look exactly like this:

```javascript
export default {
  resources: {
    serviceLogger: {
      dna: {
        path: '/path/to/happs/servicelogger/dist/servicelogger.dna.json',
      }
    },
    holofuel: {
      dna: {
        path: '/path/to/happs/holofuel/dist/holofuel.dna.json',
      }
    },
    holoHosting: {
      dna: {
        path: '/path/to/happs/Holo-Hosting-App/dna-src/dist/dna-src.dna.json',
      },
      ui: {
        path: '/path/to/happs/holo-hosting-app_GUI/ui',
        port: 8800,
      },
    },
    happStore: {
      dna: {
        path: '/path/to/happs/HApps-Store/dna-src/dist/dna-src.dna.json',
      },
      ui: {
        path: '/path/to/happs/HApps-Store/ui',
        port: 8880,
      },
    }
  }
}
```

If you attempt to run Envoy without first creating this config file, it will exit with instructions on how to create it.

**Important**: you can point your `user-config.ts` to packages anywhere on your filesystem, but it is highly recommended that you point to packages in the standard `dist/` directories of their respective repositories! (i.e. `git clone <repo> && cd <repo> && hc package`). If you do this, then you can use the handy `npm run happs:build` command, which will build the DNA packages that `user-config.ts` expects, for you! In fact, if you don't do this, you will break the `happs:build` command, which is referenced in the next step!

#### Hosted hApps

In real life, hosted hApps get installed through the [Holo Hosting App GUI](https://github.com/Holo-Host/holo-hosting-app_GUI). For development purposes, there are a few submodules of hApps included at `src/shims/happ-data`. 

There are a collection of sample hApps that will eventually be installable, present also as submodules at [src/shims/happ-data](src/shims/happ-data). To build these apps, perform the following:

First grab the submodules

	git submodule init && git submodule update

To build the necessary DNAs and UIs, run the following script **in a holochain-core nix-shell**:

	npm run happs:build

You will want to perform this step any time any of these apps are updated.

### Key generation

To enable the Envoy to generate the initial Conductor configuration including host keys, you need to create some keys and let Envoy know about them. As a temporary step, please use the following script to generate keys:

	npm run keygen

This calls `hc keygen` under the hood, and also produces a special file that helps Envoy locate the key later. If you want to use Envoy with an existing keypair, please see the section on **Using existing keypairs** below

### Config generation

Finally, to create the initial Conductor configuration needed by Envoy, run this handy script:

	npm run init

These steps only need to be run once. However, you may run `init` as often as you like to start with a fresh Conductor state.

## Running tests

### Unit tests:

Just: 

	npm run test

### Integration tests:

Integration tests use the real holochain stack to run. You'll need to have `holochain` and `hc` installed and on your PATH. To run, just:

	npm run integration

The storage for each test will be run in a new dynamically generated temp directory. Also, a keybundle just for testing will be created the first time you run this script, and from that point on the same keybundle will be used for subsequent tests.

## Usage

To start a conductor using the config generated by `init`, you may run:

	npm run conductor

In the future, the Envoy may spawn a conductor on its own, but for development it's helpful to run this as a separate process to get the full log output.

Finally, to run the Envoy itself, you can run:

	npm run start

Upon which it will immediately connect to the Conductor at the admin websocket interface specified in the Conductor config, and run its own servers for incoming connections and requests.

If the Conductor interfaces go down, Envoy will shut down its servers as well, but the process will remain running. It will monitor the Conductor interfaces, and when they are back online, it will restart its own servers. So, the Envoy can remain running even when starting and stopping the Conductor.

## Simulating the Holo Hosting App

There is a file `command.ts` which includes some helpful commands for setting up Providers, Hosts, and hApps. You can run these commands with `npm run cmd <command-name> [args...]`

For instance, to set up an hApp starting with an empty conductor config, you would have to register as a Provider through the HHA UI, then register as a Host, install the hApp, and enable it. You can perform all these steps right from the command line.

Currently some of these commands take a "happNick", which is the name given in [src/shims/happ-server.ts](src/shims/happ-server.ts). This is just a convenient way to refer to some pre-bundled apps for development purposes only.

Let's go through the flow of installing holochain-basic-chat (happNick = "basic-chat") from scratch

Before anything else, make sure the conductor is initialized and running, as well as the Envoy:

	npm run init
	npm run conductor
	npm start

As the first Envoy action, **register as a provider**:

	npm run cmd register-provider

Now **register the app** and **enable it**:

	npm run cmd register-happ basic-chat

Finally, **install the hApp**:

	npm run cmd install basic-chat

This last step should respond with `install basic-chat:  OK 200`.

This will automatically start running the chat instance but **it will not host the UI until you restart the Envoy**. (may fix this some day)

Navigate to `localhost:48080/basic-chat` to start chatting.

**Shortcut**: To quickly get up and running with a particular app, you can condense the previous three steps (`register-provider`, `register-happ`, and `install`) with `bootstrap`:

	npm run cmd bootstrap basic-chat

## Troubleshooting

#### DNA hash mismatch

If you get an error like this:

	DNA hash does not match expected hash! QmYY7S4xKtFsvG3uqtDwBBv96dEH77GT3yMfd7KBsYYJhL != QmRft46moC7PLDtjrZVd3DhRe99mTBETdvpCMSkJZwhzgW

That's because either one of the baked-in DNAs, or one of the "shim" DNAs has updated and its hash changed. To fix this, find the reference to the old DNA hash (on the right) and update it with the new one (on the left). The reference will either be in [src/config.ts](src/config.ts) or in [src/shims/happ-server.ts](src/shims/happ-server.ts).

## More info

If at any time you want to update the submodules to the latest commit run the command
```
git submodule update --remote --merge
```

See https://hackmd.io/5xL7XKp5Srm_Ez5_eTxAOQ for latest design considerations. See also https://hackmd.io/cvXMlcffThSpN-C5WrfGzg for an earlier design doc with the broader picture but possibly outdated details.

## Using existing keypairs

In the setup, you were instructed to use `npm run keygen`. The only special thing about that script is the special file that it creates, letting Envoy know where to find the keybundle, and also what the agent's address is, since there is currently no tool that lets you pull decrypted information out of a keybundle.

To use an existing keybundle, you can create this file yourself. It's a simple JSON file with two fields, "publicAddress" and "keyFile". It must live at `src/shims/envoy-host-key.json`.

Example:

	$ cat src/shims/envoy-host-key.json  

should produce something like the following contents:

	{
	    "publicAddress": "HcSciov95SKY7uxomk9DwbFgZhK93rfjbFe6Xgwffz8j3cxbFc4JkPKKSmx7odr",
	    "keyFile": "/home/me/.config/holochain/keys/HcSciov95SKY7uxomk9DwbFgZhK93rfjbFe6Xgwffz8j3cxbFc4JkPKKSmx7odr"
	}
