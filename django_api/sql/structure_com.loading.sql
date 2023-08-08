-- data gets multiplied by scale on insert, and the gets divided by scales on retrieval
-- scales for ('DK55', 'DK73', 'DK78') = 32

select * from brain_region br2 
-- where abbreviation like 'T%'
order by abbreviation; 
-- SC from 302 solely 9202 1555 5692
-- allen SC origin 329, 77, 216
select br.abbreviation  
-- as2.FK_user_id, as2.FK_prep_id,br.abbreviation, sc.source , sc.x, sc.y, sc.z
-- sc.id, as2.updated, sc.source, as2.FK_user_id, as2.FK_prep_id,br.abbreviation , 
-- sc.x/25, sc.y/25, sc.z/25
from structure_com sc 
inner join annotation_session as2 on sc.FK_session_id = as2.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
where as2.FK_user_id = 1
and as2.FK_prep_id in ('Allen')
and as2.active = 1
order by br.abbreviation , sc.x, sc.y, sc.z;

select sc.x/25, sc.y/25, sc.z/25  
-- as2.FK_user_id, as2.FK_prep_id,br.abbreviation, sc.source , sc.x, sc.y, sc.z
-- sc.id, as2.updated, sc.source, as2.FK_user_id, as2.FK_prep_id,br.abbreviation , 
-- sc.x/25, sc.y/25, sc.z/25
from structure_com sc 
inner join annotation_session as2 on sc.FK_session_id = as2.id 
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
order by br.abbreviation , sc.x, sc.y, sc.z;



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
select count(*)
from polygon_sequences ps
inner join annotation_session as2 on ps.FK_session_id = as2.id 
inner join auth_user au on as2.FK_user_id = au.id
where as2.FK_user_id  = 1 
and as2.annotation_type = 'POLYGON_SEQUENCE'
-- and as2.FK_brain_region_id = 33 
-- and as2.FK_prep_id = 'MD585'
;

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
select concat(D.x/0.452/128, " ", D.y/0.452/128, " ", D.z/20) as r
from structure_com D 
inner join annotation_session as2 on D.FK_session_id = as2.id
inner join auth_user au on as2.FK_user_id = au.id
inner join brain_region br on as2.FK_brain_region_id = br.id
where 1=1
and as2.FK_prep_id in ('MD594')
and as2.annotation_type = 'STRUCTURE_COM'
-- and as2.FK_user_id in (2,38)
-- and br.id in (21,33)
and as2.active = 1
order by au.username, as2.FK_prep_id, br.abbreviation;

select 14.464*2*2;

select au.username, as2.FK_prep_id , br.abbreviation, D.x, D.y, D.z
from structure_com D 
inner join annotation_session as2 on D.FK_session_id = as2.id
inner join auth_user au on as2.FK_user_id = au.id
inner join brain_region br on as2.FK_brain_region_id = br.id
where 1=1
and as2.annotation_type = 'STRUCTURE_COM'
-- and as2.FK_user_id in (2,38)
-- and br.abbreviation like 'TG_%'
and as2.FK_prep_id in ('Atlas', 'MD589','MD585', 'MD594')
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
