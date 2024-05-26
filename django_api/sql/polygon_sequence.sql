
show create table annotation_session ;

alter table annotation_session add column coordinates JSON after FK_brain_region_id;

ALTER TABLE annotation_session ADD CONSTRAINT CHECK(JSON_VALID(coordinates));

-- ---------------------------------- Finished annotation session alterations ---

select 
-- ct.*, as2.* 
as2.id, ct.*, as2.annotation_type , mc.x/0.325, mc.y/0.325, mc.z/20
from marked_cells mc 
inner join annotation_session as2 on mc.FK_session_id = as2.id 
inner join cell_type ct on mc.FK_cell_type_id = ct.id 
where 1=1 
and as2.active is True
and as2.annotation_type = 'MARKED_CELL'
and as2.FK_prep_id = 'DK37'
and ct.cell_type ='Fiducial'
order by mc.z, mc.id
;

desc cell_type; 

select * from annotation_session as2 where as2.FK_prep_id = 'CTB010';

select id, created, updated, comments
from neuroglancer_state ns
where id = 914
order by id desc limit 3;

select section, rotation , xshift , yshift 
from elastix_transformation et where FK_prep_id = 'DK37'
and iteration = 0
and section in (93, 94);
-- 093	0.00941176	39.3639	1.04921
-- 094	-0.0656527	-30.9066	-8.27369


delete from elastix_transformation where FK_prep_id = 'CTB010' and section > 86;