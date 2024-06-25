
drop view if exists v_search_sessions;
create view v_search_sessions as
select as2.id, as2.annotation_type, as2.FK_prep_id as animal,  br.abbreviation, au.username as annotator
from annotation_session as2
inner join brain_region br on as2.FK_brain_region_id=br.id
inner join auth_user au ON as2.FK_user_id = au.id
where as2.active = 1 and au.is_active = 1 and br.active = 1;



-- fixes
update annotation_session set active = 0 where id in (
select min(as2.id) as badid 
from annotation_session as2
inner join brain_region br on as2.FK_brain_region_id=br.id
inner join auth_user au ON as2.FK_user_id = au.id
where as2.active = 1 and au.is_active = 1 and br.active = 1
group by as2.annotation_type, as2.FK_prep_id,  br.abbreviation, au.username
having count(*) > 1
order by as2.annotation_type, as2.FK_prep_id,  br.abbreviation, au.username);


