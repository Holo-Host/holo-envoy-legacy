.DEFAULT_GOAL := help
.PHONY: help FORCE
help:
	@printf "Makefile (%s)\n" $$(pwd)
	@echo ""
	@echo "  usage: make <target> [<target>, ...]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""

CONFIG		= ./config.json

# ENVOY_HOME	= $(shell jq -r '.defaultEnvoyHome' $(CONFIG))
# CHAIN_STORE	= $(ENVOY_HOME)/$(shell jq -r '.chainStorageDir' $(CONFIG) )
# UI_STORE	= $(ENVOY_HOME)/$(shell jq -r '.defaultEnvoyHome' $(CONFIG) )
# HC_CONFIG	= $(ENVOY_HOME)/$(shell jq -r '.conductorConfigFile' $(CONFIG) )

print:
	@echo $(ENVOY_HOME)
	@echo $(CHAIN_STORE)
	@echo $(UI_STORE)
	@echo $(HC_CONFIG)

conductor-init:	conductor-clean	$(CHAIN_STORE) $(UI_STORE) $(HC_CONFIG) ## Create conductor config TOML

# Must used "bash -c ..." for tilde expansion to work
conductor-clean:
	@while true; do read -p "Do you wish to rm -r $(CHAIN_STORE)? " yn;		\
	    case $$yn in [Yy]* )							\
		bash -c "rm -r $(CHAIN_STORE)"; break;;					\
	[Nn]* ) exit;; * ) echo "Please answer yes or no.";;esac;done;
	@while true; do read -p "Do you wish to rm -r $(UI_STORE)? " yn;		\
	    case $$yn in [Yy]* )							\
		bash -c "rm -r $(UI_STORE)"; break;;					\
	[Nn]* ) exit;; * ) echo "Please answer yes or no.";;esac;done;

$(ENVOY_HOME):
	mkdir -p $@
$(CHAIN_STORE):
	mkdir -p $@
$(UI_STORE):
	mkdir -p $@
$(HC_CONFIG):
	npm run build-conductor-config

nix-shell:						## Start a pure holonix-shell
	nix-shell ../holochain-rust/

list-files:						## List specific project files
	ls -l
	find src/ test/ -not -path '*.envoy*'
list-files-exclusive:					## List all files excluding (node_modules .git .envoy-deps /lib)
	find . -not -path './node_modules*'			\
		-and -not -path './.git*'			\
		-and -not -path './src/config/.envoy-deps/*'	\
		-and -not -path './lib/*'




# Install binaries for holochain and hc
CONDUCTOR_TAR	= conductor-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz
CLI_TAR		= cli-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz

install: hc-conductor hc-cli

hc-conductor:	$(CONDUCTOR_TAR)
	tar -xzvf $<
	sudo cp ./conductor-v0.0.18-alpha1-x86_64-unknown-linux-gnu/holochain	/usr/local/bin
hc-cli:		$(CLI_TAR)
	tar -xzvf $<
	sudo cp ./cli-v0.0.18-alpha1-x86_64-unknown-linux-gnu/hc		/usr/local/bin

$(CONDUCTOR_TAR):
	wget "https://github.com/holochain/holochain-rust/releases/download/v0.0.18-alpha1/conductor-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz"

$(CLI_TAR):
	wget "https://github.com/holochain/holochain-rust/releases/download/v0.0.18-alpha1/cli-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz"


NVM		= ~/.nvm
JQ		= /usr/bin/jq
NGINX		= /usr/sbin/nginx
ZEROTIER	= /usr/sbin/zerotier-cli

$(NVM):
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
	nvm install 12
$(JQ):
	sudo apt-get install -y jq
$(NGINX):
	sudo apt-get install nginx
$(ZEROTIER):
	curl -s "https://install.zerotier.com" | sudo bash

setup:	setup-nginx
	npm run keygen
	npm run deps
	npm run init

setup-nginx:
	sudo cp ./nginx/holo-host.conf /etc/nginx/sites-available/
	sudo ln -fs /etc/nginx/sites-available/holo-host.conf /etc/nginx/sites-enabled/
	sudo service nginx restart

ZT_NETWORK	= "93afae5963c547f1"

setup-zerotier: $(ZEROTIER)
	sudo zerotier-cli join $(ZT_NETWORK)

start-conductor:
	npm run conductor 
start-envoy:
	npm run start


setup-dns: zt-authorize create-cname create-service create-route
zt-authorize:
	@printf "\e[1;37m%s\e[0m\n" "Authorize zerotier address "$$(sudo zerotier-cli info -j | jq -r '.address');
	@ZT_ID=$$(sudo zerotier-cli info -j | jq -r '.address');				\
	curl -X POST "http://proxy.holohost.net/zato/holo-zt-auth"				\
		-H "Holo-Init: $(INIT_API_KEY)"	-H "Content-Type: application/json"		\
		--data '{"member_id":"'$$ZT_ID'"}' > zt_auth.json
create-cname:
	@printf "\e[1;37m%s\e[0m\n" "Setup CNAME to proxy.holohost.net for "$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress')".holohost.net";
	@HOST_PUBKEY=$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress');		\
	curl -X POST "http://proxy.holohost.net/zato/holo-cloudflare-dns-create"		\
		-H "Holo-Dev: $(DEV_API_KEY)"	-H "Content-Type: application/json"		\
		--data '{"pubkey":"'$$HOST_PUBKEY'"}' > cf_record.json
create-service:
	@printf "\e[1;37m%s\e[0m\n" "Create zato service for <pubkey>.holohost.net -> "$$(cat zt_auth.json | jq -r '.config.ipAssignments[0]');
	@HOST_PUBKEY=$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress');		\
	ZT_ADDR=$$(cat zt_auth.json | jq -r '.config.ipAssignments[0]');			\
	curl -X POST "http://proxy.holohost.net/zato/holo-proxy-service-create"			\
		-H "Holo-Dev: $(DEV_API_KEY)"	-H "Content-Type: application/json"		\
		--data '{"name":"'$$HOST_PUBKEY'.holohost.net", "protocol":"http", "host":"'$$ZT_ADDR'", "port":48080}' > zato_service_info.json
create-route:
	@printf "\e[1;37m%s\e[0m\n" "Create zato route for <pubkey>.holohost.net -> service: "$$(cat ./zato_service_info.json | jq -r '.id');
	@HOST_PUBKEY_CS=$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress');	\
	HOST_PUBKEY_LC=$$(echo $$HOST_PUBKEY_CS | tr '[:upper:]' '[:lower:]');			\
	SERVICE_ID=$$(cat ./zato_service_info.json | jq -r '.id');				\
	curl -X POST "http://proxy.holohost.net/zato/holo-proxy-route-create"			\
		-H "Holo-Dev: $(DEV_API_KEY)"	-H "Content-Type: application/json"		\
		--data '{"name":"'$$HOST_PUBKEY_CS'.holohost.net", "protocols":["http","https"], "hosts":["*.'$$HOST_PUBKEY_LC'.holohost.net"], "service":"'$$SERVICE_ID'" }' > zato_route_info.json

delete-service:
	@printf "\e[1;37m%s\e[0m\n" "Create zato service for "$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress')".holohost.net";
	@HOST_PUBKEY=$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress');		\
	curl -X POST "http://proxy.holohost.net/zato/holo-proxy-service-delete"			\
		-H "Holo-Dev: $(DEV_API_KEY)"	-H "Content-Type: application/json"		\
		--data '{"name":"'$$HOST_PUBKEY'.holohost.net"}'
delete-route:
	@printf "\e[1;37m%s\e[0m\n" "Delete zato route for "$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress')".holohost.net";
	@HOST_PUBKEY_CS=$$(cat ./src/config/envoy-host-key.json | jq -r '.publicAddress');	\
	curl -X POST "http://proxy.holohost.net/zato/holo-proxy-route-delete"			\
		-H "Holo-Dev: $(DEV_API_KEY)"	-H "Content-Type: application/json"		\
		--data '{"name":"'$$HOST_PUBKEY_CS'.holohost.net"}'
