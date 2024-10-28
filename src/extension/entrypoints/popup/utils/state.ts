import { Client } from '@@/src/lib';
import { createSignal } from 'solid-js';

const interceptionEnabledSignal = createSignal(false);
export const useInterceptionEnabled = () => interceptionEnabledSignal;

const spoofingEnabledSignal = createSignal(false);
export const useSpoofingEnabled = () => spoofingEnabledSignal;

const clientsSignal = createSignal<Client[]>([]);
export const useClients = () => clientsSignal;

const activeClientSignal = createSignal<Client | null>(null);
export const useActiveClient = () => activeClientSignal;
