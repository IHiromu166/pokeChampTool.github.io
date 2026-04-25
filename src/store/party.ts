import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PARTY_SIZE,
  createEmptyParty,
  defaultPartyName,
  type Party,
  type PartyPokemon,
} from "@/domain/party";
import type { PokemonInstance } from "@/domain/types";

interface PartyStoreState {
  parties: Party[];
  selectedPartyId: string | null;
  createParty: (name?: string) => string;
  renameParty: (id: string, name: string) => void;
  deleteParty: (id: string) => void;
  selectParty: (id: string | null) => void;
  updateMemberPokemon: (partyId: string, slot: number, pokemon: PokemonInstance) => void;
  updateMemberMoves: (partyId: string, slot: number, moves: string[]) => void;
}

function patchParty(parties: Party[], id: string, patch: (p: Party) => Party): Party[] {
  return parties.map((p) => (p.id === id ? patch(p) : p));
}

function patchMember(
  party: Party,
  slot: number,
  patch: (m: PartyPokemon) => PartyPokemon,
): Party {
  if (slot < 0 || slot >= PARTY_SIZE) return party;
  return {
    ...party,
    members: party.members.map((m, i) => (i === slot ? patch(m) : m)),
    updatedAt: Date.now(),
  };
}

export const useParties = create<PartyStoreState>()(
  persist(
    (set, get) => ({
      parties: [],
      selectedPartyId: null,
      createParty: (name) => {
        const partyName = name && name.trim() ? name.trim() : defaultPartyName(get().parties.length);
        const party = createEmptyParty(partyName);
        set({ parties: [...get().parties, party], selectedPartyId: party.id });
        return party.id;
      },
      renameParty: (id, name) =>
        set({
          parties: patchParty(get().parties, id, (p) => ({
            ...p,
            name,
            updatedAt: Date.now(),
          })),
        }),
      deleteParty: (id) => {
        const parties = get().parties.filter((p) => p.id !== id);
        const selectedPartyId =
          get().selectedPartyId === id ? (parties[0]?.id ?? null) : get().selectedPartyId;
        set({ parties, selectedPartyId });
      },
      selectParty: (id) => set({ selectedPartyId: id }),
      updateMemberPokemon: (partyId, slot, pokemon) =>
        set({
          parties: patchParty(get().parties, partyId, (p) =>
            patchMember(p, slot, (m) => ({ ...m, pokemon })),
          ),
        }),
      updateMemberMoves: (partyId, slot, moves) =>
        set({
          parties: patchParty(get().parties, partyId, (p) =>
            patchMember(p, slot, (m) => ({ ...m, moves })),
          ),
        }),
    }),
    {
      name: "pokechamptool-parties",
    },
  ),
);
