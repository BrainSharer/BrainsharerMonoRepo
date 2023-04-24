
export interface StateView {    
    id: number;
    lab_name: string;
    active: boolean;
    created: Date,
    group_name: string;
    layer_name: string;
    description: string;
    url: string;
    thumbnail_url: string;
    layer_type: string;
    resolution: number;
    zresolution: number;
    updated: Date;
    lab: number;
    }

    export  class GroupView {
        constructor(public group_name: string, public layer_type: string){}
    }

