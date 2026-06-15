public with sharing class ClaudeCustomObjectChildCountHandler {

    public static void handleChildCountUpdate(
        List<Claude_Custom_Object__c> newList,
        Map<Id, Claude_Custom_Object__c> oldMap
    ) {
        Set<Id> parentIdsToRecalculate = new Set<Id>();

        if (newList != null) {
            for (Claude_Custom_Object__c rec : newList) {
                Claude_Custom_Object__c oldRec = (oldMap != null) ? oldMap.get(rec.Id) : null;

                // New record with parent
                if (rec.Parent__c != null && (oldRec == null)) {
                    parentIdsToRecalculate.add(rec.Parent__c);
                }

                // Update / reparenting: parent changed
                if (oldRec != null && rec.Parent__c != oldRec.Parent__c) {
                    if (rec.Parent__c != null) {
                        parentIdsToRecalculate.add(rec.Parent__c);
                    }
                    if (oldRec.Parent__c != null) {
                        parentIdsToRecalculate.add(oldRec.Parent__c);
                    }
                }
            }
        }

        // Deletion: recalc old parent
        if (oldMap != null && newList == null) {
            for (Claude_Custom_Object__c oldRec : oldMap.values()) {
                if (oldRec.Parent__c != null) {
                    parentIdsToRecalculate.add(oldRec.Parent__c);
                }
            }
        }

        if (!parentIdsToRecalculate.isEmpty()) {
            recalculateChildCounts(parentIdsToRecalculate);
        }
    }

    public static void handleAfterDelete(List<Claude_Custom_Object__c> oldList) {
        Set<Id> parentIds = new Set<Id>();
        for (Claude_Custom_Object__c rec : oldList) {
            if (rec.Parent__c != null) {
                parentIds.add(rec.Parent__c);
            }
        }
        if (!parentIds.isEmpty()) {
            recalculateChildCounts(parentIds);
        }
    }

    private static void recalculateChildCounts(Set<Id> parentIds) {
        List<AggregateResult> results = [
            SELECT Parent__c, COUNT(Id) cnt
            FROM Claude_Custom_Object__c
            WHERE Parent__c IN :parentIds
            GROUP BY Parent__c
        ];

        Map<Id, Integer> countMap = new Map<Id, Integer>();
        for (Id pid : parentIds) {
            countMap.put(pid, 0);
        }
        for (AggregateResult ar : results) {
            countMap.put((Id) ar.get('Parent__c'), (Integer) ar.get('cnt'));
        }

        List<Claude_Custom_Object__c> parentsToUpdate = new List<Claude_Custom_Object__c>();
        for (Id pid : countMap.keySet()) {
            parentsToUpdate.add(new Claude_Custom_Object__c(
                Id = pid,
                Child_Count__c = countMap.get(pid)
            ));
        }

        if (!parentsToUpdate.isEmpty()) {
            update parentsToUpdate;
        }
    }
}