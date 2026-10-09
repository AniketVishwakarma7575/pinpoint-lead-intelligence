import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { IcpProfile, SavedList } from "@/types"
import { seededLists } from "@/data/leads"
import { defaultIcpProfile } from "@/types/settings"

type AppState = {
  icp: IcpProfile
  profile: { fullName: string; email: string }
  savedLeadIds: string[]
  contactedLeadIds: string[]
  dismissedReviewIds: string[]
  savedLists: SavedList[]
  updateIcp: (icp: IcpProfile) => void
  updateProfile: (profile: { fullName: string; email: string }) => void
  toggleSavedLead: (leadId: string) => void
  saveLeads: (leadIds: string[]) => void
  markContacted: (leadId: string) => void
  markContactedMany: (leadIds: string[]) => void
  dismissReview: (reviewId: string) => void
  replaceMergedLead: (removedId: string, keptId: string) => void
  addList: (list: SavedList) => void
  renameList: (id: string, name: string) => void
  updateListDetails: (id: string, name: string, description: string) => void
  deleteList: (id: string) => void
  toggleLeadInList: (listId: string, leadId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      icp: defaultIcpProfile,
      profile: { fullName: "Alex Johnson", email: "alex@acmestudio.com" },
      savedLeadIds: [],
      contactedLeadIds: [],
      dismissedReviewIds: [],
      savedLists: seededLists,
      updateIcp: (icp) => set({ icp }),
      updateProfile: (profile) => set({ profile }),
      toggleSavedLead: (leadId) =>
        set((state) => ({
          savedLeadIds: state.savedLeadIds.includes(leadId)
            ? state.savedLeadIds.filter((id) => id !== leadId)
            : [...state.savedLeadIds, leadId],
        })),
      saveLeads: (leadIds) =>
        set((state) => ({ savedLeadIds: [...new Set([...state.savedLeadIds, ...leadIds])] })),
      markContacted: (leadId) =>
        set((state) => ({
          contactedLeadIds: state.contactedLeadIds.includes(leadId)
            ? state.contactedLeadIds
            : [...state.contactedLeadIds, leadId],
        })),
      markContactedMany: (leadIds) =>
        set((state) => ({
          contactedLeadIds: [...new Set([...state.contactedLeadIds, ...leadIds])],
        })),
      dismissReview: (reviewId) =>
        set((state) => ({
          dismissedReviewIds: state.dismissedReviewIds.includes(reviewId)
            ? state.dismissedReviewIds
            : [...state.dismissedReviewIds, reviewId],
        })),
      replaceMergedLead: (removedId, keptId) =>
        set((state) => ({
          savedLeadIds: state.savedLeadIds
            .filter((id) => id !== removedId)
            .concat(
              state.savedLeadIds.includes(removedId) && !state.savedLeadIds.includes(keptId)
                ? [keptId]
                : [],
            ),
          savedLists: state.savedLists.map((list) => ({
            ...list,
            leadIds: list.leadIds
              .filter((id) => id !== removedId)
              .concat(
                list.leadIds.includes(removedId) && !list.leadIds.includes(keptId) ? [keptId] : [],
              ),
          })),
        })),
      addList: (list) => set((state) => ({ savedLists: [list, ...state.savedLists] })),
      renameList: (id, name) =>
        set((state) => ({
          savedLists: state.savedLists.map((list) => (list.id === id ? { ...list, name } : list)),
        })),
      updateListDetails: (id, name, description) =>
        set((state) => ({
          savedLists: state.savedLists.map((list) =>
            list.id === id ? { ...list, name, description } : list,
          ),
        })),
      deleteList: (id) =>
        set((state) => ({ savedLists: state.savedLists.filter((list) => list.id !== id) })),
      toggleLeadInList: (listId, leadId) =>
        set((state) => ({
          savedLists: state.savedLists.map((list) =>
            list.id !== listId
              ? list
              : {
                  ...list,
                  leadIds: list.leadIds.includes(leadId)
                    ? list.leadIds.filter((id) => id !== leadId)
                    : [...list.leadIds, leadId],
                },
          ),
        })),
    }),
    {
      name: "pinpoint-app-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        icp: state.icp,
        profile: state.profile,
        savedLeadIds: state.savedLeadIds,
        contactedLeadIds: state.contactedLeadIds,
        dismissedReviewIds: state.dismissedReviewIds,
        savedLists: state.savedLists,
      }),
    },
  ),
)
