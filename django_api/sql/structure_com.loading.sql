-- data gets multiplied by scale on insert, and the gets divided by scales on retrieval
-- scales for ('DK55', 'DK73', 'DK78') = 32

select * from brain_region br2 
-- where abbreviation like 'T%'
order by abbreviation; 
-- SC from 302 solely 9202 1555 5692
-- allen SC origin 329, 77, 216

select as2.updated, as2.FK_user_id, as2.FK_prep_id,br.abbreviation, sc.source , 
-- sc.x, sc.y, sc.z, 
sc.x/25, sc.y/25, sc.z/25
from structure_com sc 
inner join annotation_session as2 on sc.FK_session_id = as2.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
where 1=1 
-- as2.FK_user_id = 1
and as2.FK_prep_id in ('Atlas', 'Allen')
and as2.active = 1
and as2.FK_brain_region_id in (33)
order by br.abbreviation, as2.FK_prep_id, sc.x, sc.y, sc.z;

SELECT structure_com.id AS structure_com_id, structure_com.x AS structure_com_x, structure_com.y 
AS structure_com_y, structure_com.z AS structure_com_z, structure_com.source AS structure_com_source, structure_com.`FK_session_id` AS `structure_com_FK_session_id` 
FROM structure_com 
WHERE structure_com.`FK_session_id` = 251  
-- ORDER BY annotation_session.id = structure_com.`FK_session_id`
;

select as2.FK_user_id, as2.FK_prep_id,  count(*)
from polygon_sequences sc 
inner join annotation_session as2 on sc.FK_session_id = as2.id
where as2.active = 1
and as2.FK_prep_id like 'MD%'
group by as2.FK_user_id, as2.FK_prep_id 
order by as2.FK_user_id, as2.FK_prep_id;


-- for points related to Allen
select concat(D.x/25, " ", D.y/25, " ", D.z/25) as r
from structure_com D
inner join annotation_session as2 on D.FK_session_id = as2.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
where as2.FK_user_id = 1
and as2.FK_prep_id in ('Atlas')
and as2.active = 1
and br.abbreviation IN (
select br.abbreviation  
from structure_com sc 
inner join annotation_session as2 on sc.FK_session_id = as2.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
where as2.FK_user_id = 1
and as2.FK_prep_id in ('Allen')
and as2.active = 1
)
order by br.abbreviation;

-- for MDXXX points
select concat(D.x/25, " ", D.y/25, " ", D.z/25) as r
from structure_com D
inner join annotation_session as2 on D.FK_session_id = as2.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
where as2.FK_user_id = 1
and as2.FK_prep_id in ('Atlas')
and as2.active = 1
order by br.abbreviation;



update structure_com set source='COMPUTER'
where FK_session_id in (
select as2.id
from structure_com sc 
inner join annotation_session as2 on sc.FK_session_id = as2.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
where as2.FK_prep_id = 'Atlas'
and as2.active = 1
and as2.FK_user_id = 1
and br.abbreviation in ('SC', '3N_L', '3N_R', '4N_L', '4N_R', 'IC', 'PBG_L', 'PBG_R', 'SNR_L',  'SNR_R')
);





delete from polygon_sequences where FK_session_id  in (
select distinct as2.id
from polygon_sequences ps
inner join annotation_session as2 on ps.FK_session_id = as2.id 
inner join auth_user au on as2.FK_user_id = au.id
where as2.FK_user_id  = 1 
and as2.annotation_type = 'POLYGON_SEQUENCE'
-- and as2.FK_brain_region_id = 33 
-- and as2.FK_prep_id = 'MD585'
);
select as2.FK_user_id , as2.FK_prep_id, br.abbreviation,  count(*) as c
from polygon_sequences ps
inner join annotation_session as2 on ps.FK_session_id = as2.id 
inner join auth_user au on as2.FK_user_id = au.id
inner join brain_region br on as2.FK_brain_region_id = br.id
where 1=1
and as2.annotation_type = 'POLYGON_SEQUENCE'
-- and as2.FK_brain_region_id = 33 
and as2.FK_prep_id in ('DK73', 'DK78', 'DK79')
group by as2.FK_user_id , as2.FK_prep_id, br.abbreviation  
order by as2.FK_prep_id , as2.FK_user_id, br.abbreviation;

select br.abbreviation 
-- , D1.x as AtlasX, D1.y as AtlasY, D1.z as AtlasZ
, D2.x/25 AS AllenX, D2.y/25 AS AllenY, D2.z/25 as AllenZ
, ABS(D1.x - D2.x) as xdiff
, ABS(D1.y - D2.y) as ydiff
, ABS(D1.z - D2.z) as zdiff
from (structure_com D1, structure_com D2) 
inner join annotation_session as1 on D1.FK_session_id = as1.id  
inner join annotation_session as2 on D2.FK_session_id = as2.id  
inner join brain_region br on (as1.FK_brain_region_id = br.id and as2.FK_brain_region_id = br.id)
where (as1.active = 1 and as2.active = 1)
and (as1.annotation_type = 'STRUCTURE_COM' and as2.annotation_type = 'STRUCTURE_COM')
and as1.FK_prep_id = 'Atlas'
and as2.FK_prep_id = 'Allen'
and br.abbreviation in ('3N_L',
 '3N_R',
 '4N_L',
 '4N_R',
 'IC',
 'PBG_L',
 'PBG_R',
 'SC',
 'SNC_L',
 'SNC_R',
 'SNR_L',
 'SNR_R')
-- group by as2.FK_user_id , as2.FK_prep_id 
order by br.abbreviation;

select * from brain_region br
where abbreviation like 'S%'
order by abbreviation; 


delete from structure_com where FK_session_id  in (
select distinct as2.id
from structure_com  ps
inner join annotation_session as2 on ps.FK_session_id = as2.id 
inner join auth_user au on as2.FK_user_id = au.id
where as2.FK_user_id  = 1 
and as2.annotation_type = 'STRUCTURE_COM');
delete from annotation_session where FK_user_id = 1 and annotation_type = 'STRUCTURE_COM';

select * 
from annotation_session as2 where FK_user_id = 1 and annotation_type = 'POLYGON_SEQUENCE';


select as2.FK_user_id, avg(ps.x), avg(ps.y), avg(ps.z)
from polygon_sequences ps 
inner join annotation_session as2 on ps.FK_session_id = as2.id
where 1=1
-- as2.FK_user_id in (1,3, 38)
-- and as2.FK_prep_id = 'DK41'
-- and as2.FK_brain_region_id = 2
and ps.z = (167*20)
group by as2.FK_user_id  
order by as2.FK_user_id  
;
-- Allen SC = 9202.25 1555.5 5692.0
select -- br.abbreviation,
concat(D.x/25, " ", D.y/25, " ", D.z/25) as r
from structure_com D 
inner join annotation_session as2 on D.FK_session_id = as2.id
inner join auth_user au on as2.FK_user_id = au.id
inner join brain_region br on as2.FK_brain_region_id = br.id
where 1=1
and as2.FK_prep_id = 'MD589'
and as2.annotation_type = 'STRUCTURE_COM'
-- and as2.FK_user_id in (2,38)
-- and br.id in (21,33)
and br.abbreviation in ('SNC_L', 'SNC_R', 'SC', '3N_L', '3N_R', '4N_L', '4N_R', 'IC', 'PBG_L', 'PBG_R', 'SNR_L', 'SNR_R')
and as2.active = 1
and as2.FK_user_id  = 2
order by br.abbreviation;

select 14.464*2*2;

select as2.updated, au.username, as2.FK_prep_id , br.abbreviation, D.x, D.y, D.z
from structure_com D 
inner join annotation_session as2 on D.FK_session_id = as2.id
inner join auth_user au on as2.FK_user_id = au.id
inner join brain_region br on as2.FK_brain_region_id = br.id
where 1=1
and as2.annotation_type = 'STRUCTURE_COM'
-- and as2.FK_user_id in (2,38)
-- and br.abbreviation like 'TG_%'
and as2.FK_prep_id in ('Atlas', 'Allen')
and as2.active = 1
and br.id in (33)
-- group by au.username, as2.FK_prep_id , br.abbreviation
order by br.abbreviation, D.z


select 62*25;

select *
from scan_run sr where FK_prep_id = 'Allen';



select * from brain_region br 
where abbreviation like 'Tz%'
order by br.abbreviation; 

use brainsharer;
select count(*) from elastix_transformation et where et.FK_prep_id = 'DK79';