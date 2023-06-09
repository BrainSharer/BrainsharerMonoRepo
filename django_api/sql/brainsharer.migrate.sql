use brainsharer;

-- new UCSD data for neuroglancer_state
INSERT INTO brainsharer.neuroglancer_state (comments, neuroglancer_state, created, updated, user_date, FK_user_id,readonly,active)
SELECT 
AAP.comments, AAP.url AS neuroglancer_state, AAP.created, AAP.created AS updated, AAP.user_date, 
AAP.person_id AS FK_user_id, AAP.readonly, 1 AS active
FROM  active_atlas_production.neuroglancer_urls AAP 
WHERE AAP.active = 1
EXCEPT
SELECT 
BS.comments, BS.neuroglancer_state, BS.created, BS.created AS updated, BS.user_date, 
BS.FK_user_id, BS.readonly, 1 AS active
FROM brainsharer.neuroglancer_state BS;

-- annotation session
INSERT INTO brainsharer.annotation_session (id, annotation_type, FK_user_id, FK_prep_id, FK_state_id,FK_brain_region_id, active, created, updated)
SELECT AAP.id, AAP.annotation_type, AAP.FK_annotator_id, AAP.FK_prep_id, AAP.FK_state_id,
AAP.FK_structure_id, AAP.active, AAP.created, AAP.updated
FROM active_atlas_production.annotation_session AS AAP
WHERE AAP.active = 1
AND AAP.id NOT IN (SELECT as2.id as id FROM brainsharer.annotation_session as2);

-- marked cell
INSERT INTO brainsharer.marked_cells 
SELECT AAP.*
FROM active_atlas_production.marked_cells AAP
INNER JOIN brainsharer.annotation_session AS as2 ON AAP.FK_session_id = as2.id
LEFT JOIN brainsharer.marked_cells BS on AAP.id = BS.id
WHERE BS.id IS NULL
AND as2.active = 1;

-- polygon
INSERT INTO brainsharer.polygon_sequences  
SELECT AAP.*
FROM active_atlas_production.polygon_sequences AS AAP
INNER JOIN brainsharer.annotation_session AS as2 ON AAP.FK_session_id = as2.id
LEFT JOIN brainsharer.polygon_sequences  BS on AAP.id = BS.id
WHERE BS.id IS NULL
AND as2.active = 1;

-- structure_com
INSERT INTO brainsharer.structure_com 
SELECT AAP.*
FROM active_atlas_production.structure_com  AS AAP
INNER JOIN brainsharer.annotation_session AS as2 ON AAP.FK_session_id = as2.id
LEFT JOIN brainsharer.structure_com  BS on AAP.id = BS.id
WHERE BS.id IS NULL
AND as2.active = 1;

-- elastix transformation
INSERT INTO brainsharer.elastix_transformation (id,FK_prep_id,section,rotation,xshift,yshift,metric,iteration,created,active)
SELECT id, prep_id AS FK_prep_id,section,rotation,xshift,yshift,metric,iteration,created,active
FROM active_atlas_production.elastix_transformation
WHERE id NOT IN (SELECT id FROM elastix_transformation)
and prep_id NOT IN ('DK37', 'DK77');


