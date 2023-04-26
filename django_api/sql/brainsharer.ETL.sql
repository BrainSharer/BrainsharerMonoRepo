-- Steps:
-- DROP database brainsharer;
-- CREATE database brainsharer;
-- mysql brainsharer < brainsharer.v1.1.sql
-- run this sql file
--  the Django admin tables so you can run this sql as often as you like
-- you need access to the active_atlas_production database
-- as well as the AWS version of the brainsharer database which I
-- have renamed to brainsharer_aws


-- insert the Django admin and user stuff first
INSERT INTO brainsharer.django_content_type SELECT * FROM active_atlas_production.django_content_type;
INSERT INTO brainsharer.auth_lab SELECT * FROM brainsharer_aws.auth_lab;

-- UCSD users
INSERT INTO brainsharer.auth_user 
(id, password , last_login , is_superuser , username , first_name , last_name , 
email , is_staff , is_active, date_joined, FK_lab_id)
SELECT id, password , last_login , is_superuser , username , first_name , last_name , 
email , is_staff , is_active, date_joined, 2 as FK_lab_id
FROM active_atlas_production.auth_user au;

-- princeton users
INSERT INTO brainsharer.auth_user 
(password , last_login , is_superuser , username , first_name , last_name , 
email , is_staff , is_active, date_joined, FK_lab_id)
SELECT password , last_login , is_superuser , username , first_name , last_name , 
email , is_staff , is_active, date_joined, 1 as FK_lab_id 
FROM brainsharer_aws.auth_user au2
where au2.username NOT IN (select au3.username from active_atlas_production.auth_user au3);


INSERT INTO brainsharer.auth_group SELECT * FROM active_atlas_production.auth_group;
INSERT INTO brainsharer.auth_permission SELECT * FROM active_atlas_production.auth_permission;
INSERT INTO brainsharer.auth_group_permissions SELECT * FROM active_atlas_production.auth_group_permissions;

INSERT INTO brainsharer.auth_user_groups SELECT * FROM active_atlas_production.auth_user_groups;
INSERT INTO brainsharer.auth_user_labs SELECT * FROM brainsharer_aws.auth_user_labs;
INSERT INTO brainsharer.auth_user_user_permissions SELECT * FROM active_atlas_production.auth_user_user_permissions;

INSERT INTO brainsharer.django_admin_log SELECT * FROM active_atlas_production.django_admin_log;
-- INSERT INTO brainsharer.django_migrations SELECT * FROM active_atlas_production.django_;
INSERT INTO brainsharer.django_plotly_dash_dashapp SELECT * FROM active_atlas_production.django_plotly_dash_dashapp;
INSERT INTO brainsharer.django_plotly_dash_statelessapp SELECT * FROM active_atlas_production.django_plotly_dash_statelessapp;
INSERT INTO brainsharer.django_session SELECT * FROM active_atlas_production.django_session;
INSERT INTO brainsharer.django_site SELECT * FROM active_atlas_production.django_site;

INSERT INTO brainsharer.account_emailaddress SELECT * FROM brainsharer_aws.account_emailaddress;
INSERT INTO brainsharer.account_emailconfirmation SELECT * FROM brainsharer_aws.account_emailconfirmation;
INSERT INTO brainsharer.socialaccount_socialaccount SELECT * FROM brainsharer_aws.socialaccount_socialaccount;
INSERT INTO brainsharer.socialaccount_socialapp SELECT * FROM brainsharer_aws.socialaccount_socialapp;
INSERT INTO brainsharer.socialaccount_socialapp_sites SELECT * FROM brainsharer_aws.socialaccount_socialapp_sites;
INSERT INTO brainsharer.socialaccount_socialtoken SELECT * FROM brainsharer_aws.socialaccount_socialtoken;


-- NOw do the data that has been created by us.
-- truncate/delete tables so you can run this sql as often as you like
-- you need access to the active_atlas_production database
-- as well as the AWS version of the brainsharer database which I
-- have renamed to brainsharer_aws

TRUNCATE brainsharer.available_neuroglancer_data;
TRUNCATE brainsharer.marked_cells;
DELETE FROM brain_region;
DELETE FROM brainsharer.brain_atlas;
INSERT INTO brainsharer.brain_atlas (id, active, created, atlas_name, description, FK_lab_id, resolution, zresolution, url)
values (1, 1, NOW(), 'DKLAB Atlas', 'The 10um isotropic atlas from the Kleinfeld lab', 1, 10, 10, 'NA');

DELETE FROM annotation_session;
DELETE FROM available_neuroglancer_data;
DELETE FROM cell_type;
DELETE FROM injection;
DELETE FROM injection_virus;
DELETE FROM marked_cells;
DELETE FROM mouselight_neuron;
DELETE FROM neuroglancer_state;
DELETE FROM polygon_sequences;
DELETE FROM scan_run;
DELETE FROM structure_com;
DELETE FROM viral_tracing_layer;
DELETE FROM virus;
DELETE FROM animal;

-- inserting data for table `animal`

INSERT INTO brainsharer.animal (prep_id, FK_lab_id, date_of_birth, species, strain, sex, genotype, vender, stock_number, 
tissue_source, ship_date, shipper, tracking_number, alias, comments, active, created)
SELECT prep_id, 
(CASE WHEN A.performance_center IS NULL THEN 2 ELSE AL.id END) as FK_lab_id, 
date_of_birth, species, strain, sex, genotype, vender, stock_number, 
tissue_source, ship_date, shipper, tracking_number, aliases_1, comments, A.active, A.created
FROM active_atlas_production.animal AS A
LEFT join brainsharer_aws.auth_lab AS AL on A.performance_center = AL.lab_name 
ORDER BY prep_id, A.created;


INSERT INTO brainsharer.available_neuroglancer_data SELECT * FROM brainsharer_aws.available_neuroglancer_data;


INSERT INTO brainsharer.brain_atlas SELECT * FROM brainsharer_aws.brain_atlas;
-- brain region needs a full select
INSERT INTO brainsharer.brain_region (id,active,created,abbreviation,description,FK_ref_atlas_id)
select id, active , created , abbreviation , description, 1 as FK_ref_atlas_id 
FROM active_atlas_production.structure; 


INSERT INTO brainsharer.histology 
(id,
FK_prep_id,
FK_virus_id,
FK_lab_id,
anesthesia,
perfusion_age_in_days,
perfusion_date,
exsangination_method,
fixative_method,
special_perfusion_notes,
post_fixation_period,
whole_brain,
block,
date_sectioned,
side_sectioned_first,
sectioning_method,
section_thickness,
orientation,
oblique_notes,
mounting,
counterstain,
comments,
created,
active,
scene_order)
SELECT h.id,
h.prep_id AS FK_prep_id,
h.virus_id AS FK_virus_id,

(CASE WHEN h.performance_center IS NULL THEN 2 ELSE AL.id END) as FK_lab_id, 

anesthesia,
perfusion_age_in_days,
perfusion_date,
exsangination_method,
fixative_method,
special_perfusion_notes,
post_fixation_period,
whole_brain,
block,
date_sectioned,
side_sectioned_first,
sectioning_method,
section_thickness,
orientation,
oblique_notes,
mounting,
counterstain,
h.comments,
h.created,
h.active,
scene_order
FROM active_atlas_production.histology h
LEFT join brainsharer_aws.auth_lab AS AL on h.performance_center = AL.lab_name;



INSERT INTO brainsharer.cell_type SELECT * FROM active_atlas_production.cell_type;
-- injection needs full insert
INSERT INTO brainsharer.injection (id,active,created,
anesthesia, method, pipet, location, angle,
brain_location_dv, brain_location_ml, brain_location_ap, injection_date, transport_days,
virus_count, comments, injection_volume, FK_prep_id, FK_lab_id)
SELECT inj.id, inj.active , inj.created ,  
anesthesia, method, pipet, location, angle,
brain_location_dv, brain_location_ml, brain_location_ap, injection_date, transport_days,
virus_count, inj.comments, injection_volume, a.prep_id as FK_prep_id, 3 as FK_lab_id
FROM active_atlas_production.injection inj
INNER JOIN active_atlas_production.animal a on inj.prep_id = a.prep_id;


INSERT INTO brainsharer.mouselight_neuron SELECT * FROM brainsharer_aws.mouselight_neuron;
DELETE FROM brainsharer_aws.neuroglancer_state WHERE id IN (1,26,34,37,38,56,57);

-- UCSD data
INSERT INTO brainsharer.neuroglancer_state 
(id, neuroglancer_state,
created,updated,user_date,comments,FK_user_id,readonly,active)
SELECT id,url AS neuroglancer_state, 
created, updated, user_date, comments, person_id AS FK_user_id,readonly,active
FROM active_atlas_production.neuroglancer_urls 
WHERE active=1;
-- princeton data
INSERT INTO brainsharer.neuroglancer_state 
(neuroglancer_state, created, updated, user_date,
comments, FK_user_id,readonly,active)
select 
ns.neuroglancer_state, ns.created, ns.updated, ns.user_date, 
ns.comments, 
(select id from brainsharer.auth_user au2 where au2.username = 'sj0470') as FK_user_id,
ns.readonly , ns.active 
from brainsharer_aws.neuroglancer_state ns
inner join brainsharer.auth_user au on ns.FK_owner_id = au.id 
order by ns.id;


INSERT INTO brainsharer.scan_run SELECT * FROM active_atlas_production.scan_run;

INSERT INTO brainsharer.viral_tracing_layer SELECT * FROM brainsharer_aws.viral_tracing_layer;

INSERT INTO brainsharer.virus (
id,virus_name,virus_type,virus_active,type_details,
titer,lot_number,label,excitation_1p_wavelength,excitation_1p_range,
excitation_2p_wavelength,excitation_2p_range,lp_dichroic_cut,emission_wavelength,emission_range,
virus_source,source_details,comments,created,active)
SELECT  id,virus_name,virus_type,virus_active,type_details,
titer,lot_number,label,excitation_1p_wavelength,excitation_1p_range,
excitation_2p_wavelength,excitation_2p_range,lp_dichroic_cut,emission_wavelength,emission_range,
virus_source,source_details,comments,created,active
FROM active_atlas_production.virus;

INSERT INTO brainsharer.injection_virus (id, active, created, FK_injection_id, FK_virus_id)
SELECT id, active, created, injection_id, virus_id
from active_atlas_production.injection_virus;


-- Inserting data for table `annotation_session`

INSERT INTO brainsharer.annotation_session (id, annotation_type, FK_user_id, FK_prep_id, FK_state_id,
FK_brain_region_id, active, created, updated)
SELECT id, annotation_type, FK_annotator_id, FK_prep_id, FK_state_id,
FK_structure_id, active, created, updated
FROM active_atlas_development.annotation_session
WHERE FK_annotator_id IN (2,3,41,23,16,38,40)
ORDER BY id;

INSERT INTO brainsharer.marked_cells 
SELECT * FROM active_atlas_production.marked_cells 
WHERE FK_session_id IN (SELECT id FROM brainsharer.annotation_session);

INSERT INTO brainsharer.polygon_sequences 
SELECT * FROM active_atlas_production.polygon_sequences
WHERE FK_session_id IN (SELECT id FROM brainsharer.annotation_session);

INSERT INTO brainsharer.structure_com 
SELECT * FROM active_atlas_production.structure_com
WHERE FK_session_id IN (SELECT id FROM brainsharer.annotation_session);

INSERT INTO brainsharer.slide 
SELECT * FROM active_atlas_production.slide;

INSERT INTO brainsharer.slide_czi_to_tif
SELECT * FROM active_atlas_production.slide_czi_to_tif;

TRUNCATE brainsharer.django_migrations;
INSERT INTO brainsharer.django_migrations (app, name, applied)
SELECT app, name, NOW() AS applied
FROM active_atlas_production.django_migrations
UNION
SELECT app, name, NOW() AS applied 
FROM brainsharer_aws.django_migrations;


-- Fixes
ALTER TABLE brainsharer.brain_region MODIFY COLUMN abbreviation varchar(200) NOT NULL COLLATE utf8mb4_bin;
update django_site set domain='brainsharer.org', name='brainsharer.org' where id = 2;
-- run this command
-- python manage.py remove_stale_contenttypes --include-stale-apps
update neuroglancer_state set active = 0;
update neuroglancer_state set active = 1 where id in (21,809,810,811,812,813,814,815,816, 817);

update auth_user set is_staff = 1, is_superuser = 1 where email = 'ybadiev@gmail.com';
