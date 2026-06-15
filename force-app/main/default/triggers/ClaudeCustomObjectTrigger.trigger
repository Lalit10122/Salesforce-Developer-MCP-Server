trigger ClaudeCustomObjectTrigger on Claude_Custom_Object__c (after insert, after update, after delete) {
if (Trigger.isAfter) {
    if (Trigger.isInsert || Trigger.isUpdate) {
        ClaudeCustomObjectChildCountHandler.handleChildCountUpdate(Trigger.new, Trigger.oldMap);
    }
    if (Trigger.isDelete) {
        ClaudeCustomObjectChildCountHandler.handleAfterDelete(Trigger.old);
    }
}
}