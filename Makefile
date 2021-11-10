.PHONY: all
all: build

.PHONY: init
init: rustup-target-init ~/emsdk/emsdk_env.sh

.PHONY: build
build: emscripten-build copy

.PHONY: build-release
build-release: emscripten-build-release copy

.PHONY: copy
copy:
	cp /Users/justin/code/shaderjob/target/wasm32-unknown-emscripten/debug/shaderjob.js ./web/public/.
	cp /Users/justin/code/shaderjob/target/wasm32-unknown-emscripten/debug/shaderjob.wasm ./web/public/.

.PHONY: clean
clean:
	cargo clean

.PHONY: emscripten-build
emscripten-build:
	cargo build --target=wasm32-unknown-emscripten

.PHONY: emscripten-build-release
emscripten-build-release:
	cargo build --release --target=wasm32-unknown-emscripten

.PHONY: rustup-target-init
rustup-target-init:
	rustup toolchain add stable
	rustup target add asmjs-unknown-emscripten --toolchain stable
	rustup target add wasm32-unknown-emscripten --toolchain stable


emsdk-portable/emsdk_env.sh:
	curl -O https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz
	tar -xzf emsdk-portable.tar.gz
	rm emsdk-portable.tar.gz
	source emsdk-portable/emsdk_env.sh
	emsdk update
	emsdk install sdk-incoming-64bit
	emsdk activate sdk-incoming-64bit
