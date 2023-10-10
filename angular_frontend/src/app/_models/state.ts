
export interface NeuroglancerState {    
    id: number;
    brain_name: string;
    owner: number;
    comments: string;
    user_date: string;
    neuroglancer_state: Record<string, any | null | undefined>;
    readonly: boolean;
    lab: string;
}
