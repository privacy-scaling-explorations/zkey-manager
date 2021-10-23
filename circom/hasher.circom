pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/poseidon.circom";

template Hasher(numInputs) {
    signal input in[numInputs];
    signal input pubInput; // does nothing in this example circuit
    signal output hash;

    component poseidon = Poseidon(numInputs);
    for (var i = 0; i < numInputs; i ++) {
        poseidon.inputs[i] <== in[i];
    }
    hash <== poseidon.out;
}
