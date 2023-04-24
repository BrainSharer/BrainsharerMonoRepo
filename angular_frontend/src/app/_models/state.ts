
export interface State {    
    id: number;
    owner: number;
    comments: string;
    user_date: string;
    neuroglancer_state: Record<string, any | null | undefined>;
    readonly: boolean;
    lab: string;
}
