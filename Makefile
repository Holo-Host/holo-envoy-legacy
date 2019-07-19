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

ENVOY_HOME	= $(shell jq -r '.defaultEnvoyHome' $(CONFIG))
CHAIN_STORE	= $(ENVOY_HOME)/$(shell jq -r '.chainStorageDir' $(CONFIG) )
UI_STORE	= $(ENVOY_HOME)/$(shell jq -r '.defaultEnvoyHome' $(CONFIG) )
HC_CONFIG	= $(ENVOY_HOME)/$(shell jq -r '.conductorConfigFile' $(CONFIG) )

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


NVM	= ~/.nvm
JQ	= /usr/bin/jq
NGINX	= /usr/sbin/nginx

$(NVM):
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
	nvm install 12
$(JQ):
	sudo apt-get install -y jq
$(NGINX):
	sudo apt-get install nginx

setup:	setup-nginx
	npm run keygen
	npm run deps
	npm run init

setup-nginx:
	sudo cp ./nginx/holo-host.conf /etc/nginx/sites-available/
	sudo ln -fs /etc/nginx/sites-available/holo-host.conf /etc/nginx/sites-enabled/
	sudo service nginx restart

start-conductor:
	npm run conductor 
start-envoy:
	npm run start
