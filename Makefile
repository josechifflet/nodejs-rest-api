SHELL := /bin/bash

APP_NAME = nodejs-rest-api
APP_NAME := $(APP_NAME)
export BITBUCKET_CLONE_DIR:=.

.PHONY: help
.INTERMEDIATE: run-tests-integration

help:
	@grep -E '^[1-9a-zA-Z_-]+:.*?## .*$$|(^#--)' $(MAKEFILE_LIST) \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m %-43s\033[0m %s\n", $$1, $$2}' \
	| sed -e 's/\[32m #-- /[33m/'

up-dev:
	docker-compose up postgresdb -d

run-tests-integration:
	docker-compose up -d postgresdb-cicd
	./wait-for-it.sh localhost:5430

	yarn run jest:clear-cache && yarn run test:integration
	docker-compose stop postgresdb-cicd
	
make down:
	docker-compose down
	docker system prune -a --volumes

# Must be called as name=intial-setup make generate-migration
generate-migration:
	./wait-for-it.sh localhost:5430
	./src/util/migration-generate.mts $(name) 