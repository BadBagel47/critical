// Things the ship can dock with: wrecks, stations and cargo pods.
import { WRECK_GEOM, STATION_GEOM, POD_GEOM } from './balance.js';
import { toWorld } from './util.js';

export const dockTargets = (state) => [...state.wrecks, ...state.stations, ...state.pods];
export const findDock = (state, id) => (id == null ? null : dockTargets(state).find((t) => t.id === id) || null);
export const portsOf = (t) => (t.kind === 'station' ? STATION_GEOM.ports.map((p) => toWorld(t, p)) : t.kind === 'pod' ? POD_GEOM.ports.map((p) => toWorld(t, p)) : [toWorld(t, WRECK_GEOM.port)]);
