.PHONY: clean distclean format test update-node

css-files:=$(wildcard src/*.css)
html-files:=$(wildcard src/*.html)
js-files:=$(wildcard src/*.js)
asset-files:=$(wildcard assets/*)
all-files:=$(css-files) $(html-files) $(js-files) $(asset-files) manifest.json
version:=$(shell ./manifest-version.py)

# building

build: dist/stash-snapshot.zip

dist/stash-snapshot.zip: $(all-files) node_modules/.updated
	yarn --silent run web-ext build --filename stash-snapshot.zip --overwrite-dest --ignore-files build --artifacts-dir dist

release: format dist/stash-$(version).zip

dist/stash-$(version).zip: $(all-files) node_modules/.updated
	$(info Building stash-$(version).zip)
	yarn --silent run web-ext build --filename stash-$(version).zip --ignore-files build --artifacts-dir dist

clean:
	rm -f .git/css-format .git/html-format .git/js-format dist/stash-snapshot.zip dist/stash-$(version).zip

distclean: clean
	rm -rf venv node_modules

# formatting

format: .git/css-format .git/html-format .git/js-format

.git/css-format: node_modules/.updated $(css-files)
	@if [ -n "$(css-files)" ]; then \
		echo yarn --silent run stylelint --fix $(css-files); \
		yarn --silent run stylelint --fix $(css-files); \
	fi
	@touch $@

.git/html-format: node_modules/.updated $(html-files)
	@if [ -n "$(html-files)" ]; then \
		echo yarn --silent run prettier --write $(html-files); \
		yarn --silent run prettier --write $(html-files); \
	fi
	@touch $@

.git/js-format: node_modules/.updated $(js-files)
	@if [ -n "$(js-files)" ]; then \
		echo yarn --silent run prettier --write $(js-files); \
		yarn --silent run prettier --write $(js-files); \
	fi
	@touch $@

# testing

test: test-css test-html test-js test-web-ext

test-css: node_modules/.updated
	yarn --silent run stylelint $(css-files)

test-html: node_modules/.updated
	yarn --silent run prettier --check $(html-files)

test-js: node_modules/.updated
	yarn --silent run eslint $(js-files)
	yarn --silent run prettier --check $(js-files)

test-web-ext: node_modules/.updated
	yarn --silent run web-ext lint --warnings-as-errors

# build infra

upgrade-node: node_modules/.updated
	yarn upgrade --ignore-optional

node_modules/.updated: package.json
	yarn install --ignore-optional
	@touch $@
