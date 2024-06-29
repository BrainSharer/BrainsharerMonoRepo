
drop view if exists v_search_sessions;
create view v_search_sessions as
select as2.id, concat(as2.FK_prep_id, " ",  br.abbreviation, " ", au.username) as animal_abbreviation_username,
as2.annotation_type
from annotation_session as2
inner join brain_region br on as2.FK_brain_region_id=br.id
inner join auth_user au ON as2.FK_user_id = au.id
where as2.active = 1 and au.is_active = 1 and br.active = 1;

select * from v_search_sessions vss limit 10;


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

select abbreviation from brain_region
order by abbreviation ;

select distinct source
from marked_cells mc limit 100;
desc annotation_session;

select as2.id, as2.FK_prep_id , br.abbreviation , au.username , length(annotation)/1024 as l
from annotation_session as2
inner join auth_user au on as2.FK_user_id = au.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
where 1=1 
-- as2.id = 7398
and au.id not in (37, 1)
and as2.active = 1
and br.abbreviation  like 'TG%'
order by l desc
limit 10;

select *
from annotation_session as2
where as2.FK_prep_id = 'DK37';

select description  from annotation_label where id in (92,93)
union
select description from brain_region br where id in (52,54);





delete from annotation_session where id in (8088,8089,8091);
desc annotation_session_new;
select * from annotation_label 
-- where label like 'Fiducial';
;

-- new stuff to add to DB
drop table if exists annotation_session_new;
CREATE TABLE annotation_session_new LIKE annotation_session;
INSERT INTO annotation_session_new SELECT * FROM annotation_session;
alter table annotation_session_new drop column annotation_type;
alter table annotation_session_new add column FK_label_id int(11) after FK_prep_id; 
CREATE TABLE `annotation_label` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `oldid` int(11),
  `label_type` varchar(50) NOT NULL,
  `label` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

insert into annotation_label (oldid, label_type, label, description, created)
select id as oldid, 'cell' as label_type, cell_type as label, description, created 
from cell_type ct 
where ct.active= 1
order by cell_type;

insert into annotation_label (oldid, label_type, label, description, created)
select id as oldid, 'brain region' as label_type, abbreviation as label, description, created 
from brain_region br 
where br.active= 1
order by abbreviation;

UPDATE annotation_session_new as2 
INNER JOIN annotation_label al on as2.FK_brain_region_id = al.oldid
SET as2.FK_label_id = al.id
WHERE al.label_type = 'brain region';

-- alter table annotation_session_new drop column FK_brain_region_id;
select * 
from annotation_label where id = 8;
