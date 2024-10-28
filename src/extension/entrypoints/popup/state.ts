import { createSignal } from 'solid-js';

const enabledSignal = createSignal(false);

export const useEnabled = () => enabledSignal;
