export interface Task {
    id: string;
    title : string ;
    description : string ;
    isCompleted : boolean ;
    createdAt : string;
    updatedAt : string;
    deletedAt : string | null;
}

export type TaskSyncStatus = 
| 'pending'
| 'synced'
| 'failed';

export interface LocalTask extends Task {
    syncStatus : TaskSyncStatus;
}