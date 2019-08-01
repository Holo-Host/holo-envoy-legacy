# Holo Envoy

[![CircleCI](https://circleci.com/gh/Holo-Host/envoy.svg?style=svg)](https://circleci.com/gh/Holo-Host/envoy)

[inc-doc]: https://img.shields.io/badge/status-incomplete%20documentation-yellow "Incomplete documentation"
[not-doc]: https://img.shields.io/badge/status-not%20documentation-yellow "Not documentation"


---
## Overview

Envoy is a component of the Holo Hosting infrastructure that enables a remote web user to interact
with Holochain apps as a hosted agent.

### How does that work?

When someone is running HoloPort OS, their Holochain conductor is able to register Hosted Agents
where the Agent Key is ultimitely controlled by a web user.  When a new web user is directed to a
valid host, Envoy facilitates the setup and all interaction between the web user and the happ
running in the Holochain conductor.

Behind the scenes of every transaction, Envoy is also keeping track of hosting statistics to ensure
that a Host get's paid for the services rendered.

> **Note:** Holochain's knowledge of the Holo Hosting architecture is very limited.  When an Agent's
> key is not set, Holochain assumes that the Agent is remote and issues signing requests to the
> configured service hook (as of July, 2019 the hook is HTTP requests nick named "wormhole").


---
## Architecture

Envoy is the landing point for happ requests in the larger [Holo Hosting
architecture](https://hackmd.io/mQLBSFCDTzmWOdyUSWp2XQ)

A summary of Envoy's architecture with some visualizations can be found here [Envoy
Archecture](https://hackmd.io/k4-1tNVMSDOxgmAsCvJAww?both)

### Detailed Breakdown

Envoy has a public facing interace (front-end) and some local interfaces (back-end).

> - **Front-end**
>   - consists of a web server supporting HTTP and WebSocket requests
> - **Back-end**
>   - consists of
>     - a web server for administrative commands (currently used by Holo Hosting App)
>     - a web server for handling signing requests issued by the conductor (wormhole requets)

#### Front-end

![][inc-doc]

*port 48080*

Hosts currently serve both the UIs and the DNAs for the hApps they are hosting. A simple web server
runs, allowing UI assets to be fetched at the URL based at the hApp ID. For instance, if a UI refers
to a resource at the relative path `images/goku.jpg`, it can be retrieved via `GET
http://localhost:48080/<happId>/images/goku.jpg`.


---
## Usage Guide

![][inc-doc]

### Websocket server

One of the services is a websocket server, which is the main interface to outside world. This is the
service that clients (i.e. web UIs) use to instruct a Holo Host to call zome functions on their
behalf. It runs on the same port as the websocket server, by design.

* `holo/call` - call a zome function, initiating a service request
* `holo/serviceSignature` - called subconsciously by hClient as the final step of the servicelogger
  request cycle, this is for providing the signature of the response after being served a zome
  call's results
* `holo/agents/new` - request this Host to create a source chain and host the remote agent
* `holo/wormholeSignature` - temporary hack, allowing the client to respond to signature requests
  from the Host. This will be obsoleted after the "web conductor" (light client) is implemented.

See [src/server.ts](src/server.ts) for implementations of both the UI server and websocket server 


### Admin server

A separate HTTP server exists to perform certain admin functionality, used only by the Host on their
own machine.

* `POST holo/happs/install` - The is most significant admin endpoint, used to actually install a new
  hApp on this system, This endpoint:
	- Downloads DNAs and UI for the hApp from the web onto the filesystem
	- Installs them via admin calls to the Conductor, modifying the Conductor config
	- Creates instances of the hosted hApp DNAs, as well as a new instance of the servicelogger
* `POST holo/happs/enable` - Update HHA to show that this app is enabled
* `POST holo/happs/disable` - Update HHA to show that this app is disabled

All requests should be JSON, i.e. use `Content-Type: application/json`. Currently CORS access is set to fully open.

See [src/admin-host-server.ts](src/admin-host-server.ts) for implementation


---
## Contributing

This sections is for developers that want to work on this project.

### Quick Start

**Prerequisites**

- `npm`
- `node.js` (v12)
- `holochain` (the conductor)
- `hc` (used for keygen)
- `holo` - Holo Hosting development CLI tool (v0.0.1)
- various DNA and UI resources (see configuration)

#### Installing prerequisites

##### npm + node.js

- https://github.com/nvm-sh/nvm
- https://www.npmjs.com/get-npm

If you need to run multiple NPM versions, you should install using
[NVM](https://github.com/nvm-sh/nvm).  I would recommend installing via NVM always just in case.
Otherwise, install [NPM](https://www.npmjs.com/get-npm) directly.


##### holochain + hc

- https://github.com/holochain/holochain-rust/releases

At this point in time (July, 2019) the only way to get these tools is by downloading the binaries
from the release artifacts.


##### holo

Holo CLI is an NPM package

``` bash
npm install -g holo-cli
```


#### Package dependencies

Firstly, download all the package dependencies using `npm`

``` bash
npm install
```


#### Key generation

We need to create an Agent Key to represent our Envoy host.  This command will create a key using
`hc keygen` and update our configuration.

``` bash
npm run keygen
```


#### Various DNA and UI resources

A fully working installation requires these dependencies

- hApps Store
- Holo Hosting App
- Holofuel
- Service Logger

These resources are referenced by the conductor's configuration `TOML` and are expected to be in the
configured download directory.  We must download these resources so that they are present when we
start `holochain`.

``` bash
npm run deps
```

#### Generate the `holochain` configuration file

Finally, to create the `holochain` configuration tailored for Envoy, run this script

``` bash
npm run init
```

> **Note:** You must run this anytime you update the DNAs, UIs, agent key or configured ports.


#### Booting up

Since Envoy reaches out to `holochain` (the conductor), we should start it first.

> There will be a password prompt for loading the agent key. The password is currenlty empty so just
> hit enter.

``` bash
npm run conductor
```

> **Note:** You can start the conductor yourself with `holochain -c <path to the generated config>`

Finally, start up Envoy

``` bash
npm run start
```

> **Note:** If you restart the condcutor, Envoy's WebSocket connections to the conductor will
> automatically reconnect

If that all worked, then the state of your Envoy is connected, but empty.  The next step is to load
a hostable hApp


#### Host an App

Summary of setup process:

- [Create a hApp in the "hApp Store"](#create-happ)
- [Register as a provider](#register-as-a-provider), [then register the created hApp as an app you
  will "provide"](#register-happ-as-provided-by-this-provider)
- [Register as a host](#register-as-a-host), [then enable the "provided" app so that your Envoy is
  allowed to host it](#enable-the-happ)
- [Add the hApp's DNA(s) to your conductor](#add-dna-s-to-conductor)
- [Create a "serivce logger" instance for each newly added
  DNA](#create-a-serivce-logger-instance-for-each-newly-added-dna)
- [Add the UI to Envoy](#add-the-ui-to-envoy)

Once all that setup is complete, these final steps are automatically run by Envoy for each new web
user (hosted Agent).

- Create a new "hosted" agent in conductor
- Create an instance of each DNA for hosted agent

> **Note:** It is possible to run the automated Envoy commands manually using the CLI, but the
> instructions are not included here.


##### Create hApp

Create a new hApp by adding a record in the hApp Store.

``` bash
holo happ create <title> <dna_url> <dna_hash>
```

> **Note:** This command does not yet support multiple DNAs or specifying a UI.  However, you can
> create a customized request using `holo call <instance> <zome> <func> [args...]`.


##### Register as a provider

Before a hApp can be hosted, there must be a provider.  A provider is the agent who is offering to
pay Hosters to run this hApp on behalf of web users.

``` bash
holo provider register <kyc_proof>
```


##### Register hApp as provided by "this" provider

Using the hApp's hash from the hApp Store, register the app as provided (by "this" provider).

``` bash
holo provider register-app <happ_hash> <domain_name>
```


##### Register as a host

Register as a Host so that we can get paid to run hApps on behalf of web users.

``` bash
holo host register <kyc_proof>
```


##### Enable the hApp

Register as a Host so that we can get paid to run hApps on behalf of web users.

> **Note:** The hApp hash here is the provider's registered hApp hash, not to be confused with the
> hApp Store's app hash

``` bash
holo host enable <happ_hash>
```


##### Add DNA(s) to conductor

Install the DNAs listed for this hApp in the hApp Store.

> **Note:** this one uses the hApp Store hash

``` bash
holo admin install <happ_hash>
```

> **Note:** Eventually, this command may also install the UI in Envoy, but for now follow the UI
> installation instructions below.


##### Create a "serivce logger" instance for each newly added DNA

Every hosted hApp DNA needs a service logger instance to track proof of service.  This `init`
command will start up the service loggers for each of the hApp's DNAs.

``` bash
holo admin init <happ_hash>
```


##### Add the UI to Envoy

You can put the UI that you want in the "ui-storage" directory configured in Envoy under a directory
with the hApp's hash (eg. `~/.holochain/holo/ui-store/<happ hash>/index.html`).

> **Note:** The hApp hash here is the provider's registered hApp hash, not to be confused with the
> hApp Store's app hash


### Development Guidelines

![][not-doc]

### API Reference

![][not-doc]

### Testing


#### Running tests

Run the whole test suite with:

    npm test

#### Unit tests:

To run only unit tests:

    npm run test:unit

Or with full output, including colors (useful for diagnosing test failures):

    npm run test:unit:raw

#### Integration tests:

Integration tests use the real holochain stack to run. You'll need to have `holochain` and `hc`
installed and on your PATH. To run, just:

    npm run test:integration

The storage for each test will be run in a new dynamically generated temp directory. Also, a
keybundle just for testing will be created the first time you run this script, and from that point
on the same keybundle will be used for subsequent tests.


---
## Additional project information

Historical planning documents

- [Intrceptr](https://hackmd.io/5xL7XKp5Srm_Ez5_eTxAOQ)
- [Holo Server](https://hackmd.io/cvXMlcffThSpN-C5WrfGzg) - an earlier design doc with the broader
  picture but possibly outdated details

