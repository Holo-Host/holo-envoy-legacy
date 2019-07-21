
//
// Input that will be needed to make this into a script
// - URL to DNA file
// - Path to DNA file		(unless automatically download from given URL)
// - DNA hash			(unless automatically calculated using 'hc hash')
// - Path to GUI directory	(only needed to setup up a symbolic link in envoy's ui-store)
// - Host agent ID		(used to start service logger for new DNA)
// 

//
// -------------------------------------------------------------------------------------------------
// Steps to get a happ available to Envoy
// -------------------------------------------------------------------------------------------------
//
// - Register as a host and a provider in HHA
// - Register DNA/UI bundle in the happ store
// - Register as a provider of registered happ
// - Enable happ for hosting using hash from 'get_all_apps'
// 
// - Add DNA to conductor
// - Add hosted agent to conductor
// - Create instance for DNA / hosted agent
// - Add instance to public interface
// - Start instance
// 


// Register as host
node callConductorAdmin.js 1111 holo-hosting-app host register_as_host '{"host_doc": {"kyc_proof": ""}}'
{
    "Ok": "QmYoRREk74vytXT3LJtPNZB8keaRQfFGC4Tbg8uTrSdcjU"
}
// Verification request/response
node callConductorAdmin.js 1111 holo-hosting-app host is_registered_as_hos
{
    "Ok": {
	"links": [
	    {
		"address": "QmYoRREk74vytXT3LJtPNZB8keaRQfFGC4Tbg8uTrSdcjU",
		"headers": [],
		"tag": ""
	    }
	]
    }
}

// Register as provider
node callConductorAdmin.js 1111 holo-hosting-app provider register_as_provider '{"provider_doc": {"kyc_proof": ""}}'
{
    "Ok": "QmQHsXdorz6anpPLqgfHDptgTtnTyEMffQuiPMFRpASnbZ"
}
// Verification request/response
node callConductorAdmin.js 1111 holo-hosting-app provider is_registered_as_provider
{
    "Ok": {
	"links": [
	    {
		"address": "QmQHsXdorz6anpPLqgfHDptgTtnTyEMffQuiPMFRpASnbZ",
		"headers": [],
		"tag": ""
	    }
	]
    }
}

// Register in happ store
node callConductorAdmin.js 1111 happ-store happs create_app '{"title": "Holofuel", "dnas": [{ "location": "https://holo-host.github.io/holofuel/releases/download/v0.9.1-alpha1/holofuel.dna.json", "hash": "QmVbutTeHk9pzC3Q2kpQ6rnQXTPtgerxmsMuf6cuCfCt4c"}], "description": "", "thumbnail_url": "", "homepage_url": ""}'
{
    "Ok": "QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz"
}
// Verification request/response
node callConductorAdmin.js 1111 happ-store happs get_all_apps
{
    "Ok": [
	{
	    "address": "QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz",
	    "appEntry": {
		"title": "Holofuel",
		"author": "Envoy Host",
		"description": "",
		"thumbnailUrl": "",
		"homepageUrl": "",
		"dnas": [
		    {
			"location": "https://holo-host.github.io/holofuel/releases/download/v0.9.1-alpha1/holofuel.dna.json",
			"hash": "QmVbutTeHk9pzC3Q2kpQ6rnQXTPtgerxmsMuf6cuCfCt4c",
			"handle": null
		    }
		],
		"ui": null
	    },
	    "upvotes": 0,
	    "upvotedByMe": false
	}
    ]
}
// node callConductorAdmin.js 1111 happ-store happs get_app '{"app_hash": "QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz"}'
// {
//     "Ok": {
// 	"address": "QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz",
// 	"appEntry": {
// 	    "title": "Holofuel",
// 	    "author": "Envoy Host",
// 	    "description": "",
// 	    "thumbnailUrl": "",
// 	    "homepageUrl": "",
// 	    "dnas": [
// 		{
// 		    "location": "https://holo-host.github.io/holofuel/releases/download/v0.9.1-alpha1/holofuel.dna.json",
// 		    "hash": "QmVbutTeHk9pzC3Q2kpQ6rnQXTPtgerxmsMuf6cuCfCt4c",
// 		    "handle": null
// 		}
// 	    ],
// 	    "ui": null
// 	},
// 	"upvotes": 0,
// 	"upvotedByMe": false
//     }
// }

// Register in provider
node callConductorAdmin.js 1111 holo-hosting-app provider register_app '{"app_bundle": {"happ_hash": "QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz"}, "domain_name": {"dns_name": "brisebom.holofuel.money"}}'
{
    "Ok": "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS"
}
// Verification request/response
node callConductorAdmin.js 1111 holo-hosting-app provider get_my_registered_app_list
{
    "Ok": {
	"links": [
	    {
		"address": "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS",
		"headers": [],
		"tag": ""
	    }
	]
    }
}
// Now that there is a provider (someone willing to pay) for this happ, it shows up in the host app list (which indicates that it is a hostable app)
node callConductorAdmin.js 1111 holo-hosting-app host get_all_apps
{
    "Ok": [
	{
	    "hash": "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS",
	    "details": "{\"Ok\":{\"app_bundle\":{\"happ_hash\":\"QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz\"},\"payment_pref\":[]}}"
	}
    ]
}


// Enable app in holo-hosting (become a paid hoster for this app)
node callConductorAdmin.js 1111 holo-hosting-app host enable_app '{"app_hash": "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS"}'
{
    "Ok": null
}


// Add DNA to conductor
node callConductorAdmin.js 1111 admin/dna/install_from_file '{"id": "QmVbutTeHk9pzC3Q2kpQ6rnQXTPtgerxmsMuf6cuCfCt4c", "path": "/home/vagrant/projects/envoy/src/config/.envoy-deps/holofuel.dna.json", "expected_hash": "QmVbutTeHk9pzC3Q2kpQ6rnQXTPtgerxmsMuf6cuCfCt4c"}'
{
    "success": true,
    "dna_hash": "QmVbutTeHk9pzC3Q2kpQ6rnQXTPtgerxmsMuf6cuCfCt4c"
}

//
// Setup service logger for this provider happ hash
// 

// Add service logger DNA to conductor
node callConductorAdmin.js 1111 admin/dna/install_from_file '{"id": "QmWSg6rASeEU6JfxFrR9a64F26SxFASWP9CK4kbNRaWNuD", "path": "/home/vagrant/projects/envoy/src/config/.envoy-deps/servicelogger.dna.json", "expected_hash": "QmWSg6rASeEU6JfxFrR9a64F26SxFASWP9CK4kbNRaWNuD"}'
{
    "success": true,
    "dna_hash": "QmWSg6rASeEU6JfxFrR9a64F26SxFASWP9CK4kbNRaWNuD"
}
// Create instance of happ for service logger
// - Envoy expects the name to be 'servicelogger-<provider happ hash>'
node callConductorAdmin.js 1111 admin/instance/add '{"id": "servicelogger-QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS", "agent_id": "host-agent", "dna_id": "QmWSg6rASeEU6JfxFrR9a64F26SxFASWP9CK4kbNRaWNuD"}'
{
    "success": true
}
// Add instance to internal interface
node callConductorAdmin.js 1111 admin/interface/add_instance '{"interface_id": "internal-interface", "instance_id": "servicelogger-QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS"}'
{
    "success": true
}
// Start instance
node callConductorAdmin.js 1111 admin/instance/start '{"id": "servicelogger-QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS"}'
{
    "success": true
}





//
// -------------------------------------------------------------------------------------------------
// Everything after this point is automatically done by hClient calls -> Envoy -> Conductor
// -------------------------------------------------------------------------------------------------
// 


// Add hosted agent in conductor
node callEnvoy.js holo/agents/new '{"agentId": "HcSCj5I6otz4bPt334BF4HeoQp6V9jjsiTfzokneQ7yrv3wiUcKAbrb5D79nt5i", "happId": "QmZ91YiVkEWtGZKKzmdFvka9iiHmNuXrAAeJkUumWQRKCz"}'


// Create instance for DNA and hosted agent
node callConductorAdmin.js 1111 admin/instance/add '{"id": "QmYWrvP8PoLx25e26GAA3RYbCbEwwN8xTbm2NjaW9yq2h3::HcScjm4EN5eNjn5wb3pOi3dQ4sqO9dovn4mZH44jTC3hbua7PIEkg5yFF8azryi", "agent_id": "HcScjm4EN5eNjn5wb3pOi3dQ4sqO9dovn4mZH44jTC3hbua7PIEkg5yFF8azryi", "dna_id": "holofuel-v0.9.4"}'

// Add instance to public interface
node callConductorAdmin.js 1111 admin/interface/add_instance '{"interface_id": "master-interface", "instance_id": "hosted-holofuel-1"}'

// Start instance
node callConductorAdmin.js 1111 admin/instance/start '{"id": "hosted-holofuel-1"}'





//
// -------------------------------------------------------------------------------------------------
// Other calls by Envoy explained
// -------------------------------------------------------------------------------------------------
//

// Get enabled app list
// - envoy checks that it is allowed to serve this happ
node callConductorAdmin.js 1111 holo-hosting-app host get_enabled_app_list
{
    "Ok": [
	{
	    "address": "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS",
	    "entry": {
		"happ_hash": "QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz"
	    }
	}
    ]
}

// Get app details 
// - envoy checks that someone is still paying for this to be served
// - also used to determine the happ store hash
node callConductorAdmin.js 1111 holo-hosting-app provider get_app_details '{"app_hash": "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS"}'
{
    "Ok": {
	"app_bundle": {
	    "happ_hash": "QmbxbaUwZLohSVVPLWapv7XWARfo8QmeJn4ZXtovbnoSBz"
	},
	"payment_pref": []
    }
}





//
// -------------------------------------------------------------------------------------------------
// Other calls in general
// -------------------------------------------------------------------------------------------------
//

// Get list of apps I am the provider of
node callConductorAdmin.js 1111 holo-hosting-app provider get_my_registered_app_list
{
    "Ok": {
	"links": [
	    {
		"address": "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS",
		"headers": [],
		"tag": ""
	    }
	]
    }
}
