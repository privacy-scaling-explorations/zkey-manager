# zkey-manager

This utility simplifies the process of `zkey` file management for circuits
written in `circom`.

**Warning:** for production setups, you should verify the integrity of the
`.ptau` files that this utility downloads.

If your circuits are larger than `2 ** 20` constraints, please modify your
config file to include the URL of a `.ptau` file that supports it. We provide
`.ptau` files (copied from the Hermez Network Prepare Phase 1 ceremony) up to 
`powersOfTau28_hez_final_20.ptau`.

There is no guarantee that Hermez will continue to provide all `.ptau` files up
`2 ** 28` constraints in this [Dropbox
folder](https://www.dropbox.com/sh/mn47gnepqu88mzl/AACaJkBU7mmCq8uU8ml0-0fma?dl=0).

## Requirements

You need the following, preferably on a Linux machine:

- NodeJS (preferably v11 or above)
- `gcc`, `g++`, `libgmp-dev`, `nlohmann-json3-dev`, and `libsodium-dev`:

```bash
sudo apt install build-essential libgmp-dev libsodium-dev nlohmann-json3-dev nasm
```

## Installation

```bash
npm i zkey-manager
```

## Configure circuits

See the `config.example.yml` file for an example.

## Compile circuits

```
zkey-manager compile -nc -c <CONFIG_FILE>
```

Set the `-nc` flag to avoid recompiling existing circuits.

## Download the Phase 1 `.ptau` file

This scans the `out` directory as configured in the config file for `.r1cs`
files, and downloads the `.ptau` file that is large enough to support `.zkey`
generation for each of the `.r1cs` files.

```
node build/index.js downloadPtau -nc -c <CONFIG_FILE>
```

## Generate the initial `.zkey` files

```
node build/index.js genZkeys -nc -c <CONFIG_FILE>
```
