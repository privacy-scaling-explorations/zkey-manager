# zkey-manager

This utility simplifies the process of `zkey` file management for circuits
written in `circom`.

**Warning:** for production setups, you should specify checksums to verify the integrity of the
`.ptau` files that this utility downloads (see `downloadPtau`) or run linux checksum commands manually.

If your circuits are larger than `2 ** 28` constraints, please run native [`snarkjs`](https://github.com/iden3/snarkjs) commands instead. `zkey-manager` only supports generating zk proofs at most `2 ** 28` constraints (through using `*.ptau` files copied from the Hermez Network Phase 1 ceremony).

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

## Compile circuits: `compile`

```
$ node zkey-manager compile -nc -c <CONFIG_FILE>
```

Set the `-nc` flag to avoid recompiling existing circuits.

## Download the Powers of Tau file: `downloadPtau`

This scans the `out` directory as configured in the config file for `.r1cs`
files, and downloads the `.ptau` file that is large enough to support `.zkey`
generation for each of the `.r1cs` files.

```
$ node zkey-manager downloadPtau -nc -c <CONFIG_FILE>
```

## Generate the final `.zkey` files: `genZkeys`

```
$ node zkey-manager genZkeys -nc -c <CONFIG_FILE> -ps <PROOF_SYSTEM>
```

## Generate and verify zk proof files: `genProofs`
```
$ node zkey-manager genProofs -c <CONFIG_FILE> -ps <PROOF_SYSTEM>
```

## Clean working cache
```
$ node zkey-manager clean -c <CONFIG_FILE>
```
